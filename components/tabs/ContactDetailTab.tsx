'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Badge, Button, Card } from '@/components/ui';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import type { Contact } from '@/lib/types/contacts';

function formatContactName(contact: Contact): string {
  const parts: string[] = [];
  if (contact.civilite) parts.push(contact.civilite);
  if (contact.prenom) parts.push(contact.prenom);
  parts.push(contact.nom);
  return parts.join(' ');
}

interface ContactDetailTabProps {
  contactId: string;
}

interface ClientContact {
  id: string;
  role: string | null;
  is_primary: boolean;
  handles_billing: boolean;
  handles_commercial: boolean;
  handles_ops: boolean;
  handles_management: boolean;
  client: { id: string; nom: string; type: string } | null;
}

interface DealItem {
  id: string;
  title: string;
  status: string;
  estimated_amount: number | null;
  client: { id: string; nom: string } | null;
}

interface MissionItem {
  id: string;
  title: string;
  status: string;
  client: { id: string; nom: string } | null;
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

export function ContactDetailTab({ contactId }: ContactDetailTabProps) {
  const { openTab, closeTab, tabs, activeTabId, updateTabTitle } = useTabsStore();
  const [contact, setContact] = useState<Contact | null>(null);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('infos');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  async function fetchContact() {
    const supabase = createClient();

    // Fetch contact with client links
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select(`
        *,
        client_links:client_contacts(
          id,
          role,
          is_primary,
          handles_billing,
          handles_commercial,
          handles_ops,
          handles_management,
          preferred_channel,
          client:clients(id, nom, type)
        )
      `)
      .eq('id', contactId)
      .single();

    if (contactError || !contactData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setContact(contactData);

    // Convert client_links
    const links = contactData.client_links;
    if (links) {
      const clientContactsList = (Array.isArray(links) ? links : [links]) as ClientContact[];
      setClientContacts(clientContactsList);
    }

    // Update tab title
    const displayName = formatContactName(contactData);
    updateTabTitle(
      useTabsStore.getState().tabs.find((t) => t.entityId === contactId)?.id || '',
      displayName
    );

    // Fetch deals linked to this contact
    const { data: dealContacts } = await supabase
      .from('deal_contacts')
      .select(`
        deal:deals(
          id,
          title,
          status,
          estimated_amount,
          client:clients(id, nom)
        )
      `)
      .eq('contact_id', contactId);

    if (dealContacts) {
      const dealsList = dealContacts
        .map((dc) => {
          // Supabase returns nested relations as arrays
          const dealData = Array.isArray(dc.deal) ? dc.deal[0] : dc.deal;
          if (!dealData) return null;
          // Handle client array from Supabase join
          const clientData = Array.isArray(dealData.client) ? dealData.client[0] : dealData.client;
          return {
            id: dealData.id,
            title: dealData.title,
            status: dealData.status,
            estimated_amount: dealData.estimated_amount,
            client: clientData || null,
          } as DealItem;
        })
        .filter((d): d is DealItem => d !== null);
      setDeals(dealsList);
    }

    // Fetch missions linked to this contact
    const { data: missionContacts } = await supabase
      .from('mission_contacts')
      .select(`
        mission:missions(
          id,
          title,
          status,
          client:clients(id, nom)
        )
      `)
      .eq('contact_id', contactId);

    if (missionContacts) {
      const missionsList = missionContacts
        .map((mc) => {
          // Supabase returns nested relations as arrays
          const missionData = Array.isArray(mc.mission) ? mc.mission[0] : mc.mission;
          if (!missionData) return null;
          // Handle client array from Supabase join
          const clientData = Array.isArray(missionData.client) ? missionData.client[0] : missionData.client;
          return {
            id: missionData.id,
            title: missionData.title,
            status: missionData.status,
            client: clientData || null,
          } as MissionItem;
        })
        .filter((m): m is MissionItem => m !== null);
      setMissions(missionsList);
    }

    setLoading(false);
  }

  const handleBackToContacts = () => {
    openTab({ type: 'contacts', path: '/contacts', title: 'Contacts' }, true);
  };

  const handleClientClick = (client: { id: string; nom: string }) => {
    openTab({
      type: 'client',
      path: `/clients/${client.id}`,
      title: client.nom,
      entityId: client.id,
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
      type: 'edit-contact',
      path: `/contacts/${contactId}/edit`,
      title: 'Modifier le contact',
      entityId: contactId,
    }, true);
  };

  const handleDeleteContact = async () => {
    if (!contact) return;

    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', contact.id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting contact:', error);
      setDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }

    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (currentTab) {
      closeTab(currentTab.id);
    }
    openTab({ type: 'contacts', path: '/contacts', title: 'Contacts' }, true);
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
        <p className="text-lg mb-4">Contact non trouvé</p>
        <button onClick={handleBackToContacts} className="text-blue-600 hover:text-blue-700">
          Retour aux contacts
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
          <button onClick={handleBackToContacts} className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux contacts
          </button>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contact ? formatContactName(contact) : ''}</h1>
              {(contact?.email || contact?.telephone) && (
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  {contact?.email && <span>{contact.email}</span>}
                  {contact?.telephone && <span>{contact.telephone}</span>}
                </div>
              )}
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
            {/* Informations personnelles */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
                <div className="grid grid-cols-2 gap-4">
                  {contact?.civilite && (
                    <div>
                      <div className="text-sm text-gray-500">Civilité</div>
                      <div className="font-medium text-gray-900">{contact.civilite}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-500">Nom</div>
                    <div className="font-medium text-gray-900">{contact?.nom}</div>
                  </div>
                  {contact?.prenom && (
                    <div>
                      <div className="text-sm text-gray-500">Prénom</div>
                      <div className="font-medium text-gray-900">{contact.prenom}</div>
                    </div>
                  )}
                  {contact?.email && (
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium text-gray-900">{contact.email}</div>
                    </div>
                  )}
                  {contact?.telephone && (
                    <div>
                      <div className="text-sm text-gray-500">Téléphone</div>
                      <div className="font-medium text-gray-900">{contact.telephone}</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Clients liés */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Clients liés</h2>
                {clientContacts.length > 0 ? (
                  <div className="space-y-3">
                    {clientContacts.map((cc) => {
                      const client = cc.client;
                      if (!client) return null;

                      const flags: string[] = [];
                      if (cc.is_primary) flags.push('Principal');
                      if (cc.handles_billing) flags.push('Facturation');
                      if (cc.handles_commercial) flags.push('Commercial');
                      if (cc.handles_ops) flags.push('Opérations');
                      if (cc.handles_management) flags.push('Direction');

                      return (
                        <button
                          key={cc.id}
                          onClick={() => handleClientClick(client)}
                          className="w-full block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{client.nom}</span>
                                <Badge variant={client.type === 'entreprise' ? 'blue' : 'gray'}>
                                  {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                                </Badge>
                              </div>
                              {cc.role && (
                                <p className="text-sm text-gray-500 mt-1">{cc.role}</p>
                              )}
                            </div>
                            {flags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {flags.map((flag) => (
                                  <span key={flag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
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
                  <p className="text-sm text-gray-500">Ce contact n'est lié à aucun client</p>
                )}
              </div>
            </Card>

            {/* Zone de danger */}
            <Card className="border-red-200">
              <div className="p-6">
                <h2 className="text-lg font-medium text-red-600 mb-2">Zone de danger</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Le contact sera envoyé dans la corbeille. Vous pourrez le restaurer pendant 30 jours.
                </p>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer ce contact
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
                      {deal.client && (
                        <p className="text-sm text-gray-500 mt-1">{deal.client.nom}</p>
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
                <p>Aucun deal lié à ce contact</p>
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
                      {mission.client && (
                        <p className="text-sm text-gray-500 mt-1">{mission.client.nom}</p>
                      )}
                    </div>
                    <Badge variant={statusVariants[mission.status] || 'gray'}>
                      {statusLabels[mission.status] || mission.status}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Aucune mission liée à ce contact</p>
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
                Êtes-vous sûr de vouloir supprimer le contact{' '}
                <strong>{contact ? formatContactName(contact) : ''}</strong> ?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  Annuler
                </Button>
                <Button variant="danger" onClick={handleDeleteContact} loading={deleting}>
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal creation todo */}
      {contact && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          entityType="contact"
          entityId={contact.id}
          entityName={formatContactName(contact)}
        />
      )}
    </div>
  );
}
