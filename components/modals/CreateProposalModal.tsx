'use client';

import { useState, useEffect } from 'react';
import { Button, Badge } from '@/components/ui';
import type { ProposalTemplate } from '@/lib/types/proposals';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealTitle?: string;
  onCreated: (proposalId: string) => void;
}

export function CreateProposalModal({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  onCreated,
}: CreateProposalModalProps) {
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
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
      const res = await fetch('/api/proposals/templates');
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
      const res = await fetch(`/api/deals/${dealId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création');
        return;
      }

      onCreated(data.data.id);
      onClose();
    } catch (err) {
      console.error('Error creating proposal:', err);
      setError('Erreur de connexion');
    } finally {
      setCreating(null);
    }
  }

  if (!isOpen) return null;

  // Separate system and user templates
  const systemTemplates = templates.filter((t) => t.is_system);
  const userTemplates = templates.filter((t) => !t.is_system);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Nouvelle proposition
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
                Créez un template depuis la section Propositions &gt; Templates
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User templates first */}
              {userTemplates.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Mes templates
                  </h3>
                  <div className="space-y-2">
                    {userTemplates.map((template) => (
                      <TemplateButton
                        key={template.id}
                        template={template}
                        isCreating={creating === template.id}
                        disabled={creating !== null}
                        onClick={() => handleSelect(template.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* System templates */}
              {systemTemplates.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Templates système
                  </h3>
                  <div className="space-y-2">
                    {systemTemplates.map((template) => (
                      <TemplateButton
                        key={template.id}
                        template={template}
                        isCreating={creating === template.id}
                        disabled={creating !== null}
                        onClick={() => handleSelect(template.id)}
                        isSystem
                      />
                    ))}
                  </div>
                </div>
              )}
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

interface TemplateButtonProps {
  template: ProposalTemplate;
  isCreating: boolean;
  disabled: boolean;
  onClick: () => void;
  isSystem?: boolean;
}

function TemplateButton({
  template,
  isCreating,
  disabled,
  onClick,
  isSystem,
}: TemplateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-lg border text-left transition-colors ${
        isCreating
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${template.theme?.accentColor || '#3B82F6'}20` }}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: template.theme?.accentColor || '#3B82F6' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{template.name}</span>
            {isSystem && <Badge variant="gray">Système</Badge>}
            {template.is_default && <Badge variant="blue">Par défaut</Badge>}
          </div>
          {template.description && (
            <p className="text-sm text-gray-500 truncate">{template.description}</p>
          )}
        </div>
        {isCreating && (
          <div className="ml-auto animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        )}
      </div>
    </button>
  );
}
