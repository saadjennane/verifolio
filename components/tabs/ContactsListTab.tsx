'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { Button, Badge } from '@/components/ui';
import { Checkbox } from '@/components/ui/Checkbox';
import { BulkActionBar } from '@/components/ui/BulkActionBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ClientLink {
  id: string;
  role: string | null;
  preferred_channel: 'email' | 'phone' | null;
  client: { id: string; nom: string }[] | { id: string; nom: string } | null;
}

interface Contact {
  id: string;
  civilite: 'M.' | 'Mme' | 'Mlle' | null;
  prenom: string | null;
  nom: string;
  email: string | null;
  telephone: string | null;
  client_links: ClientLink[];
}

function formatContactName(contact: Contact): string {
  const parts: string[] = [];
  if (contact.civilite) parts.push(contact.civilite);
  if (contact.prenom) parts.push(contact.prenom);
  parts.push(contact.nom);
  return parts.join(' ');
}

function getClientName(client: { id: string; nom: string }[] | { id: string; nom: string } | null): string | null {
  if (!client) return null;
  if (Array.isArray(client)) {
    return client[0]?.nom || null;
  }
  return client.nom;
}

export function ContactsListTab() {
  const { openTab } = useTabsStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const bulk = useBulkSelection({
    items: contacts,
    getItemId: (c) => c.id,
  });

  const fetchContacts = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('contacts')
      .select(`
        id,
        civilite,
        prenom,
        nom,
        email,
        telephone,
        client_links:client_contacts(
          id,
          role,
          preferred_channel,
          client:clients(id, nom)
        )
      `)
      .is('deleted_at', null)
      .order('nom');

    if (data) {
      setContacts(data as Contact[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useRefreshTrigger('contacts', fetchContacts);

  const handleContactClick = (e: React.MouseEvent, contact: Contact) => {
    if (bulk.isSelectionMode) {
      e.preventDefault();
      bulk.toggleItem(contact.id);
      return;
    }
    const permanent = e.ctrlKey || e.metaKey;
    const displayName = formatContactName(contact);
    openTab(
      {
        type: 'contact',
        path: `/contacts/${contact.id}`,
        title: displayName,
        entityId: contact.id,
      },
      permanent
    );
  };

  const handleContactDoubleClick = (contact: Contact) => {
    if (bulk.isSelectionMode) return;
    const displayName = formatContactName(contact);
    openTab(
      {
        type: 'contact',
        path: `/contacts/${contact.id}`,
        title: displayName,
        entityId: contact.id,
      },
      true
    );
  };

  const handleNewContact = () => {
    openTab(
      { type: 'new-contact', path: '/contacts/new', title: 'Nouveau contact' },
      true
    );
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/contacts/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(bulk.selectedIds) }),
      });

      if (response.ok) {
        bulk.exitSelectionMode();
        fetchContacts();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <div className="flex items-center gap-2">
            {contacts.length > 0 && (
              <Button
                variant={bulk.isSelectionMode ? 'outline' : 'secondary'}
                onClick={bulk.toggleSelectionMode}
              >
                {bulk.isSelectionMode ? 'Annuler' : 'Modifier'}
              </Button>
            )}
            {!bulk.isSelectionMode && (
              <Button onClick={handleNewContact}>Nouveau contact</Button>
            )}
          </div>
        </div>

        {/* Liste */}
        {contacts.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {contacts.map((contact) => {
              const clientLinks = Array.isArray(contact.client_links)
                ? contact.client_links
                : contact.client_links ? [contact.client_links] : [];
              const clientCount = clientLinks.length;

              return (
                <button
                  key={contact.id}
                  onClick={(e) => handleContactClick(e, contact)}
                  onDoubleClick={() => handleContactDoubleClick(contact)}
                  className="w-full block p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    {bulk.isSelectionMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={bulk.isSelected(contact.id)}
                          onCheckedChange={() => bulk.toggleItem(contact.id)}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{formatContactName(contact)}</span>
                          {clientCount > 0 && (
                            <Badge variant="blue">
                              {clientCount} client{clientCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          {contact.email && <span>{contact.email}</span>}
                          {contact.telephone && <span>{contact.telephone}</span>}
                        </div>
                        {clientCount > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {clientLinks.slice(0, 3).map((link) => (
                              <span
                                key={link.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                              >
                                {getClientName(link.client)}
                                {link.role && ` (${link.role})`}
                                {link.preferred_channel && (
                                  <span className="text-blue-600">
                                    {link.preferred_channel === 'email' ? '✉' : '☎'}
                                  </span>
                                )}
                              </span>
                            ))}
                            {clientCount > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-400">
                                +{clientCount - 3} autre{clientCount - 3 > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {clientCount === 0 && (
                          <p className="text-sm text-gray-400">Non lie</p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun contact pour le moment</p>
            <Button variant="secondary" onClick={handleNewContact}>
              Creer votre premier contact
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {bulk.isSelectionMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          actions={[
            {
              label: 'Supprimer',
              icon: <Trash2 className="h-4 w-4" />,
              variant: 'destructive',
              onClick: () => setShowDeleteConfirm(true),
            },
          ]}
          onSelectAll={bulk.selectAll}
          onDeselectAll={bulk.deselectAll}
          onExit={bulk.exitSelectionMode}
          isAllSelected={bulk.isAllSelected}
          totalCount={contacts.length}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Supprimer les contacts"
        description={`Vous allez supprimer ${bulk.selectedCount} contact(s). Cette action peut etre annulee depuis la corbeille.`}
        confirmLabel="Supprimer"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
