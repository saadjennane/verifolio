'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Badge, Button, Card } from '@/components/ui';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { Client } from '@/lib/supabase/types';

interface ClientDetailTabProps {
  clientId: string;
}

interface Balance {
  total_facture: number;
  total_paye: number;
  total_restant: number;
}

interface ClientContact {
  id: string;
  role: string | null;
  is_primary: boolean;
  handles_billing: boolean;
  handles_commercial: boolean;
  handles_ops: boolean;
  handles_management: boolean;
  contact: { id: string; nom: string; prenom: string | null; email: string | null; telephone: string | null } | null;
}

interface DealItem {
  id: string;
  title: string;
  status: string;
  estimated_amount: number | null;
}

interface MissionItem {
  id: string;
  title: string;
  status: string;
}

type TabId = 'infos' | 'deals' | 'missions';

const statusLabels: Record<string, string> = {
  // Deal statuses
  new: 'Nouveau',
  draft: 'Brouillon',
  sent: 'Envoyé',
  won: 'Gagné',
  lost: 'Perdu',
  archived: 'Archivé',
  // Mission statuses
  in_progress: 'En cours',
  delivered: 'Livrée',
  to_invoice: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  closed: 'Fermée',
  cancelled: 'Annulée',
};

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  // Deal statuses
  new: 'blue',
  draft: 'gray',
  sent: 'yellow',
  won: 'green',
  lost: 'red',
  archived: 'gray',
  // Mission statuses
  in_progress: 'blue',
  delivered: 'green',
  to_invoice: 'yellow',
  invoiced: 'yellow',
  paid: 'green',
  closed: 'gray',
  cancelled: 'red',
};

export function ClientDetailTab({ clientId }: ClientDetailTabProps) {
  const { openTab, closeTab, tabs, activeTabId, updateTabTitle } = useTabsStore();
  const [client, setClient] = useState<Client | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('infos');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  async function fetchClient() {
    const supabase = createClient();

    const [clientRes, balanceRes, currencyRes, contactsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('client_balances').select('*').eq('client_id', clientId).maybeSingle(),
      fetch('/api/settings/currency').then(r => r.json()),
      supabase
        .from('client_contacts')
        .select(`
          *,
          contact:contacts(id, nom, prenom, email, telephone)
        `)
        .eq('client_id', clientId),
    ]);

    if (clientRes.error || !clientRes.data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setClient(clientRes.data);
    if (balanceRes.data) {
      setBalance(balanceRes.data);
    }
    if (currencyRes.data?.currency) {
      setCurrency(currencyRes.data.currency);
    }
    if (contactsRes.data) {
      setClientContacts(contactsRes.data);
    }

    // Update tab title
    updateTabTitle(
      useTabsStore.getState().tabs.find(t => t.entityId === clientId)?.id || '',
      clientRes.data.nom
    );

    // Fetch deals for this client
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id, title, status, estimated_amount')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dealsData) {
      setDeals(dealsData);
    }

    // Fetch missions for this client
    const { data: missionsData } = await supabase
      .from('missions')
      .select('id, title, status')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (missionsData) {
      setMissions(missionsData);
    }

    setLoading(false);
  }

  const handleBackToClients = () => {
    openTab({ type: 'clients', path: '/clients', title: 'Clients' }, true);
  };

  const handleContactClick = (contact: { id: string; nom: string; prenom: string | null }) => {
    const displayName = contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom;
    openTab({
      type: 'contact',
      path: `/contacts/${contact.id}`,
      title: displayName,
      entityId: contact.id,
    }, true);
  };

  const handleDealClick = (deal: DealItem) => {
    openTab({
      type: 'deal',
      path: `/deals/${deal.id}`,
      title: deal.title,
      entityId: deal.id,
    }, true);
  };

  const handleMissionClick = (mission: MissionItem) => {
    openTab({
      type: 'mission',
      path: `/missions/${mission.id}`,
      title: mission.title,
      entityId: mission.id,
    }, true);
  };

  const handleEdit = () => {
    openTab({
      type: 'edit-client',
      path: `/clients/${clientId}/edit`,
      title: 'Modifier le client',
      entityId: clientId,
    }, true);
  };

  const handleNewContact = () => {
    openTab(
      { type: 'new-contact', path: '/contacts/new', title: 'Nouveau contact' },
      true
    );
  };

  const handleDeleteClient = async () => {
    if (!client) return;

    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', client.id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting client:', error);
      setDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }

    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (currentTab) {
      closeTab(currentTab.id);
    }
    openTab({ type: 'clients', path: '/clients', title: 'Clients' }, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg mb-4">Client non trouvé</p>
        <button onClick={handleBackToClients} className="text-blue-600 hover:text-blue-700">
          Retour aux clients
        </button>
      </div>
    );
  }

  const tabItems: { id: TabId; label: string; count?: number }[] = [
    { id: 'infos', label: 'Informations' },
    { id: 'deals', label: 'Deals', count: deals.length },
    { id: 'missions', label: 'Missions', count: missions.length },
  ];

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={handleBackToClients} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux clients
          </button>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client?.nom}</h1>
              <Badge variant={client?.type === 'entreprise' ? 'blue' : 'gray'}>
                {client?.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Créer un todo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Todo
              </button>
              <Button onClick={handleEdit}>Modifier</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'infos' && (
          <div className="space-y-6">
            {/* Solde client */}
            {balance && (
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Solde client</h2>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {Number(balance.total_facture).toFixed(2)} {getCurrencySymbol(currency)}
                      </p>
                      <p className="text-xs text-gray-500">Facturé</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-600">
                        {Number(balance.total_paye).toFixed(2)} {getCurrencySymbol(currency)}
                      </p>
                      <p className="text-xs text-gray-500">Payé</p>
                    </div>
                    <div>
                      <p
                        className={`text-lg font-semibold ${
                          Number(balance.total_restant) > 0 ? 'text-orange-600' : 'text-gray-400'
                        }`}
                      >
                        {Number(balance.total_restant).toFixed(2)} {getCurrencySymbol(currency)}
                      </p>
                      <p className="text-xs text-gray-500">Restant</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Informations client */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Nom</div>
                    <div className="font-medium text-gray-900">{client?.nom}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Type</div>
                    <div className="font-medium text-gray-900">
                      {client?.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                    </div>
                  </div>
                  {client?.email && (
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">{client.email}</div>
                    </div>
                  )}
                  {client?.telephone && (
                    <div>
                      <div className="text-sm text-gray-500">Téléphone</div>
                      <div className="font-medium text-gray-900">{client.telephone}</div>
                    </div>
                  )}
                  {client?.adresse && (
                    <div className="col-span-2">
                      <div className="text-sm text-gray-500">Adresse</div>
                      <div className="font-medium text-gray-900">{client.adresse}</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Contacts liés */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Contacts liés</h2>
                  <button
                    onClick={handleNewContact}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Ajouter
                  </button>
                </div>
                {clientContacts.length > 0 ? (
                  <div className="space-y-3">
                    {clientContacts.map((cc) => {
                      const contact = cc.contact;
                      if (!contact) return null;

                      const flags: string[] = [];
                      if (cc.is_primary) flags.push('Principal');
                      if (cc.handles_billing) flags.push('Facturation');
                      if (cc.handles_commercial) flags.push('Commercial');
                      if (cc.handles_ops) flags.push('Opérations');
                      if (cc.handles_management) flags.push('Direction');

                      const displayName = contact.prenom
                        ? `${contact.prenom} ${contact.nom}`
                        : contact.nom;

                      return (
                        <button
                          key={cc.id}
                          onClick={() => handleContactClick(contact)}
                          className="w-full block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{displayName}</span>
                                {cc.role && (
                                  <span className="text-xs text-gray-500">({cc.role})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                {contact.email && <span>{contact.email}</span>}
                                {contact.telephone && <span>{contact.telephone}</span>}
                              </div>
                            </div>
                            {flags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {flags.map((flag) => (
                                  <span
                                    key={flag}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                                  >
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun contact lié à ce client</p>
                )}
              </div>
            </Card>

            {/* Zone de danger */}
            <Card className="border-red-200">
              <div className="p-6">
                <h2 className="text-lg font-medium text-red-600 mb-2">Zone de danger</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Le client sera envoyé dans la corbeille. Vous pourrez le restaurer pendant 30 jours.
                </p>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer ce client
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="space-y-3">
            {deals.length > 0 ? (
              deals.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => handleDealClick(deal)}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{deal.title}</div>
                      {deal.estimated_amount && (
                        <p className="text-sm text-gray-500 mt-1">
                          {Number(deal.estimated_amount).toFixed(2)} {getCurrencySymbol(currency)}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusVariants[deal.status] || 'gray'}>
                      {statusLabels[deal.status] || deal.status}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Aucun deal pour ce client</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-3">
            {missions.length > 0 ? (
              missions.map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => handleMissionClick(mission)}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{mission.title}</div>
                    </div>
                    <Badge variant={statusVariants[mission.status] || 'gray'}>
                      {statusLabels[mission.status] || mission.status}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Aucune mission pour ce client</p>
              </div>
            )}
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-gray-500 mb-4">
                Êtes-vous sûr de vouloir supprimer le client{' '}
                <strong>{client?.nom}</strong> ?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  Annuler
                </Button>
                <Button variant="danger" onClick={handleDeleteClient} loading={deleting}>
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal creation todo */}
      {client && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          entityType="client"
          entityId={client.id}
          entityName={client.nom}
        />
      )}
    </div>
  );
}
