'use client';

import { useState, useEffect } from 'react';
import { EntitySelector } from '@/components/tasks/EntitySelector';
import { OwnerSelector } from '@/components/tasks/OwnerSelector';
import type { Task, TaskOwnerScope } from '@/lib/tasks/types';

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
}

export function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [entityType, setEntityType] = useState<'client' | 'deal' | 'mission' | 'contact' | ''>(
    (task.entity_type as any) || ''
  );
  const [entityId, setEntityId] = useState(task.entity_id || '');
  const [ownerScope, setOwnerScope] = useState<TaskOwnerScope>(task.owner_scope || 'me');
  const [ownerEntityId, setOwnerEntityId] = useState<string | null>(task.owner_entity_id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when task or modal state changes
  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.due_date || '');
      setEntityType((task.entity_type as any) || '');
      setEntityId(task.entity_id || '');
      setOwnerScope(task.owner_scope || 'me');
      setOwnerEntityId(task.owner_entity_id || null);
      setError('');
    }
  }, [isOpen, task]);

  // Reset owner when entity changes away from mission
  useEffect(() => {
    if (entityType !== 'mission') {
      setOwnerScope('me');
      setOwnerEntityId(null);
    }
  }, [entityType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        owner_scope: ownerScope,
        owner_entity_id: ownerEntityId,
      };

      // Add entity linking
      if (entityType && entityId) {
        payload.entity_type = entityType;
        payload.entity_id = entityId;
      } else {
        // Clear entity linking
        payload.entity_type = null;
        payload.entity_id = null;
      }

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      const { task: updatedTask } = await res.json();
      onSave(updatedTask);
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Modifier la tâche</h2>

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
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description / Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ajouter des notes..."
              />
            </div>

            {/* Date d'échéance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'échéance
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Liaison entité */}
            <EntitySelector
              entityType={entityType}
              entityId={entityId}
              onEntityTypeChange={setEntityType}
              onEntityIdChange={setEntityId}
            />

            {/* Sélecteur "Dépend de" - uniquement pour les tâches liées à une mission */}
            {entityType === 'mission' && entityId && (
              <OwnerSelector
                missionId={entityId}
                ownerScope={ownerScope}
                ownerEntityId={ownerEntityId}
                onOwnerScopeChange={setOwnerScope}
                onOwnerEntityIdChange={setOwnerEntityId}
              />
            )}

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
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
