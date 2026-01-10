'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { ClientFormModal } from '@/components/modals/ClientFormModal';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { Client } from '@/lib/supabase/types';

interface DealFormTabProps {
  dealId?: string;
  returnToProposal?: boolean;
}

interface ClientContact {
  contact_id: string;
  contact: {
    id: string;
    nom: string;
    prenom: string | null;
    civilite: string | null;
    email: string | null;
  };
  role: string | null;
  is_primary: boolean;
  handles_billing: boolean;
  handles_commercial: boolean;
  handles_ops: boolean;
  handles_management: boolean;
}

function formatContactName(contact: ClientContact['contact']): string {
  const parts: string[] = [];
  if (contact.civilite) parts.push(contact.civilite);
  if (contact.prenom) parts.push(contact.prenom);
  parts.push(contact.nom);
  return parts.join(' ');
}

function getResponsibilityLabels(cc: ClientContact): string[] {
  const labels: string[] = [];
  if (cc.is_primary) labels.push('Principal');
  if (cc.handles_billing) labels.push('Facturation');
  if (cc.handles_commercial) labels.push('Commercial');
  if (cc.handles_ops) labels.push('Opérations');
  if (cc.handles_management) labels.push('Direction');
  return labels;
}

export function DealFormTab({ dealId, returnToProposal }: DealFormTabProps) {
  const { closeTab, openTab, activeTabId } = useTabsStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDeal, setLoadingDeal] = useState(!!dealId);
  const [showClientModal, setShowClientModal] = useState(false);
  const [currency, setCurrency] = useState('EUR');
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  const isEditMode = !!dealId;

  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    description: '',
    estimated_amount: '',
  });

  useEffect(() => {
    loadClients();
    loadCurrency();
    if (dealId) {
      loadDeal();
    }
  }, [dealId]);

  async function loadDeal() {
    if (!dealId) return;

    setLoadingDeal(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`);
      const json = await res.json();

      if (res.ok && json.deal) {
        const deal = json.deal;
        setFormData({
          title: deal.title || '',
          client_id: deal.client_id || '',
          description: deal.description || '',
          estimated_amount: deal.estimated_amount ? String(deal.estimated_amount) : '',
        });

        // Charger les contacts du client
        if (deal.client_id) {
          await loadClientContacts(deal.client_id);

          // Sélectionner les contacts déjà liés au deal
          if (deal.contacts && deal.contacts.length > 0) {
            setSelectedContactIds(new Set(deal.contacts.map((c: { contact_id: string }) => c.contact_id)));
          }
        }
      }
    } catch (error) {
      console.error('Error loading deal:', error);
    } finally {
      setLoadingDeal(false);
    }
  }

  async function loadClients() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, type, email')
        .order('nom', { ascending: true });

      if (error) {
        console.error('Error loading clients:', error);
      } else {
        setClients(data as Client[] || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function loadCurrency() {
    try {
      const res = await fetch('/api/settings/currency');
      const json = await res.json();

      if (res.ok && json.data?.currency) {
        setCurrency(json.data.currency);
      } else {
        console.error('Error loading currency:', json.error);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  }

  async function loadClientContacts(clientId: string) {
    if (!clientId) {
      setClientContacts([]);
      setSelectedContactIds(new Set());
      return;
    }

    setLoadingContacts(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('client_contacts')
        .select(`
          contact_id,
          role,
          is_primary,
          handles_billing,
          handles_commercial,
          handles_ops,
          handles_management,
          contact:contacts(id, nom, prenom, civilite, email)
        `)
        .eq('client_id', clientId);

      if (error) {
        console.error('Error loading client contacts:', error);
        return;
      }

      // Extraire le contact depuis la relation
      const contacts = (data || []).map(cc => {
        const contact = Array.isArray(cc.contact) ? cc.contact[0] : cc.contact;
        return {
          ...cc,
          contact,
        } as ClientContact;
      }).filter(cc => cc.contact);

      setClientContacts(contacts);
      // Auto-sélectionner tous les contacts
      setSelectedContactIds(new Set(contacts.map(cc => cc.contact_id)));
    } catch (error) {
      console.error('Error loading client contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  }

  function handleClientChange(clientId: string) {
    setFormData({ ...formData, client_id: clientId });
    loadClientContacts(clientId);
  }

  function toggleContact(contactId: string) {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedContactIds(newSet);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Veuillez remplir le titre');
      return;
    }

    if (!isEditMode && !formData.client_id) {
      alert('Veuillez sélectionner un client');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        // Mode édition: PATCH
        const updatePayload = {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          estimated_amount: formData.estimated_amount ? parseFloat(formData.estimated_amount) : null,
        };

        const res = await fetch(`/api/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        const json = await res.json();

        if (!res.ok) {
          console.error('Error updating deal:', json.error);
          alert(`Erreur lors de la mise à jour: ${json.error || 'Erreur inconnue'}`);
          return;
        }

        // Fermer l'onglet d'édition
        if (activeTabId) {
          closeTab(activeTabId);
        }

        // Retourner au détail du deal
        openTab({
          type: 'deal',
          path: `/deals/${dealId}`,
          title: json.deal?.title || formData.title,
          entityId: dealId,
        });
      } else {
        // Mode création: POST
        const dealPayload = {
          title: formData.title.trim(),
          client_id: formData.client_id,
          description: formData.description.trim() || undefined,
          estimated_amount: formData.estimated_amount ? parseFloat(formData.estimated_amount) : undefined,
          currency: currency,
          contacts: Array.from(selectedContactIds),
        };

        const res = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealPayload),
        });

        const json = await res.json();

        if (!res.ok || !json.deal) {
          console.error('Error creating deal:', json.error);
          alert(`Erreur lors de la création du deal: ${json.error || 'Erreur inconnue'}`);
          return;
        }

        // Fermer l'onglet de création
        if (activeTabId) {
          closeTab(activeTabId);
        }

        // Si on vient de la création de proposition, retourner à NewProposalTab avec le deal sélectionné
        if (returnToProposal) {
          openTab({
            type: 'new-proposal',
            path: `/proposals/new?dealId=${json.deal.id}`,
            title: 'Nouvelle proposition',
            entityId: json.deal.id,
          });
        } else {
          // Ouvrir l'onglet du deal créé
          openTab({
            type: 'deal',
            path: `/deals/${json.deal.id}`,
            title: json.deal.title,
            entityId: json.deal.id,
          });
        }
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      alert(isEditMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  }

  async function handleClientCreated(newClient: Client) {
    // Recharger la liste des clients
    await loadClients();
    // Sélectionner automatiquement le nouveau client et charger ses contacts
    setFormData({ ...formData, client_id: newClient.id });
    loadClientContacts(newClient.id);
  }

  if (loadingDeal) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEditMode ? 'Modifier le Deal' : 'Nouveau Deal'}
        </h1>

        <Card>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Refonte site web"
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>

            {!isEditMode && (
              <div>
                <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    id="client_id"
                    value={formData.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.nom} ({client.type})
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowClientModal(true)}
                  >
                    + Nouveau
                  </Button>
                </div>
              </div>
            )}

            {isEditMode && formData.client_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-700">
                  {clients.find(c => c.id === formData.client_id)?.nom || 'Client'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Le client ne peut pas être modifié</p>
              </div>
            )}

            {/* Section Contacts - visible uniquement si un client est sélectionné */}
            {formData.client_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contacts liés au deal ({selectedContactIds.size} sélectionné{selectedContactIds.size > 1 ? 's' : ''})
                </label>
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  </div>
                ) : clientContacts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {clientContacts.map((cc) => {
                      const isSelected = selectedContactIds.has(cc.contact_id);
                      const responsibilities = getResponsibilityLabels(cc);

                      return (
                        <label
                          key={cc.contact_id}
                          className={`flex items-start p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleContact(cc.contact_id)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="ml-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 text-sm">
                                {formatContactName(cc.contact)}
                              </span>
                              {cc.role && (
                                <span className="text-xs text-gray-500">({cc.role})</span>
                              )}
                            </div>
                            {cc.contact.email && (
                              <p className="text-xs text-gray-500 truncate">{cc.contact.email}</p>
                            )}
                            {responsibilities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {responsibilities.map((label) => (
                                  <span
                                    key={label}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">
                    Aucun contact lié à ce client.
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="estimated_amount" className="block text-sm font-medium text-gray-700 mb-2">
                Montant estimé HT ({getCurrencySymbol(currency)})
              </label>
              <input
                id="estimated_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimated_amount}
                onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                placeholder="Ex: 5000"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails du deal..."
                rows={6}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                Annuler
              </Button>
              <Button type="submit" loading={loading}>
                {isEditMode ? 'Enregistrer' : 'Créer le deal'}
              </Button>
            </div>
          </form>
        </Card>

        <ClientFormModal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          onSuccess={handleClientCreated}
        />
      </div>
    </div>
  );
}
