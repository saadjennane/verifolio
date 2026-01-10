'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

interface ActivityVariable {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date_or_period';
  source: 'seed' | 'custom';
  is_active: boolean;
  sort_order: number;
}

interface ActivityVariablesEditorProps {
  activityId: string;
  activityLabel: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Texte',
  number: 'Nombre',
  date_or_period: 'Date / Période',
};

const MAX_VARIABLES = 20;

export function ActivityVariablesEditor({
  activityId,
  activityLabel,
  onClose,
}: ActivityVariablesEditorProps) {
  const [variables, setVariables] = useState<ActivityVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // État pour l'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'number' | 'date_or_period'>('text');

  // État pour l'édition inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  useEffect(() => {
    fetchVariables();
  }, [activityId]);

  async function fetchVariables() {
    try {
      const res = await fetch(`/api/settings/activities/${activityId}/variables`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.data) {
        setVariables(json.data);
      }
    } catch (error) {
      console.error('Erreur chargement variables:', error);
      setMessage({ type: 'error', text: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newLabel.trim()) return;
    if (variables.length >= MAX_VARIABLES) {
      setMessage({ type: 'error', text: `Maximum ${MAX_VARIABLES} variables` });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/settings/activities/${activityId}/variables`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), type: newType }),
      });

      const json = await res.json();

      if (res.ok && json.data) {
        setVariables((prev) => [...prev, json.data]);
        setNewLabel('');
        setNewType('text');
        setShowAddForm(false);
        setMessage({ type: 'success', text: 'Variable ajoutée' });
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de l\'ajout' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(varId: string) {
    if (!confirm('Supprimer cette variable ?')) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/settings/activities/${activityId}/variables/${varId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setVariables((prev) => prev.filter((v) => v.id !== varId));
        setMessage({ type: 'success', text: 'Variable supprimée' });
      } else {
        const json = await res.json();
        setMessage({ type: 'error', text: json.error || 'Erreur' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(varId: string, currentActive: boolean) {
    setSaving(true);

    try {
      const res = await fetch(`/api/settings/activities/${activityId}/variables/${varId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (res.ok) {
        setVariables((prev) =>
          prev.map((v) => (v.id === varId ? { ...v, is_active: !currentActive } : v))
        );
      }
    } catch (error) {
      console.error('Erreur toggle active:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleTypeChange(varId: string, newType: string) {
    setSaving(true);

    try {
      const res = await fetch(`/api/settings/activities/${activityId}/variables/${varId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      });

      if (res.ok) {
        setVariables((prev) =>
          prev.map((v) =>
            v.id === varId ? { ...v, type: newType as ActivityVariable['type'] } : v
          )
        );
      }
    } catch (error) {
      console.error('Erreur changement type:', error);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(variable: ActivityVariable) {
    setEditingId(variable.id);
    setEditingLabel(variable.label);
  }

  async function saveLabel(varId: string) {
    if (!editingLabel.trim()) {
      setEditingId(null);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/settings/activities/${activityId}/variables/${varId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editingLabel.trim() }),
      });

      if (res.ok) {
        setVariables((prev) =>
          prev.map((v) => (v.id === varId ? { ...v, label: editingLabel.trim() } : v))
        );
      }
    } catch (error) {
      console.error('Erreur sauvegarde label:', error);
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  }

  async function moveVariable(varId: string, direction: 'up' | 'down') {
    const index = variables.findIndex((v) => v.id === varId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === variables.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherVar = variables[newIndex];

    // Échanger les sort_order
    const currentOrder = variables[index].sort_order;
    const otherOrder = otherVar.sort_order;

    setSaving(true);

    try {
      await Promise.all([
        fetch(`/api/settings/activities/${activityId}/variables/${varId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: otherOrder }),
        }),
        fetch(`/api/settings/activities/${activityId}/variables/${otherVar.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: currentOrder }),
        }),
      ]);

      // Mettre à jour localement
      const newVariables = [...variables];
      [newVariables[index], newVariables[newIndex]] = [newVariables[newIndex], newVariables[index]];
      newVariables[index].sort_order = currentOrder;
      newVariables[newIndex].sort_order = otherOrder;
      setVariables(newVariables);
    } catch (error) {
      console.error('Erreur déplacement:', error);
    } finally {
      setSaving(false);
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
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux activités
          </button>
          <h2 className="text-lg font-medium text-gray-900">Variables : {activityLabel}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurez les variables qui seront utilisées dans vos propositions
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {variables.length} / {MAX_VARIABLES} variables
        </span>
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

      {/* Liste des variables */}
      <div className="bg-white rounded-lg border border-gray-200">
        {variables.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">Aucune variable configurée</p>
            <p className="text-sm text-gray-400">Ajoutez votre première variable ci-dessous</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {variables.map((variable, index) => (
              <div
                key={variable.id}
                className={`p-4 flex items-center gap-4 ${
                  !variable.is_active ? 'bg-gray-50 opacity-60' : ''
                }`}
              >
                {/* Boutons up/down */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveVariable(variable.id, 'up')}
                    disabled={index === 0 || saving}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Monter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveVariable(variable.id, 'down')}
                    disabled={index === variables.length - 1 || saving}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Descendre"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Label (éditable) */}
                <div className="flex-1 min-w-0">
                  {editingId === variable.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveLabel(variable.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => saveLabel(variable.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => startEditing(variable)}
                      title="Cliquer pour modifier"
                    >
                      <span className="text-sm font-medium text-gray-900">{variable.label}</span>
                      {variable.source === 'seed' && (
                        <span className="ml-2 text-xs text-gray-400">(prédéfinie)</span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{variable.key}</span>
                </div>

                {/* Type */}
                <select
                  value={variable.type}
                  onChange={(e) => handleTypeChange(variable.id, e.target.value)}
                  disabled={saving}
                  className="text-sm rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">{TYPE_LABELS.text}</option>
                  <option value="number">{TYPE_LABELS.number}</option>
                  <option value="date_or_period">{TYPE_LABELS.date_or_period}</option>
                </select>

                {/* Toggle actif */}
                <button
                  onClick={() => handleToggleActive(variable.id, variable.is_active)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    variable.is_active ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  title={variable.is_active ? 'Désactiver' : 'Activer'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      variable.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {/* Supprimer */}
                <button
                  onClick={() => handleDelete(variable.id)}
                  disabled={saving}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Nouvelle variable</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Durée de la mission"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'text' | 'number' | 'date_or_period')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">{TYPE_LABELS.text}</option>
                <option value="number">{TYPE_LABELS.number}</option>
                <option value="date_or_period">{TYPE_LABELS.date_or_period}</option>
              </select>
            </div>
            <Button onClick={handleAdd} disabled={!newLabel.trim() || saving}>
              Ajouter
            </Button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewLabel('');
                setNewType('text');
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div>
          {variables.length < MAX_VARIABLES ? (
            <Button variant="secondary" onClick={() => setShowAddForm(true)}>
              + Ajouter une variable
            </Button>
          ) : (
            <p className="text-sm text-amber-600">
              Limite atteinte ({MAX_VARIABLES} variables maximum)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
