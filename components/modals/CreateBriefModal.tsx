'use client';

import { useState, useEffect } from 'react';
import { Button, Badge } from '@/components/ui';
import type { BriefTemplate } from '@/lib/briefs/types';

interface CreateBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle?: string;
  onCreated: (briefId: string) => void;
}

export function CreateBriefModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  onCreated,
}: CreateBriefModalProps) {
  const [templates, setTemplates] = useState<BriefTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  async function fetchTemplates() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/briefs/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data || []);
      } else {
        setError('Erreur de chargement des templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(templateId: string) {
    setCreating(templateId);
    setError('');

    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: dealId,
          template_id: templateId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la creation');
        return;
      }

      onCreated(data.data.id);
      onClose();
    } catch (err) {
      console.error('Error creating brief:', err);
      setError('Erreur de connexion');
    } finally {
      setCreating(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Nouveau brief
          </h2>
          {dealTitle && (
            <p className="text-sm text-gray-500 mt-1">
              Pour le deal : {dealTitle}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucun template disponible</p>
              <p className="text-sm text-gray-400">
                Creez un template depuis Parametres &gt; Templates de briefs
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  disabled={creating !== null}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    creating === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {template.name}
                        </span>
                        {template.is_default && (
                          <Badge variant="blue">Par defaut</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                    {creating === template.id && (
                      <div className="ml-auto animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={creating !== null}
            className="w-full"
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
