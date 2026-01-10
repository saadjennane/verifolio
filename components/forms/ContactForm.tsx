'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, PhoneInput, Textarea, Select } from '@/components/ui';
import type { Contact, Civilite } from '@/lib/types/contacts';

interface ContactFormProps {
  contact?: Contact;
  onSuccess?: (contact: Contact) => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function ContactForm({ contact, onSuccess, onCancel, embedded }: ContactFormProps) {
  const router = useRouter();
  const isEditing = !!contact;

  const [civilite, setCivilite] = useState<Civilite | ''>(contact?.civilite || '');
  const [prenom, setPrenom] = useState(contact?.prenom || '');
  const [nom, setNom] = useState(contact?.nom || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [telephone, setTelephone] = useState(contact?.telephone || '');
  const [notes, setNotes] = useState(contact?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const contactData = {
      civilite: civilite || null,
      prenom: prenom || null,
      nom,
      email: email || null,
      telephone: telephone || null,
      notes: notes || null,
    };

    if (isEditing && contact) {
      const { data, error: updateError } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', contact.id)
        .select()
        .single();

      if (updateError) {
        setError('Erreur lors de la mise à jour');
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess(data as Contact);
      } else {
        router.back();
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        setError('Erreur lors de la création');
        setLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess(data as Contact);
      } else {
        router.back();
      }
    }

    setLoading(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Civilité"
        value={civilite}
        onChange={(e) => setCivilite(e.target.value as Civilite | '')}
        options={[
          { value: '', label: 'Non précisé' },
          { value: 'M.', label: 'Monsieur' },
          { value: 'Mme', label: 'Madame' },
          { value: 'Mlle', label: 'Mademoiselle' },
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          placeholder="Prénom"
        />
        <Input
          label="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom de famille"
          required
        />
      </div>

      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@exemple.com"
      />

      <PhoneInput
        label="Telephone"
        value={telephone}
        onChange={setTelephone}
        defaultCountry="FR"
      />

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes internes sur ce contact"
        rows={3}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading}>
          {isEditing ? 'Enregistrer' : 'Creer le contact'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
