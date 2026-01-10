'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { EntityDocument } from '@/lib/supabase/types';

interface DealPOUploaderProps {
  dealId: string;
  onUploadComplete?: () => void;
}

export function DealPOUploader({ dealId, onUploadComplete }: DealPOUploaderProps) {
  const [poDocument, setPODocument] = useState<EntityDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPODocument();
  }, [dealId]);

  async function loadPODocument() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/entity-documents?entityType=DEAL&entityId=${dealId}`
      );
      const data = await res.json();

      if (res.ok && data.data) {
        // Filter PO documents and get the most recent one
        const poDocuments = data.data.filter(
          (doc: EntityDocument) => doc.doc_kind === 'PO'
        );
        if (poDocuments.length > 0) {
          // Sort by created_at desc and take the first one
          poDocuments.sort(
            (a: EntityDocument, b: EntityDocument) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setPODocument(poDocuments[0]);
        } else {
          setPODocument(null);
        }
      }
    } catch (err) {
      console.error('Error loading PO document:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez PDF, DOC ou DOCX.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'DEAL');
      formData.append('entityId', dealId);
      formData.append('docKind', 'PO');

      const res = await fetch('/api/entity-documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'upload');
        return;
      }

      // Reload to get the new document
      await loadPODocument();
      // Notify parent
      onUploadComplete?.();
    } catch (err) {
      console.error('Error uploading PO:', err);
      setError('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleView() {
    if (!poDocument) return;

    try {
      const res = await fetch(`/api/entity-documents/${poDocument.id}`);
      const data = await res.json();

      if (res.ok && data.url) {
        window.open(data.url, '_blank');
      } else {
        setError(data.error || 'Erreur lors de l\'ouverture');
      }
    } catch (err) {
      console.error('Error getting download URL:', err);
      setError('Erreur lors de l\'ouverture');
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
        Chargement...
      </div>
    );
  }

  const hasDocument = poDocument !== null;

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Status display */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={hasDocument ? 'green' : 'gray'}>
          {hasDocument ? 'Recu' : 'Non recu'}
        </Badge>
        {hasDocument && poDocument && (
          <span className="text-sm text-gray-500">
            {poDocument.file_name} - {formatDate(poDocument.created_at)}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!hasDocument ? (
          <Button
            size="sm"
            onClick={handleUploadClick}
            loading={uploading}
          >
            Uploader le bon de commande
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              onClick={handleView}
            >
              Voir le bon de commande
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUploadClick}
              loading={uploading}
            >
              Remplacer
            </Button>
          </>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500 mt-2">
        Formats acceptés : PDF, DOC, DOCX
      </p>
    </div>
  );
}
