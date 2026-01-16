'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input, Select, PhoneInput, Textarea } from '@/components/ui';
import type { Client, ClientType } from '@/lib/supabase/types';
import type { CustomField } from '@/lib/types/settings';

interface ClientFormTabProps {
  clientId?: string;
}

interface FieldValue {
  field_id: string;
  value_text: string;
}

export function ClientFormTab({ clientId }: ClientFormTabProps) {
  const { openTab, closeTab, tabs, activeTabId } = useTabsStore();
  const isEditing = !!clientId;

  const [client, setClient] = useState<Client | null>(null);
  const [type, setType] = useState<ClientType>('particulier');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Always load custom fields for clients
      const { data: fields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('scope', 'client')
        .eq('is_active', true)
        .order('created_at');

      if (fields) {
        setCustomFields(fields);
      }

      // If editing, load client data and field values
      if (clientId) {
        const [clientRes, valuesRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase
            .from('custom_field_values')
            .select('field_id, value_text')
            .eq('entity_type', 'client')
            .eq('entity_id', clientId),
        ]);

        if (clientRes.error || !clientRes.data) {
          setError('Client non trouvé');
          setLoading(false);
          return;
        }

        setClient(clientRes.data);
        setType(clientRes.data.type);
        setNom(clientRes.data.nom);
        setEmail(clientRes.data.email || '');
        setTelephone(clientRes.data.telephone || '');
        setAdresse(clientRes.data.adresse || '');
        setNotes(clientRes.data.notes || '');

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
  }, [clientId]);

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const clientData = {
      type,
      nom,
      email: email || null,
      telephone: telephone || null,
      adresse: adresse || null,
      notes: notes || null,
    };

    let savedClientId = clientId;

    if (isEditing && client) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id);

      if (error) {
        setError('Erreur lors de la mise à jour');
        setSaving(false);
        return;
      }
      savedClientId = client.id;
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (error || !data) {
        setError('Erreur lors de la création');
        setSaving(false);
        return;
      }
      savedClientId = data.id;
    }

    // Save custom field values
    for (const field of customFields) {
      const value = fieldValues[field.id] || '';
      if (value || isEditing) {
        // Only save if there's a value or we're editing (to allow clearing)
        await supabase.from('custom_field_values').upsert(
          {
            user_id: user?.id || null,
            field_id: field.id,
            entity_type: 'client',
            entity_id: savedClientId,
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
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour aux entreprises
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {isEditing ? 'Modifier le client' : 'Nouveau client'}
          </h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Type de client"
              value={type}
              onChange={(e) => setType(e.target.value as ClientType)}
              options={[
                { value: 'particulier', label: 'Particulier' },
                { value: 'entreprise', label: 'Entreprise' },
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
              placeholder="Notes internes sur ce client"
              rows={3}
            />

            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500 mb-3">Champs personnalisés</p>
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
                {isEditing ? 'Enregistrer' : 'Créer le client'}
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
