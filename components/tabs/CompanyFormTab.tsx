'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input, Select, PhoneInput, Textarea } from '@/components/ui';
import type { Client, ClientType } from '@/lib/supabase/types';
import type { CustomField } from '@/lib/types/settings';

interface CompanyFormTabProps {
  companyId?: string;
}

export function CompanyFormTab({ companyId }: CompanyFormTabProps) {
  const { openTab, closeTab, tabs, activeTabId } = useTabsStore();
  const isEditing = !!companyId;

  const [company, setCompany] = useState<Client | null>(null);
  const [type, setType] = useState<ClientType>('entreprise');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');

  // Role flags
  const [isClient, setIsClient] = useState(true);
  const [isSupplier, setIsSupplier] = useState(false);

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load custom fields for clients (scope: client covers both)
      const { data: fields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('scope', 'client')
        .eq('is_active', true)
        .order('created_at');

      if (fields) {
        setCustomFields(fields);
      }

      // If editing, load company data and field values
      if (companyId) {
        const [companyRes, valuesRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', companyId).single(),
          supabase
            .from('custom_field_values')
            .select('field_id, value_text')
            .eq('entity_type', 'client')
            .eq('entity_id', companyId),
        ]);

        if (companyRes.error || !companyRes.data) {
          setError('Entreprise non trouvée');
          setLoading(false);
          return;
        }

        const data = companyRes.data;
        setCompany(data);
        setType(data.type);
        setNom(data.nom);
        setEmail(data.email || '');
        setTelephone(data.telephone || '');
        setAdresse(data.adresse || '');
        setNotes(data.notes || '');
        setIsClient(data.is_client ?? true);
        setIsSupplier(data.is_supplier ?? false);

        // Map field values
        if (valuesRes.data) {
          const values: Record<string, string> = {};
          for (const v of valuesRes.data) {
            values[v.field_id] = v.value_text || '';
          }
          setFieldValues(values);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [companyId]);

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation: au moins un rôle doit être sélectionné
    if (!isClient && !isSupplier) {
      setError('Veuillez sélectionner au moins un rôle (Client ou Fournisseur)');
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const companyData = {
      type,
      nom,
      email: email || null,
      telephone: telephone || null,
      adresse: adresse || null,
      notes: notes || null,
      is_client: isClient,
      is_supplier: isSupplier,
    };

    let savedCompanyId = companyId;

    if (isEditing && company) {
      const { error } = await supabase
        .from('clients')
        .update(companyData)
        .eq('id', company.id);

      if (error) {
        setError('Erreur lors de la mise à jour');
        setSaving(false);
        return;
      }
      savedCompanyId = company.id;
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...companyData,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (error || !data) {
        setError('Erreur lors de la création');
        setSaving(false);
        return;
      }
      savedCompanyId = data.id;
    }

    // Save custom field values
    for (const field of customFields) {
      const value = fieldValues[field.id] || '';
      if (value || isEditing) {
        await supabase.from('custom_field_values').upsert(
          {
            user_id: user?.id || null,
            field_id: field.id,
            entity_type: 'client',
            entity_id: savedCompanyId,
            value_text: value || null,
          },
          { onConflict: 'field_id,entity_type,entity_id' }
        );
      }
    }

    // Fermer l'onglet actuel et ouvrir la liste des entreprises
    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (currentTab) {
      closeTab(currentTab.id);
    }
    openTab({ type: 'companies', path: '/companies', title: 'Entreprises' }, true);
  };

  const handleCancel = () => {
    openTab({ type: 'companies', path: '/companies', title: 'Entreprises' }, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Retour aux entreprises
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {isEditing ? 'Modifier' : 'Nouveau'}
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rôle de l'entreprise
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isClient}
                    onChange={(e) => setIsClient(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Client</span>
                  <span className="text-xs text-gray-500">(peut recevoir des devis/factures)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSupplier}
                    onChange={(e) => setIsSupplier(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Fournisseur</span>
                  <span className="text-xs text-gray-500">(peut vous facturer)</span>
                </label>
              </div>
            </div>

            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as ClientType)}
              options={[
                { value: 'entreprise', label: 'Entreprise' },
                { value: 'particulier', label: 'Particulier' },
              ]}
            />

            <Input
              label="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={
                type === 'entreprise' ? "Nom de l'entreprise" : 'Nom complet'
              }
              required
            />

            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
            />

            <PhoneInput
              label="Téléphone"
              value={telephone}
              onChange={setTelephone}
              defaultCountry="MA"
            />

            <Textarea
              label="Adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Adresse complète"
              rows={2}
            />

            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes"
              rows={3}
            />

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Champs personnalisés</p>
                <div className="space-y-4">
                  {customFields.map((field) => (
                    <Input
                      key={field.id}
                      label={field.label}
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                      placeholder={field.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button type="submit" loading={saving}>
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Annuler
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
