'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Select, PhoneInput, Textarea } from '@/components/ui';
import type { Client, ClientType } from '@/lib/supabase/types';
import type { CustomField } from '@/lib/types/settings';

interface ClientFormProps {
  client?: Client;
  onSuccess?: (client: Client) => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function ClientForm({ client, onSuccess, onCancel, embedded }: ClientFormProps) {
  const router = useRouter();
  const isEditing = !!client;

  const [type, setType] = useState<ClientType>(client?.type || 'particulier');
  const [nom, setNom] = useState(client?.nom || '');
  const [email, setEmail] = useState(client?.email || '');
  const [telephone, setTelephone] = useState(client?.telephone || '');
  const [adresse, setAdresse] = useState(client?.adresse || '');
  const [vatEnabled, setVatEnabled] = useState(client?.vat_enabled ?? true);

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Load custom fields and values
  useEffect(() => {
    async function loadCustomFields() {
      const supabase = createClient();

      const { data: fields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('scope', 'client')
        .eq('is_active', true)
        .order('created_at');

      if (fields) {
        setCustomFields(fields);
      }

      // Load existing values if editing
      if (client?.id) {
        const { data: values } = await supabase
          .from('custom_field_values')
          .select('field_id, value_text')
          .eq('entity_type', 'client')
          .eq('entity_id', client.id);

        if (values) {
          const valuesMap: Record<string, string> = {};
          for (const v of values) {
            valuesMap[v.field_id] = v.value_text || '';
          }
          setFieldValues(valuesMap);
        }
      }
    }

    loadCustomFields();
  }, [client?.id]);

  const handleFieldValueChange = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Validate email format (requires TLD like .com, .fr, etc.)
  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(emailValue);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Format email invalide (ex: email@exemple.com)');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email before submit
    if (email && !validateEmail(email)) {
      setEmailError('Format email invalide (ex: email@exemple.com)');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const clientData = {
      type,
      nom,
      email: email || null,
      telephone: telephone || null,
      adresse: adresse || null,
      vat_enabled: vatEnabled,
    };

    const { data: { user } } = await supabase.auth.getUser();
    let savedClientId = client?.id;
    let savedClient: Client | null = null;

    if (isEditing && client) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', client.id);

      if (error) {
        setError('Erreur lors de la mise à jour');
        setLoading(false);
        return;
      }
      savedClientId = client.id;
      savedClient = { ...client, ...clientData };
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
        setLoading(false);
        return;
      }
      savedClientId = data.id;
      savedClient = data as Client;
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
            entity_id: savedClientId,
            value_text: value || null,
          },
          { onConflict: 'field_id,entity_type,entity_id' }
        );
      }
    }

    // Call onSuccess callback if provided, otherwise navigate
    if (onSuccess && savedClient) {
      onSuccess(savedClient);
    } else {
      router.push('/clients');
      router.refresh();
    }
  };

  return (
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
        placeholder={type === 'entreprise' ? 'Nom de l\'entreprise' : 'Nom complet'}
        required
      />

      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => handleEmailChange(e.target.value)}
        placeholder="email@exemple.com"
        error={emailError}
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

      {/* VAT toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="vat_enabled"
          checked={vatEnabled}
          onChange={(e) => setVatEnabled(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="vat_enabled" className="text-sm text-gray-700">
          Client soumis à la TVA (appliquée par défaut sur les documents)
        </label>
      </div>

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

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer' : 'Créer le client'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onCancel ? onCancel() : router.back()}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
