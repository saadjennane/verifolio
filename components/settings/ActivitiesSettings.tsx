'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui';
import { ActivityVariablesEditor } from './ActivityVariablesEditor';

interface JobProfile {
  id: string;
  label: string;
  category: string;
}

interface UserActivity {
  id: string;
  job_profile_id: string;
  label_override: string | null;
  is_default: boolean;
  created_at: string;
  job_profile: JobProfile;
}

const CATEGORY_LABELS: Record<string, string> = {
  event: 'Événementiel',
  b2b: 'B2B',
  tech: 'Tech',
  creative: 'Créatif',
  field: 'Terrain',
  admin: 'Admin',
  other: 'Autre',
};

const MAX_ACTIVITIES = 10;

export function ActivitiesSettings() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // État pour l'ajout
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // État pour l'édition inline du label
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // État pour l'éditeur de variables
  const [editingVariablesActivity, setEditingVariablesActivity] = useState<UserActivity | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [activitiesRes, profilesRes] = await Promise.all([
        fetch('/api/settings/activities', { credentials: 'include' }),
        fetch('/api/settings/activities/profiles', { credentials: 'include' }),
      ]);

      const [activitiesJson, profilesJson] = await Promise.all([
        activitiesRes.json(),
        profilesRes.json(),
      ]);

      if (activitiesJson.data) {
        setActivities(activitiesJson.data);
      }
      if (profilesJson.data) {
        setProfiles(profilesJson.data);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setMessage({ type: 'error', text: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  }

  // Profils disponibles (non encore ajoutés)
  const availableProfiles = useMemo(() => {
    const addedIds = new Set(activities.map((a) => a.job_profile_id));
    return profiles.filter((p) => !addedIds.has(p.id));
  }, [profiles, activities]);

  // Profils filtrés par recherche
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return availableProfiles;
    const query = searchQuery.toLowerCase();
    return availableProfiles.filter(
      (p) =>
        p.label.toLowerCase().includes(query) ||
        CATEGORY_LABELS[p.category]?.toLowerCase().includes(query)
    );
  }, [availableProfiles, searchQuery]);

  async function handleAdd() {
    if (!selectedProfileId) return;
    if (activities.length >= MAX_ACTIVITIES) {
      setMessage({ type: 'error', text: `Maximum ${MAX_ACTIVITIES} activités` });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/activities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_profile_id: selectedProfileId }),
      });

      const json = await res.json();

      if (res.ok && json.data) {
        setActivities((prev) => [...prev, json.data]);
        setSelectedProfileId('');
        setSearchQuery('');
        setMessage({ type: 'success', text: 'Activité ajoutée' });
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de l\'ajout' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette activité ?')) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/settings/activities/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        // Recharger les activités pour avoir le nouveau default
        await fetchData();
        setMessage({ type: 'success', text: 'Activité supprimée' });
      } else {
        const json = await res.json();
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/settings/activities/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (res.ok) {
        // Mettre à jour localement
        setActivities((prev) =>
          prev.map((a) => ({
            ...a,
            is_default: a.id === id,
          }))
        );
        setMessage({ type: 'success', text: 'Activité par défaut mise à jour' });
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

  function startEditing(activity: UserActivity) {
    setEditingId(activity.id);
    setEditingLabel(activity.label_override || activity.job_profile.label);
  }

  async function saveLabel(id: string) {
    const activity = activities.find((a) => a.id === id);
    if (!activity) return;

    // Si le label est identique au label original, on met null
    const newLabel =
      editingLabel.trim() === activity.job_profile.label ? null : editingLabel.trim() || null;

    setSaving(true);

    try {
      const res = await fetch(`/api/settings/activities/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_override: newLabel }),
      });

      if (res.ok) {
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, label_override: newLabel } : a))
        );
      }
    } catch (error) {
      console.error('Erreur sauvegarde label:', error);
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingLabel('');
  }

  async function resetLabel(id: string) {
    setSaving(true);

    try {
      const res = await fetch(`/api/settings/activities/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_override: null }),
      });

      if (res.ok) {
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, label_override: null } : a))
        );
        setMessage({ type: 'success', text: 'Label réinitialisé' });
      }
    } catch (error) {
      console.error('Erreur réinitialisation label:', error);
    } finally {
      setSaving(false);
    }
  }

  const defaultActivity = activities.find((a) => a.is_default);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Si on édite les variables d'une activité, afficher l'éditeur
  if (editingVariablesActivity) {
    return (
      <ActivityVariablesEditor
        activityId={editingVariablesActivity.id}
        activityLabel={editingVariablesActivity.label_override || editingVariablesActivity.job_profile.label}
        onClose={() => setEditingVariablesActivity(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Introduction */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Mes activités</h2>
        <p className="text-sm text-gray-500">
          Choisissez vos activités (casquettes). Elles serviront à adapter vos propositions avec des
          variables métier personnalisées.
        </p>
      </div>

      {/* Activité par défaut */}
      {defaultActivity && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-800">Activité par défaut :</span>
            <span className="text-sm text-blue-700">
              {defaultActivity.label_override || defaultActivity.job_profile.label}
            </span>
          </div>
        </div>
      )}

      {/* Ajouter une activité */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Ajouter une activité</h3>

        {activities.length >= MAX_ACTIVITIES ? (
          <p className="text-sm text-amber-600">
            Vous avez atteint le maximum de {MAX_ACTIVITIES} activités.
          </p>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedProfileId('');
                }}
                placeholder="Rechercher un métier..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Dropdown des résultats */}
              {searchQuery && filteredProfiles.length > 0 && !selectedProfileId && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfileId(profile.id);
                        setSearchQuery(profile.label);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-900">{profile.label}</span>
                      <span className="text-xs text-gray-400">
                        {CATEGORY_LABELS[profile.category] || profile.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && filteredProfiles.length === 0 && !selectedProfileId && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <p className="text-sm text-gray-500">Aucun métier trouvé</p>
                </div>
              )}
            </div>

            <Button onClick={handleAdd} disabled={!selectedProfileId || saving}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        )}
      </div>

      {/* Liste des activités */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">
            Vos activités ({activities.length}/{MAX_ACTIVITIES})
          </h3>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 mb-2">Aucune activité configurée</p>
            <p className="text-sm text-gray-400">Ajoutez votre première activité ci-dessus</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Édition inline du label */}
                  {editingId === activity.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveLabel(activity.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                      <button
                        onClick={() => saveLabel(activity.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Enregistrer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-400 hover:text-gray-600"
                        title="Annuler"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {activity.label_override || activity.job_profile.label}
                          </span>
                          {activity.label_override && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-gray-500 bg-gray-100">
                              personnalisé
                            </span>
                          )}
                          {activity.is_default && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Par défaut
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {activity.label_override
                            ? `${activity.job_profile.label} · ${CATEGORY_LABELS[activity.job_profile.category] || activity.job_profile.category}`
                            : CATEGORY_LABELS[activity.job_profile.category] || activity.job_profile.category}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                {editingId !== activity.id && (
                  <div className="flex items-center gap-1">
                    {!activity.is_default && (
                      <button
                        onClick={() => handleSetDefault(activity.id)}
                        disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Définir par défaut"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => setEditingVariablesActivity(activity)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Configurer les variables"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => startEditing(activity)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Renommer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {activity.label_override && (
                      <button
                        onClick={() => resetLabel(activity.id)}
                        disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Réinitialiser le nom"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(activity.id)}
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
