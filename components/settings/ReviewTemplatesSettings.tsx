'use client';

import { useState, useEffect } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { ReviewTemplate } from '@/lib/reviews/types';

export function ReviewTemplatesSettings() {
  const { openTab } = useTabsStore();
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/settings/review-templates');
      const json = await res.json();
      if (json.data) {
        setTemplates(json.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des templates' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(template: ReviewTemplate) {
    if (!confirm(`Supprimer le template "${template.name}" ?`)) return;

    try {
      const res = await fetch(`/api/settings/review-templates/${template.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la suppression' });
        return;
      }

      setMessage({ type: 'success', text: 'Template supprimé' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  }

  async function handleSetDefault(template: ReviewTemplate) {
    try {
      const res = await fetch(`/api/settings/review-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (!res.ok) {
        const json = await res.json();
        setMessage({ type: 'error', text: json.error || 'Erreur' });
        return;
      }

      fetchTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Templates de reviews</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurez les critères d&apos;évaluation et les textes pour vos demandes d&apos;avis
          </p>
        </div>
        <button
          onClick={() => openTab({
            type: 'new-review-template',
            path: '/settings/review-templates/new',
            title: 'Nouveau template',
          }, true)}
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Nouveau template
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">Aucun template</h3>
          <p className="mt-1 text-sm text-gray-500">
            Créez votre premier template de review pour personnaliser vos demandes d&apos;avis.
          </p>
          <button
            onClick={() => openTab({
              type: 'new-review-template',
              path: '/settings/review-templates/new',
              title: 'Nouveau template',
            }, true)}
            className="mt-4 inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Créer un template
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    {template.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Par défaut
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.rating_criteria.map((criterion) => (
                      <span
                        key={criterion.id}
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {criterion.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <p>Texte libre: {template.show_text_field ? 'Oui' : 'Non'}</p>
                    <p>Champ notes basses: {template.show_low_rating_field ? 'Oui' : 'Non'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {!template.is_default && (
                    <button
                      onClick={() => handleSetDefault(template)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Définir par défaut"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => openTab({
                      type: 'edit-review-template',
                      path: `/settings/review-templates/${template.id}`,
                      title: 'Modifier template',
                      entityId: template.id,
                    }, true)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
