'use client';

import { useState } from 'react';
import { Button, Input, Checkbox } from '@/components/ui';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefId: string;
  briefTitle: string;
  questionCount: number;
  onCreated: (templateId: string, templateName: string) => void;
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  briefId,
  briefTitle,
  questionCount,
  onCreated,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(`${briefTitle} - Template`);
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Le nom du template est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/briefs/templates/from-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefId,
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la creation');
        return;
      }

      onCreated(data.data.id, data.data.name);
      onClose();
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      setName(`${briefTitle} - Template`);
      setDescription('');
      setIsDefault(false);
      setError('');
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Enregistrer comme template
          </h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="template-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom du template *
              </label>
              <Input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon template"
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="template-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (optionnel)
              </label>
              <textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du template..."
                disabled={saving}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <Checkbox
              label="Definir comme template par defaut"
              checked={isDefault}
              onChange={(checked) => setIsDefault(checked)}
              disabled={saving}
            />

            <p className="text-sm text-gray-500">
              Ce template contiendra {questionCount} question{questionCount > 1 ? 's' : ''}.
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Enregistrement...
                </span>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
