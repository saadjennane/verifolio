'use client';

import { useState, useEffect } from 'react';
import type { TaskEntityType } from '@/lib/tasks/types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  entityType: TaskEntityType;
  entityId: string;
  entityName: string;
}

const ENTITY_LABELS: Record<TaskEntityType, string> = {
  client: 'Client',
  contact: 'Contact',
  deal: 'Deal',
  mission: 'Mission',
  invoice: 'Facture',
};

export function CreateTaskModal({
  isOpen,
  onClose,
  onCreated,
  entityType,
  entityId,
  entityName,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        entity_type: entityType,
        entity_id: entityId,
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la creation');
      }

      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Nouvelle tache</h2>

          {/* Entity badge */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500">{ENTITY_LABELS[entityType]} :</span>
            <span className="ml-2 text-sm font-medium text-gray-900">{entityName}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Envoyer le devis, Relancer le client..."
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Details supplementaires..."
              />
            </div>

            {/* Date d'echeance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Echeance
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Creation...' : 'Creer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
