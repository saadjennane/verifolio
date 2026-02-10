'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Upload, Eye, RefreshCw, Trash2 } from 'lucide-react';

interface StampedDocumentUploaderProps {
  invoiceId: string;
  stampedDocumentUrl: string | null;
  onUploadComplete?: () => void;
}

export function StampedDocumentUploader({
  invoiceId,
  stampedDocumentUrl,
  onUploadComplete,
}: StampedDocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDocument = !!stampedDocumentUrl;

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporte. Utilisez PDF, PNG ou JPG.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 10 MB)');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/invoices/${invoiceId}/stamped-document`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'upload');
        return;
      }

      setSuccessMessage('Facture cachetee ajoutee');
      onUploadComplete?.();
    } catch (err) {
      console.error('Error uploading stamped document:', err);
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
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/stamped-document`);
      const data = await res.json();

      if (res.ok && data.data?.url) {
        window.open(data.data.url, '_blank');
      } else {
        setError(data.error || 'Erreur lors de l\'ouverture');
      }
    } catch (err) {
      console.error('Error getting download URL:', err);
      setError('Erreur lors de l\'ouverture');
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer la facture cachetee ?')) return;

    setDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/stamped-document`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la suppression');
        return;
      }

      setSuccessMessage('Facture cachetee supprimee');
      onUploadComplete?.();
    } catch (err) {
      console.error('Error deleting stamped document:', err);
      setError('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={hasDocument ? 'green' : 'gray'}>
          {hasDocument ? 'Cachetee' : 'Non cachetee'}
        </Badge>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Success message */}
      {successMessage && (
        <p className="text-sm text-green-600 mb-3">{successMessage}</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!hasDocument ? (
          <Button
            size="sm"
            onClick={handleUploadClick}
            loading={uploading}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Ajouter facture cachetee
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleView}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Voir
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUploadClick}
              loading={uploading}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Remplacer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              loading={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-2">
        Formats acceptes : PDF, PNG, JPG (max 10 MB)
      </p>
    </div>
  );
}
