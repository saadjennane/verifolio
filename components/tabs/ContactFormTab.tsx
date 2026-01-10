'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input, PhoneInput, Textarea, Select } from '@/components/ui';
import { ClientLinkCard, type ClientLinkData } from '@/components/contacts/ClientLinkCard';
import type { Contact, Civilite } from '@/lib/types/contacts';

interface ContactFormTabProps {
  contactId?: string;
}

interface Client {
  id: string;
  nom: string;
  type: string;
}

export function ContactFormTab({ contactId }: ContactFormTabProps) {
  const { openTab, closeTab, tabs, activeTabId } = useTabsStore();
  const isEditing = !!contactId;

  // Contact basic info
  const [contact, setContact] = useState<Contact | null>(null);
  const [civilite, setCivilite] = useState<Civilite | ''>('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');

  // Client links
  const [clientLinks, setClientLinks] = useState<ClientLinkData[]>([]);
  const [originalLinks, setOriginalLinks] = useState<ClientLinkData[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Inline client creation
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientNom, setNewClientNom] = useState('');
  const [newClientType, setNewClientType] = useState<'entreprise' | 'particulier'>('entreprise');
  const [creatingClient, setCreatingClient] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load clients and role suggestions
      const [clientsRes, rolesRes] = await Promise.all([
        supabase.from('clients').select('id, nom, type').order('nom'),
        supabase.from('client_contacts').select('role').not('role', 'is', null),
      ]);

      if (clientsRes.data) {
        setAvailableClients(clientsRes.data);
      }

      if (rolesRes.data) {
        const uniqueRoles = [...new Set(rolesRes.data.map((r) => r.role).filter(Boolean))] as string[];
        setRoleSuggestions(uniqueRoles);
      }

      // If editing, load contact and its links
      if (contactId) {
        const [contactRes, linksRes] = await Promise.all([
          supabase.from('contacts').select('*').eq('id', contactId).single(),
          supabase
            .from('client_contacts')
            .select(`
              id,
              client_id,
              role,
              is_primary,
              handles_billing,
              handles_commercial,
              handles_ops,
              handles_management,
              client:clients(id, nom)
            `)
            .eq('contact_id', contactId),
        ]);

        if (contactRes.error || !contactRes.data) {
          setError('Contact non trouve');
          setLoading(false);
          return;
        }

        setContact(contactRes.data);
        setCivilite(contactRes.data.civilite || '');
        setPrenom(contactRes.data.prenom || '');
        setNom(contactRes.data.nom);
        setEmail(contactRes.data.email || '');
        setTelephone(contactRes.data.telephone || '');
        setBirthday(contactRes.data.birthday || '');
        setNotes(contactRes.data.notes || '');

        if (linksRes.data) {
          const links: ClientLinkData[] = linksRes.data.map((l) => ({
            id: l.id,
            clientId: l.client_id,
            clientName: (l.client as unknown as { id: string; nom: string } | null)?.nom || 'Client inconnu',
            role: l.role || '',
            isPrimary: l.is_primary || false,
            handles_billing: l.handles_billing || false,
            handles_commercial: l.handles_commercial || false,
            handles_ops: l.handles_ops || false,
            handles_management: l.handles_management || false,
          }));
          setClientLinks(links);
          setOriginalLinks(links);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [contactId]);

  // Get clients not already linked
  const unlinkedClients = availableClients.filter(
    (c) => !clientLinks.some((link) => link.clientId === c.id)
  );

  const handleAddClientLink = () => {
    if (!selectedClientId) return;

    const client = availableClients.find((c) => c.id === selectedClientId);
    if (!client) return;

    const newLink: ClientLinkData = {
      clientId: client.id,
      clientName: client.nom,
      role: '',
      isPrimary: clientLinks.length === 0, // First link is primary by default
      handles_billing: false,
      handles_commercial: false,
      handles_ops: false,
      handles_management: false,
    };

    setClientLinks([...clientLinks, newLink]);
    setSelectedClientId('');
    setShowClientSelector(false);
  };

  const handleUpdateLink = (index: number, updatedLink: ClientLinkData) => {
    const newLinks = [...clientLinks];
    newLinks[index] = updatedLink;
    setClientLinks(newLinks);
  };

  const handleRemoveLink = (index: number) => {
    setClientLinks(clientLinks.filter((_, i) => i !== index));
  };

  const handleCreateClientInline = async () => {
    if (!newClientNom.trim()) return;

    setCreatingClient(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('clients')
      .insert({
        nom: newClientNom.trim(),
        type: newClientType,
        user_id: user?.id || null,
      })
      .select()
      .single();

    if (error || !data) {
      setError('Erreur lors de la creation du client');
      setCreatingClient(false);
      return;
    }

    // Add to available clients and create link
    const newClient: Client = { id: data.id, nom: data.nom, type: data.type };
    setAvailableClients([...availableClients, newClient]);

    const newLink: ClientLinkData = {
      clientId: data.id,
      clientName: data.nom,
      role: '',
      isPrimary: clientLinks.length === 0,
      handles_billing: false,
      handles_commercial: false,
      handles_ops: false,
      handles_management: false,
    };

    setClientLinks([...clientLinks, newLink]);
    setNewClientNom('');
    setNewClientType('entreprise');
    setShowNewClientForm(false);
    setShowClientSelector(false);
    setCreatingClient(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const contactData = {
      civilite: civilite || null,
      prenom: prenom || null,
      nom,
      email: email || null,
      telephone: telephone || null,
      birthday: birthday || null,
      notes: notes || null,
    };

    let savedContactId = contactId;

    try {
      // Save contact
      if (isEditing && contact) {
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id);

        if (error) throw new Error('Erreur lors de la mise a jour du contact');
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            ...contactData,
            user_id: user?.id || null,
          })
          .select()
          .single();

        if (error || !data) throw new Error('Erreur lors de la creation du contact');
        savedContactId = data.id;
      }

      // Handle client links
      const originalIds = new Set(originalLinks.map((l) => l.id).filter(Boolean));
      const currentIds = new Set(clientLinks.map((l) => l.id).filter(Boolean));

      // Delete removed links
      const toDelete = [...originalIds].filter((id) => !currentIds.has(id));
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('client_contacts')
          .delete()
          .in('id', toDelete);
        if (error) throw new Error('Erreur lors de la suppression des liaisons');
      }

      // Insert or update links
      for (const link of clientLinks) {
        const linkData = {
          client_id: link.clientId,
          contact_id: savedContactId,
          role: link.role || null,
          is_primary: link.isPrimary,
          handles_billing: link.handles_billing,
          handles_commercial: link.handles_commercial,
          handles_ops: link.handles_ops,
          handles_management: link.handles_management,
        };

        if (link.id) {
          // Update existing
          const { error } = await supabase
            .from('client_contacts')
            .update(linkData)
            .eq('id', link.id);
          if (error) throw new Error('Erreur lors de la mise a jour de la liaison');
        } else {
          // Insert new
          const { error } = await supabase
            .from('client_contacts')
            .insert(linkData);
          if (error) throw new Error('Erreur lors de la creation de la liaison');
        }
      }

      // Close and navigate back
      const currentTab = tabs.find((t) => t.id === activeTabId);
      if (currentTab) {
        closeTab(currentTab.id);
      }
      openTab({ type: 'contacts', path: '/contacts', title: 'Contacts' }, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    openTab({ type: 'contacts', path: '/contacts', title: 'Contacts' }, true);
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
            ← Retour aux contacts
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {isEditing ? 'Modifier le contact' : 'Nouveau contact'}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic info section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informations</h2>
            <div className="space-y-4">
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

              <Input
                type="date"
                label="Date d'anniversaire"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />

              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes internes sur ce contact"
                rows={3}
              />
            </div>
          </div>

          {/* Client links section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Clients lies</h2>
              {!showClientSelector && !showNewClientForm && (
                <button
                  type="button"
                  onClick={() => setShowClientSelector(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Lier a un client
                </button>
              )}
            </div>

            {/* Client selector */}
            {showClientSelector && !showNewClientForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      options={[
                        { value: '', label: 'Selectionner un client...' },
                        ...unlinkedClients.map((c) => ({
                          value: c.id,
                          label: `${c.nom} (${c.type === 'entreprise' ? 'Entreprise' : 'Particulier'})`,
                        })),
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddClientLink}
                    disabled={!selectedClientId}
                  >
                    Ajouter
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowClientSelector(false);
                      setSelectedClientId('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(true)}
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Creer un nouveau client
                </button>
              </div>
            )}

            {/* Inline client creation form */}
            {showNewClientForm && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <p className="text-sm font-medium text-blue-800">Nouveau client</p>
                <Input
                  label="Nom du client"
                  value={newClientNom}
                  onChange={(e) => setNewClientNom(e.target.value)}
                  placeholder="Nom de l'entreprise ou du particulier"
                  required
                />
                <Select
                  label="Type"
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value as 'entreprise' | 'particulier')}
                  options={[
                    { value: 'entreprise', label: 'Entreprise' },
                    { value: 'particulier', label: 'Particulier' },
                  ]}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCreateClientInline}
                    disabled={!newClientNom.trim() || creatingClient}
                    loading={creatingClient}
                  >
                    Creer et lier
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowNewClientForm(false);
                      setNewClientNom('');
                      setNewClientType('entreprise');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Links list */}
            {clientLinks.length > 0 ? (
              <div className="space-y-3">
                {clientLinks.map((link, index) => (
                  <ClientLinkCard
                    key={link.id || `new-${index}`}
                    link={link}
                    onUpdate={(updated) => handleUpdateLink(index, updated)}
                    onRemove={() => handleRemoveLink(index)}
                    roleSuggestions={roleSuggestions}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Ce contact n&apos;est lie a aucun client
              </p>
            )}
          </div>

          {/* Error and actions */}
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" loading={saving}>
              {isEditing ? 'Enregistrer' : 'Creer le contact'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
