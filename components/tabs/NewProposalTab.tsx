'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Checkbox } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { ProposalTemplate } from '@/lib/types/proposals';

// ============================================================================
// Types
// ============================================================================

interface Deal {
  id: string;
  title: string;
  status: string;
  client_id: string | null;
  client?: {
    id: string;
    nom: string;
    type: string;
  } | null;
}

interface Client {
  id: string;
  nom: string;
  type: string;
  email?: string;
  telephone?: string;
}

interface Contact {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
}

interface ClientContact {
  contact_id: string;
  contact: Contact;
  role: string | null;
  is_primary: boolean;
}

type WizardPage = 1 | 2;

interface NewProposalTabProps {
  dealId?: string;
}

// ============================================================================
// Component
// ============================================================================

export function NewProposalTab({ dealId: initialDealId }: NewProposalTabProps = {}) {
  const { openTab, closeTab, activeTabId } = useTabsStore();

  // Wizard state
  const [currentPage, setCurrentPage] = useState<WizardPage>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Data lists
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);

  // Page 1 selections
  const [selectedDealId, setSelectedDealId] = useState(initialDealId || '');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Page 2 selections
  const [creationMode, setCreationMode] = useState<'template' | 'blank' | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Inline forms state
  const [showQuickDeal, setShowQuickDeal] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [quickDealTitle, setQuickDealTitle] = useState('');
  const [quickClientData, setQuickClientData] = useState({ nom: '', type: 'entreprise', email: '', telephone: '' });
  const [quickContactData, setQuickContactData] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [savingQuickDeal, setSavingQuickDeal] = useState(false);
  const [savingQuickClient, setSavingQuickClient] = useState(false);
  const [savingQuickContact, setSavingQuickContact] = useState(false);

  // ============================================================================
  // Load initial data
  // ============================================================================

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [dealsRes, clientsRes, templatesRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/clients'),
          fetch('/api/proposals/templates'),
        ]);

        const [dealsData, clientsData, templatesData] = await Promise.all([
          dealsRes.json(),
          clientsRes.json(),
          templatesRes.json(),
        ]);

        const activeDeals = (dealsData.deals || []).filter(
          (d: Deal) => !['lost', 'archived'].includes(d.status)
        );
        setDeals(activeDeals);
        setClients(clientsData.data || []);
        setTemplates(templatesData.data || []);

        // Pré-sélectionner le deal initial
        if (initialDealId) {
          const deal = activeDeals.find((d: Deal) => d.id === initialDealId);
          if (deal) {
            setSelectedDeal(deal);
            setSelectedDealId(deal.id);
            if (deal.client_id && deal.client) {
              setSelectedClientId(deal.client_id);
              setSelectedClient(deal.client);
            }
          }
        }
      } catch {
        setError('Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [initialDealId]);

  // ============================================================================
  // Load client contacts when client changes
  // ============================================================================

  useEffect(() => {
    if (!selectedClientId) {
      setClientContacts([]);
      setSelectedContactIds([]);
      return;
    }

    const loadClientContacts = async () => {
      try {
        const res = await fetch(`/api/clients/${selectedClientId}/contacts`);
        const data = await res.json();
        const contacts = data.data || [];
        setClientContacts(contacts);
        // Tous cochés par défaut
        setSelectedContactIds(contacts.map((cc: ClientContact) => cc.contact_id));
      } catch {
        console.error('Erreur chargement contacts');
      }
    };

    loadClientContacts();
  }, [selectedClientId]);

  // ============================================================================
  // Handlers - Deal selection
  // ============================================================================

  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId);
    const deal = deals.find((d) => d.id === dealId);
    setSelectedDeal(deal || null);

    // Si le deal a un client, le sélectionner automatiquement
    if (deal?.client_id && deal.client) {
      setSelectedClientId(deal.client_id);
      setSelectedClient(deal.client);
    } else {
      setSelectedClientId('');
      setSelectedClient(null);
    }
  };

  const handleCreateQuickDeal = async () => {
    if (!quickDealTitle.trim()) return;

    setSavingQuickDeal(true);
    try {
      // On crée un deal sans client - le client sera ajouté après
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickDealTitle.trim(),
          client_id: selectedClientId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur création deal');
        return;
      }

      const newDeal = data.deal;
      setDeals((prev) => [newDeal, ...prev]);
      setSelectedDealId(newDeal.id);
      setSelectedDeal(newDeal);
      setShowQuickDeal(false);
      setQuickDealTitle('');
    } catch {
      setError('Erreur création deal');
    } finally {
      setSavingQuickDeal(false);
    }
  };

  // ============================================================================
  // Handlers - Client selection
  // ============================================================================

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    setSelectedClient(client || null);

    // Si un deal est sélectionné et n'a pas de client, l'associer
    if (selectedDealId && clientId) {
      await fetch(`/api/deals/${selectedDealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      // Mettre à jour le deal local
      setDeals((prev) =>
        prev.map((d) =>
          d.id === selectedDealId
            ? { ...d, client_id: clientId, client: client || undefined }
            : d
        )
      );
      if (selectedDeal) {
        setSelectedDeal({ ...selectedDeal, client_id: clientId, client: client || undefined });
      }
    }
  };

  const handleCreateQuickClient = async () => {
    if (!quickClientData.nom.trim()) return;

    setSavingQuickClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: quickClientData.nom.trim(),
          type: quickClientData.type,
          email: quickClientData.email.trim() || undefined,
          telephone: quickClientData.telephone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur création client');
        return;
      }

      const newClient = data.data;
      setClients((prev) => [newClient, ...prev]);
      await handleClientChange(newClient.id);
      setShowQuickClient(false);
      setQuickClientData({ nom: '', type: 'entreprise', email: '', telephone: '' });
    } catch {
      setError('Erreur création client');
    } finally {
      setSavingQuickClient(false);
    }
  };

  // ============================================================================
  // Handlers - Contact management
  // ============================================================================

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleCreateQuickContact = async () => {
    if (!quickContactData.nom.trim()) return;

    setSavingQuickContact(true);
    try {
      // Créer le contact
      const contactRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: quickContactData.nom.trim(),
          prenom: quickContactData.prenom.trim() || undefined,
          email: quickContactData.email.trim() || undefined,
          telephone: quickContactData.telephone.trim() || undefined,
        }),
      });

      const contactData = await contactRes.json();
      if (!contactRes.ok) {
        setError(contactData.error || 'Erreur création contact');
        return;
      }

      const newContact = contactData.data;

      // Lier au client
      if (selectedClientId) {
        await fetch(`/api/clients/${selectedClientId}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: newContact.id }),
        });
      }

      // Ajouter à la liste et sélectionner
      const newClientContact: ClientContact = {
        contact_id: newContact.id,
        contact: newContact,
        role: null,
        is_primary: clientContacts.length === 0,
      };
      setClientContacts((prev) => [...prev, newClientContact]);
      setSelectedContactIds((prev) => [...prev, newContact.id]);
      setShowQuickContact(false);
      setQuickContactData({ nom: '', prenom: '', email: '', telephone: '' });
    } catch {
      setError('Erreur création contact');
    } finally {
      setSavingQuickContact(false);
    }
  };

  // ============================================================================
  // Navigation
  // ============================================================================

  const canGoToPage2 = selectedDealId && selectedClientId;

  const handleNextPage = () => {
    if (canGoToPage2) {
      setCurrentPage(2);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage(1);
  };

  const handleBack = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  // ============================================================================
  // Create proposal
  // ============================================================================

  const handleCreate = async () => {
    if (!selectedDealId || !selectedClientId) {
      setError('Deal et client requis');
      return;
    }

    if (!creationMode) {
      setError('Choisissez un mode de création');
      return;
    }

    if (creationMode === 'template' && !selectedTemplateId) {
      setError('Sélectionnez une template');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Créer la proposition
      const res = await fetch('/api/proposals/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: selectedDealId,
          client_id: selectedClientId,
          title: selectedDeal?.title || 'Nouvelle proposition',
          template_id: creationMode === 'template' ? selectedTemplateId : null,
          contact_ids: selectedContactIds,
          blank: creationMode === 'blank',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur de création');
        return;
      }

      const proposal = data.data;

      // Fermer et ouvrir l'éditeur
      if (activeTabId) {
        closeTab(activeTabId);
      }

      openTab({
        type: 'edit-proposal',
        path: `/proposals/${proposal.id}/edit`,
        title: `Éditer: ${proposal.title}`,
        entityId: proposal.id,
      }, true);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsCreating(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle proposition</h1>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${currentPage === 1 ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentPage === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}>
              {currentPage === 1 ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium">Deal & Contacts</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-2 ${currentPage === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentPage === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Démarrage</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ================================================================== */}
        {/* PAGE 1: Deal / Client / Contacts */}
        {/* ================================================================== */}
        {currentPage === 1 && (
          <div className="space-y-6">
            {/* Section Deal */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Deal</h2>

                {!showQuickDeal ? (
                  <>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          label="Sélectionner un deal"
                          value={selectedDealId}
                          onChange={(e) => handleDealChange(e.target.value)}
                          options={[
                            { value: '', label: 'Choisir un deal...' },
                            ...deals.map((d) => ({
                              value: d.id,
                              label: `${d.title}${d.client?.nom ? ` (${d.client.nom})` : ''}`,
                            })),
                          ]}
                        />
                      </div>
                      <Button variant="outline" onClick={() => setShowQuickDeal(true)}>
                        + Créer
                      </Button>
                    </div>
                    {selectedDeal && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-green-800 font-medium">{selectedDeal.title}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Créer un deal rapide</p>
                    <Input
                      label="Titre du deal"
                      value={quickDealTitle}
                      onChange={(e) => setQuickDealTitle(e.target.value)}
                      placeholder="Ex: Refonte site web"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateQuickDeal} loading={savingQuickDeal}>
                        Créer
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setShowQuickDeal(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Section Client */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Client</h2>

                {selectedDeal?.client ? (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Client du deal :</span> {selectedDeal.client.nom}
                      <span className="text-blue-600 ml-2">({selectedDeal.client.type})</span>
                    </p>
                  </div>
                ) : (
                  <>
                    {!showQuickClient ? (
                      <>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select
                              label="Sélectionner un client"
                              value={selectedClientId}
                              onChange={(e) => handleClientChange(e.target.value)}
                              options={[
                                { value: '', label: 'Choisir un client...' },
                                ...clients.map((c) => ({
                                  value: c.id,
                                  label: `${c.nom} (${c.type})`,
                                })),
                              ]}
                            />
                          </div>
                          <Button variant="outline" onClick={() => setShowQuickClient(true)}>
                            + Créer
                          </Button>
                        </div>
                        {selectedClient && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                            <p className="text-sm text-green-800 font-medium">{selectedClient.nom}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Créer un client rapide</p>
                        <Input
                          label="Nom"
                          value={quickClientData.nom}
                          onChange={(e) => setQuickClientData({ ...quickClientData, nom: e.target.value })}
                          placeholder="Nom du client"
                        />
                        <Select
                          label="Type"
                          value={quickClientData.type}
                          onChange={(e) => setQuickClientData({ ...quickClientData, type: e.target.value })}
                          options={[
                            { value: 'entreprise', label: 'Entreprise' },
                            { value: 'particulier', label: 'Particulier' },
                          ]}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Email (optionnel)"
                            type="email"
                            value={quickClientData.email}
                            onChange={(e) => setQuickClientData({ ...quickClientData, email: e.target.value })}
                          />
                          <Input
                            label="Téléphone (optionnel)"
                            value={quickClientData.telephone}
                            onChange={(e) => setQuickClientData({ ...quickClientData, telephone: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleCreateQuickClient} loading={savingQuickClient}>
                            Créer
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setShowQuickClient(false)}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Section Contacts */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Contacts</h2>

                {!selectedClientId ? (
                  <p className="text-sm text-gray-500">Sélectionnez d'abord un client.</p>
                ) : clientContacts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">Aucun contact pour ce client.</p>
                    {!showQuickContact && (
                      <Button variant="secondary" onClick={() => setShowQuickContact(true)}>
                        + Créer un contact
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4 max-h-48 overflow-auto">
                      {clientContacts.map((cc) => (
                        <label
                          key={cc.contact_id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedContactIds.includes(cc.contact_id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Checkbox
                            label=""
                            checked={selectedContactIds.includes(cc.contact_id)}
                            onChange={() => toggleContact(cc.contact_id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {cc.contact.prenom ? `${cc.contact.prenom} ${cc.contact.nom}` : cc.contact.nom}
                              </span>
                              {cc.is_primary && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                  Principal
                                </span>
                              )}
                            </div>
                            {cc.contact.email && (
                              <p className="text-sm text-gray-500">{cc.contact.email}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    {!showQuickContact && (
                      <Button size="sm" variant="outline" onClick={() => setShowQuickContact(true)}>
                        + Ajouter un contact
                      </Button>
                    )}
                  </>
                )}

                {/* Warning si aucun contact sélectionné */}
                {selectedClientId && selectedContactIds.length === 0 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                      Aucun contact sélectionné pour l'instant.
                    </p>
                  </div>
                )}

                {/* Quick contact form */}
                {showQuickContact && (
                  <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Ajouter un contact</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Prénom"
                        value={quickContactData.prenom}
                        onChange={(e) => setQuickContactData({ ...quickContactData, prenom: e.target.value })}
                      />
                      <Input
                        label="Nom"
                        value={quickContactData.nom}
                        onChange={(e) => setQuickContactData({ ...quickContactData, nom: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Email"
                        type="email"
                        value={quickContactData.email}
                        onChange={(e) => setQuickContactData({ ...quickContactData, email: e.target.value })}
                      />
                      <Input
                        label="Téléphone"
                        value={quickContactData.telephone}
                        onChange={(e) => setQuickContactData({ ...quickContactData, telephone: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateQuickContact} loading={savingQuickContact}>
                        Ajouter
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setShowQuickContact(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Navigation Page 1 */}
            <div className="flex justify-end">
              <Button onClick={handleNextPage} disabled={!canGoToPage2}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* PAGE 2: Mode de création */}
        {/* ================================================================== */}
        {currentPage === 2 && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Mode de création</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Choisissez comment démarrer votre proposition.
                </p>

                <div className="space-y-4">
                  {/* Option: Template */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      creationMode === 'template'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setCreationMode('template')}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        creationMode === 'template' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {creationMode === 'template' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">Démarrer depuis une template</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Utilisez une structure prédéfinie avec des sections existantes.
                    </p>
                  </div>

                  {/* Template selection */}
                  {creationMode === 'template' && (
                    <div className="ml-8 space-y-2">
                      {templates.length === 0 ? (
                        <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                          Aucune template disponible.
                        </p>
                      ) : (
                        templates.map((template) => (
                          <label
                            key={template.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedTemplateId === template.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="template"
                              value={template.id}
                              checked={selectedTemplateId === template.id}
                              onChange={(e) => setSelectedTemplateId(e.target.value)}
                              className="sr-only"
                            />
                            <div
                              className="w-4 h-4 rounded-full border-2"
                              style={{
                                borderColor: selectedTemplateId === template.id ? '#3B82F6' : '#D1D5DB',
                                backgroundColor: selectedTemplateId === template.id ? '#3B82F6' : 'transparent',
                              }}
                            />
                            <div>
                              <span className="font-medium text-gray-900">{template.name}</span>
                              {template.description && (
                                <p className="text-sm text-gray-500">{template.description}</p>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  {/* Option: Blank */}
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      creationMode === 'blank'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setCreationMode('blank');
                      setSelectedTemplateId('');
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        creationMode === 'blank' ? 'border-blue-500' : 'border-gray-300'
                      }`}>
                        {creationMode === 'blank' && (
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">Démarrer depuis une page blanche</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Structure minimale : 1 page, 1 section, 1 bloc texte vide.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Résumé */}
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Résumé</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Deal :</span>
                    <span className="text-gray-900 font-medium">{selectedDeal?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Client :</span>
                    <span className="text-gray-900 font-medium">{selectedClient?.nom || selectedDeal?.client?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contacts :</span>
                    <span className="text-gray-900 font-medium">{selectedContactIds.length} sélectionné(s)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Navigation Page 2 */}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={handlePrevPage}>
                Précédent
              </Button>
              <Button
                onClick={handleCreate}
                loading={isCreating}
                disabled={!creationMode || (creationMode === 'template' && !selectedTemplateId)}
              >
                Créer la proposition
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
