'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import type { CustomField } from '@/lib/types/settings';

// Copy icon component
function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// Check icon for copy success
function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface FieldWithMeta extends CustomField {
  companyValue?: string;
  appliesTo: {
    company: boolean;
    client: boolean;
    supplier: boolean;
  };
}

export function CustomFieldsSettings() {
  const [fields, setFields] = useState<FieldWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyToClipboard(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Form state for new/edit field
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<FieldWithMeta | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    companyValue: '',
    appliesTo: {
      company: true,
      client: false,
      supplier: false,
    },
  });

  useEffect(() => {
    fetchFields();
  }, []);

  async function fetchFields() {
    try {
      const res = await fetch('/api/settings/fields', { credentials: 'include' });
      const json = await res.json();
      if (json.data) {
        // Group fields by key and determine appliesTo
        const fieldMap = new Map<string, FieldWithMeta>();

        json.data.forEach((field: CustomField & { value?: string }) => {
          const existing = fieldMap.get(field.key);
          if (existing) {
            if (field.scope === 'company') {
              existing.appliesTo.company = true;
              existing.companyValue = field.value || '';
            } else if (field.scope === 'client') {
              existing.appliesTo.client = true;
            } else if (field.scope === 'supplier') {
              existing.appliesTo.supplier = true;
            }
          } else {
            fieldMap.set(field.key, {
              ...field,
              companyValue: field.scope === 'company' ? (field.value || '') : '',
              appliesTo: {
                company: field.scope === 'company',
                client: field.scope === 'client',
                supplier: field.scope === 'supplier',
              },
            });
          }
        });

        setFields(Array.from(fieldMap.values()));
      }
    } catch (error) {
      console.error('Erreur chargement champs:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateKey(label: string): string {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function resetForm() {
    setFormData({
      label: '',
      companyValue: '',
      appliesTo: { company: true, client: false, supplier: false },
    });
    setEditingField(null);
    setShowForm(false);
  }

  function handleEdit(field: FieldWithMeta) {
    setEditingField(field);
    setFormData({
      label: field.label,
      companyValue: field.companyValue || '',
      appliesTo: { ...field.appliesTo },
    });
    setShowForm(true);
  }

  async function handleSaveField() {
    if (!formData.label.trim()) {
      setMessage({ type: 'error', text: 'Le libellé est requis' });
      return;
    }

    if (!formData.appliesTo.company && !formData.appliesTo.client && !formData.appliesTo.supplier) {
      setMessage({ type: 'error', text: 'Sélectionnez au moins une cible' });
      return;
    }

    if (formData.appliesTo.company && !formData.companyValue.trim()) {
      setMessage({ type: 'error', text: 'La valeur entreprise est requise' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (editingField) {
        // Update existing field
        await handleUpdateField();
      } else {
        // Create new field
        await handleCreateField();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateField() {
    const key = generateKey(formData.label);
    const createdFields: CustomField[] = [];

    if (formData.appliesTo.company) {
      const res = await fetch('/api/settings/fields', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label,
          key,
          scope: 'company',
          field_type: 'text',
          is_active: true,
          is_visible_default: true,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        createdFields.push(json.data);
        // Sauvegarder la valeur du champ
        const valueRes = await fetch(`/api/settings/fields/${json.data.id}/value`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formData.companyValue }),
        });
        if (!valueRes.ok) {
          const valueJson = await valueRes.json();
          console.error('Erreur sauvegarde valeur:', valueJson);
        }
      } else {
        throw new Error(json.error || 'Erreur création champ entreprise');
      }
    }

    if (formData.appliesTo.client) {
      const res = await fetch('/api/settings/fields', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label,
          key,
          scope: 'client',
          field_type: 'text',
          is_active: true,
          is_visible_default: true,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        createdFields.push(json.data);
      }
    }

    if (formData.appliesTo.supplier) {
      const res = await fetch('/api/settings/fields', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label,
          key,
          scope: 'supplier',
          field_type: 'text',
          is_active: true,
          is_visible_default: true,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        createdFields.push(json.data);
      }
    }

    // Recharger les champs pour avoir les valeurs à jour
    await fetchFields();
    resetForm();
    setMessage({ type: 'success', text: 'Champ créé' });
  }

  async function handleUpdateField() {
    if (!editingField) return;

    // For now, we need to delete and recreate if scope changed
    // First, fetch all fields with this key
    const res = await fetch('/api/settings/fields', { credentials: 'include' });
    const json = await res.json();
    const existingFields = json.data.filter((f: CustomField) => f.key === editingField.key);

    // Delete fields that are no longer needed
    for (const f of existingFields) {
      const shouldKeep =
        (f.scope === 'company' && formData.appliesTo.company) ||
        (f.scope === 'client' && formData.appliesTo.client) ||
        (f.scope === 'supplier' && formData.appliesTo.supplier);

      if (!shouldKeep) {
        await fetch(`/api/settings/fields/${f.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }
    }

    // Create fields that don't exist yet
    const hasCompany = existingFields.some((f: CustomField) => f.scope === 'company');
    const hasClient = existingFields.some((f: CustomField) => f.scope === 'client');
    const hasSupplier = existingFields.some((f: CustomField) => f.scope === 'supplier');

    if (formData.appliesTo.company && !hasCompany) {
      const createRes = await fetch('/api/settings/fields', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label,
          key: editingField.key,
          scope: 'company',
          field_type: 'text',
          is_active: true,
          is_visible_default: true,
        }),
      });
      const createJson = await createRes.json();
      if (createRes.ok) {
        await fetch(`/api/settings/fields/${createJson.data.id}/value`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formData.companyValue }),
        });
      }
    }

    if (formData.appliesTo.client && !hasClient) {
      await fetch('/api/settings/fields', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label,
          key: editingField.key,
          scope: 'client',
          field_type: 'text',
          is_active: true,
          is_visible_default: true,
        }),
      });
    }

    if (formData.appliesTo.supplier && !hasSupplier) {
      await fetch('/api/settings/fields', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label,
          key: editingField.key,
          scope: 'supplier',
          field_type: 'text',
          is_active: true,
          is_visible_default: true,
        }),
      });
    }

    // Update company value if exists
    if (formData.appliesTo.company) {
      const companyField = existingFields.find((f: CustomField) => f.scope === 'company');
      if (companyField) {
        await fetch(`/api/settings/fields/${companyField.id}/value`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formData.companyValue }),
        });
      }
    }

    // Refresh fields
    await fetchFields();
    resetForm();
    setMessage({ type: 'success', text: 'Champ mis à jour' });
  }

  async function handleDeleteField(field: FieldWithMeta) {
    if (!confirm(`Supprimer le champ "${field.label}" ?`)) return;

    try {
      const res = await fetch('/api/settings/fields', { credentials: 'include' });
      const json = await res.json();
      const fieldsToDelete = json.data.filter((f: CustomField) => f.key === field.key);

      for (const f of fieldsToDelete) {
        await fetch(`/api/settings/fields/${f.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      setFields(prev => prev.filter(f => f.key !== field.key));
      setMessage({ type: 'success', text: 'Champ supprimé' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
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

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Créez des champs personnalisés et choisissez où ils s'appliquent.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          + Nouveau champ
        </Button>
      </div>

      {/* New/Edit Field Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            {editingField ? 'Modifier le champ' : 'Nouveau champ personnalisé'}
          </h3>

          <div className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Libellé *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                disabled={!!editingField}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Ex: ICE, SIRET, TVA Intracommunautaire..."
              />
              {editingField && (
                <p className="text-xs text-gray-500 mt-1">Le libellé ne peut pas être modifié</p>
              )}
            </div>

            {/* Applies to checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                S'applique à *
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.appliesTo.company}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      appliesTo: { ...prev.appliesTo, company: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mon entreprise</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.appliesTo.client}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      appliesTo: { ...prev.appliesTo, client: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Clients</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.appliesTo.supplier}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      appliesTo: { ...prev.appliesTo, supplier: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Fournisseurs</span>
                </label>
              </div>
            </div>

            {/* Company value */}
            {formData.appliesTo.company && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur pour mon entreprise *
                </label>
                <input
                  type="text"
                  value={formData.companyValue}
                  onChange={e => setFormData(prev => ({ ...prev, companyValue: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Saisissez la valeur"
                />
              </div>
            )}

            {/* Info */}
            {formData.appliesTo.client && (
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Pour les clients, la valeur sera saisie sur chaque fiche client.
              </p>
            )}
            {formData.appliesTo.supplier && (
              <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Pour les fournisseurs, la valeur sera saisie sur chaque fiche fournisseur.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="secondary" onClick={resetForm}>
              Annuler
            </Button>
            <Button onClick={handleSaveField} disabled={saving}>
              {saving ? 'Enregistrement...' : editingField ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      )}

      {/* Fields List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Champs personnalisés
        </h2>

        {fields.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun champ personnalisé créé</p>
        ) : (
          <div className="space-y-3">
            {fields.map(field => (
              <div
                key={field.key}
                className="p-4 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Field info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      <div className="flex gap-1">
                        {field.appliesTo.company && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Entreprise
                          </span>
                        )}
                        {field.appliesTo.client && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Clients
                          </span>
                        )}
                        {field.appliesTo.supplier && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            Fournisseurs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Company value (read-only display as sub-text) */}
                    {field.appliesTo.company && field.companyValue && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm text-gray-500 font-mono">
                          {field.companyValue}
                        </span>
                        <button
                          onClick={() => copyToClipboard(field.companyValue!, field.key)}
                          className={`p-0.5 rounded transition-colors ${
                            copiedKey === field.key
                              ? 'text-green-600'
                              : 'text-gray-400 hover:text-blue-600'
                          }`}
                          title={copiedKey === field.key ? 'Copié !' : 'Copier'}
                        >
                          {copiedKey === field.key ? (
                            <CheckIcon className="w-3.5 h-3.5" />
                          ) : (
                            <CopyIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(field)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Modifier"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteField(field)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}
