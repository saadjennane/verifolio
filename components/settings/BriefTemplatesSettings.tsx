'use client';

import { useState, useEffect } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Badge, Input } from '@/components/ui';
import type { BriefTemplate } from '@/lib/briefs/types';
import { NewBriefTemplateWizard } from '@/components/briefs/NewBriefTemplateWizard';
import type { BriefThemeColor } from '@/lib/briefs/themes';

export function BriefTemplatesSettings() {
  const { openTab } = useTabsStore();
  const [templates, setTemplates] = useState<BriefTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/briefs/templates');
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

  const handleCreateFromWizard = async (wizardData: {
    name: string;
    description: string;
    useAI: boolean;
    aiPrompt?: string;
    themeColor: BriefThemeColor;
    showLogo: boolean;
    showBriefReminder: boolean;
  }) => {
    setIsCreating(true);
    setError('');

    try {
      // Step 1: If AI is selected, generate the structure first
      let aiGeneratedBlocks: Array<{
        type: string;
        label: string;
        position: number;
        is_required: boolean;
        config: Record<string, unknown>;
      }> | null = null;

      if (wizardData.useAI && wizardData.aiPrompt) {
        const aiRes = await fetch('/api/ai/brief-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: wizardData.aiPrompt }),
        });

        const aiData = await aiRes.json();
        if (aiRes.ok && aiData.data?.blocks) {
          aiGeneratedBlocks = aiData.data.blocks;
        } else {
          // AI failed but continue with empty template
          console.warn('AI generation failed:', aiData.error);
        }
      }

      // Step 2: Create the template
      const res = await fetch('/api/briefs/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardData.name,
          description: wizardData.description || null,
          theme_color: wizardData.themeColor,
          show_logo: wizardData.showLogo,
          show_brief_reminder: wizardData.showBriefReminder,
        }),
      });

      const data = await res.json();
      if (res.ok && data.data?.id) {
        const templateId = data.data.id;

        // Step 3: If we have AI-generated blocks, save them
        if (aiGeneratedBlocks && aiGeneratedBlocks.length > 0) {
          const questionsRes = await fetch(`/api/briefs/templates/${templateId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questions: aiGeneratedBlocks.map((block, index) => ({
                id: `temp-${Date.now()}-${index}`,
                template_id: templateId,
                type: block.type,
                label: block.label,
                position: index,
                is_required: block.is_required || false,
                config: block.config || {},
                created_at: new Date().toISOString(),
              })),
            }),
          });

          if (!questionsRes.ok) {
            console.warn('Failed to save AI-generated questions');
          }
        }

        setShowWizard(false);

        // Open the template editor tab
        openTab({
          type: 'edit-brief-template',
          path: `/briefs/templates/${templateId}`,
          title: wizardData.name,
          entityId: templateId,
        }, true);
      } else {
        setError(data.error || `Erreur de creation (status: ${res.status})`);
      }
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Erreur de connexion');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    setDuplicatingId(templateId);
    setError('');

    try {
      const res = await fetch(`/api/briefs/templates/${templateId}/duplicate`, {
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
    if (!confirm('Supprimer ce template ? Cette action est irreversible.')) {
      return;
    }

    setDeletingId(templateId);
    setError('');

    try {
      const res = await fetch(`/api/briefs/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
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
      const res = await fetch(`/api/briefs/templates/${templateId}`, {
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
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur de mise a jour');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  const startEditing = (template: BriefTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditDescription(template.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      const res = await fetch(`/api/briefs/templates/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });

      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingId
              ? { ...t, name: editName.trim(), description: editDescription.trim() || null }
              : t
          )
        );
        setEditingId(null);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Wizard Modal */}
      {showWizard && (
        <NewBriefTemplateWizard
          onComplete={handleCreateFromWizard}
          onCancel={() => setShowWizard(false)}
          isCreating={isCreating}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Templates de briefs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerez vos templates pour creer des briefs rapidement.
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          Nouveau template
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
          >
            x
          </button>
        </div>
      )}

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              {editingId === template.id ? (
                // Edit mode
                <div className="space-y-3">
                  <Input
                    label="Nom"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    label="Description (optionnel)"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
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
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                    {!template.is_default && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Definir par defaut"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => openTab({
                        type: 'edit-brief-template',
                        path: `/briefs/templates/${template.id}`,
                        title: template.name,
                        entityId: template.id,
                      }, true)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editer les questions"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEditing(template)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Modifier le nom"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDuplicate(template.id)}
                      disabled={duplicatingId === template.id}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Dupliquer"
                    >
                      {duplicatingId === template.id ? (
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      {deletingId === template.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Empty state
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500 mb-4">Aucun template de brief pour le moment</p>
          <p className="text-sm text-gray-400 mb-6">
            Creez votre premier template pour commencer a utiliser les briefs.
          </p>
          <Button onClick={() => setShowWizard(true)}>
            Creer un template
          </Button>
        </div>
      )}

    </div>
  );
}
