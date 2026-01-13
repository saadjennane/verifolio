'use client';

import { useState, useEffect } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Badge } from '@/components/ui';
import { toast } from 'sonner';
import { StructureTemplateModal } from '@/components/modals/StructureTemplateModal';

interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function ProposalTemplatesSettings() {
  const { openTab } = useTabsStore();
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showStructureModal, setShowStructureModal] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/proposals/templates');
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.data || []);
      } else {
        setError(data.error || 'Erreur de chargement');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = () => {
    setShowStructureModal(true);
  };

  const handleProposalCreated = (proposalId: string) => {
    openTab({
      type: 'edit-proposal',
      path: `/proposals/${proposalId}/edit`,
      title: 'Nouveau template',
      entityId: proposalId,
    }, true);
    toast.success('Brouillon de template cree');
  };

  const handleDuplicate = async (templateId: string) => {
    setDuplicatingId(templateId);
    setError('');

    try {
      const res = await fetch(`/api/proposals/templates/${templateId}/duplicate`, {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok) {
        setTemplates((prev) => {
          const idx = prev.findIndex((t) => t.id === templateId);
          const newTemplates = [...prev];
          newTemplates.splice(idx + 1, 0, data.data);
          return newTemplates;
        });
        toast.success('Template duplique');
      } else {
        setError(data.error || 'Erreur de duplication');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.is_system) {
      toast.error('Impossible de supprimer un template systeme');
      return;
    }

    if (!confirm('Supprimer ce template ? Cette action est irreversible.')) {
      return;
    }

    setDeletingId(templateId);
    setError('');

    try {
      const res = await fetch(`/api/proposals/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        toast.success('Template supprime');
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur de suppression');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const res = await fetch(`/api/proposals/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => ({
            ...t,
            is_default: t.id === templateId,
          }))
        );
        toast.success('Template defini par defaut');
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur de mise a jour');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Templates de propositions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Creez une proposition vide puis enregistrez-la comme template.
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          Creer un template
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-destructive/70 hover:text-destructive"
          >
            x
          </button>
        </div>
      )}

      {/* Info box */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-foreground">
            <p className="font-medium mb-1">Comment creer un template ?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Cliquez &quot;Creer un template&quot; pour ouvrir l&apos;editeur</li>
              <li>Editez le contenu de votre proposition</li>
              <li>Cliquez le bouton &quot;Enregistrer comme template&quot; dans l&apos;editeur</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-4 h-4 rounded-full bg-purple-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {template.name}
                      </span>
                      {template.is_default && (
                        <Badge variant="blue">Par defaut</Badge>
                      )}
                      {template.is_system && (
                        <Badge variant="gray">Systeme</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                  {!template.is_default && !template.is_system && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="p-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      title="Definir par defaut"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    disabled={duplicatingId === template.id}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Dupliquer"
                  >
                    {duplicatingId === template.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {!template.is_system && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      {deletingId === template.id ? (
                        <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Aucun template</h3>
          <p className="text-muted-foreground mb-4">
            Creez votre premier template de proposition.
          </p>
          <Button onClick={handleCreateTemplate}>
            Creer un template
          </Button>
        </div>
      )}

      {/* Modal de sélection de structure */}
      <StructureTemplateModal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        onCreated={handleProposalCreated}
      />
    </div>
  );
}
