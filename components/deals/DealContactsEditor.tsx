'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Contact {
  id: string;
  nom: string;
  prenom: string | null;
  civilite: string | null;
  email: string | null;
  telephone: string | null;
}

interface DealContact {
  id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean;
  contact: Contact | null;
}

interface ClientContact {
  contact_id: string;
  contact: Contact;
  role: string | null;
  is_primary: boolean;
  handles_billing: boolean;
  handles_commercial: boolean;
  handles_ops: boolean;
  handles_management: boolean;
  linked_to_deal: boolean;
}

interface DealContactsEditorProps {
  dealId: string;
  onUpdate?: () => void;
}

function formatContactName(contact: Contact): string {
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

export function DealContactsEditor({ dealId, onUpdate }: DealContactsEditorProps) {
  const [dealContacts, setDealContacts] = useState<DealContact[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContacts();
  }, [dealId]);

  async function loadContacts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/contacts`);
      if (res.ok) {
        const data = await res.json();
        const fetchedDealContacts = data.dealContacts || [];
        const fetchedClientContacts = data.clientContacts || [];

        setDealContacts(fetchedDealContacts);
        setClientContacts(fetchedClientContacts);

        // Si aucun contact lié au deal mais des contacts client existent,
        // auto-lier tous les contacts du client
        if (fetchedDealContacts.length === 0 && fetchedClientContacts.length > 0) {
          await autoLinkClientContacts(fetchedClientContacts);
          return; // loadContacts sera rappelé après la synchronisation
        }

        // Initialiser la sélection avec les contacts déjà liés
        const linkedIds = new Set<string>(
          fetchedDealContacts.map((dc: DealContact) => dc.contact_id)
        );
        setSelectedIds(linkedIds);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function autoLinkClientContacts(clientContactsList: ClientContact[]) {
    try {
      const contactIds = clientContactsList.map(cc => cc.contact_id);
      const res = await fetch(`/api/deals/${dealId}/contacts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: contactIds }),
      });

      if (res.ok) {
        // Recharger pour afficher les contacts liés
        await loadContacts();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error auto-linking contacts:', error);
      setLoading(false);
    }
  }

  function toggleContact(contactId: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedIds(newSet);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/contacts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        await loadContacts();
        setEditing(false);
        onUpdate?.();
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving contacts:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    // Réinitialiser la sélection
    const linkedIds = new Set<string>(
      dealContacts.map(dc => dc.contact_id)
    );
    setSelectedIds(linkedIds);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Mode édition
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Sélectionner les contacts ({selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''})
          </h3>
        </div>

        {clientContacts.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clientContacts.map((cc) => {
              const isSelected = selectedIds.has(cc.contact_id);
              const responsibilities = getResponsibilityLabels(cc);
              const hasEmail = !!cc.contact.email;

              return (
                <label
                  key={cc.contact_id}
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleContact(cc.contact_id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {formatContactName(cc.contact)}
                      </span>
                      {cc.role && (
                        <span className="text-xs text-gray-500">({cc.role})</span>
                      )}
                    </div>
                    {hasEmail ? (
                      <p className="text-sm text-gray-500">{cc.contact.email}</p>
                    ) : (
                      <p className="text-sm text-orange-500">Pas d&apos;email</p>
                    )}
                    {responsibilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {responsibilities.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
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
          <p className="text-sm text-gray-500 py-4 text-center">
            Aucun contact lié à ce client.
            <br />
            Ajoutez des contacts au client pour pouvoir les lier au deal.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={saveChanges} loading={saving}>
            Enregistrer
          </Button>
          <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={saving}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // Mode affichage
  return (
    <div className="space-y-3">
      {dealContacts.length > 0 ? (
        <div className="space-y-2">
          {dealContacts.map((dc) => {
            if (!dc.contact) return null;

            // Trouver les responsabilités depuis client_contacts
            const clientContact = clientContacts.find(cc => cc.contact_id === dc.contact_id);
            const responsibilities = clientContact ? getResponsibilityLabels(clientContact) : [];

            return (
              <div
                key={dc.id}
                className="flex items-start p-3 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {formatContactName(dc.contact)}
                    </span>
                    {dc.is_primary && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        Principal
                      </span>
                    )}
                    {(dc.role || clientContact?.role) && (
                      <span className="text-xs text-gray-500">
                        ({dc.role || clientContact?.role})
                      </span>
                    )}
                  </div>
                  {dc.contact.email && (
                    <p className="text-sm text-gray-500">{dc.contact.email}</p>
                  )}
                  {responsibilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {responsibilities.filter(r => r !== 'Principal').map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucun contact lié à ce deal</p>
      )}

      <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
        Modifier les contacts
      </Button>
    </div>
  );
}
