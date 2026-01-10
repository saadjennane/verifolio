'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button, Textarea } from '@/components/ui';
import {
  type DocType,
  type ContactWithResponsibilities,
  getDefaultSelectedRecipients,
  formatContactName,
  getResponsibilityLabels,
  separateContactsBySource,
} from '@/lib/documents/recipient-selection';

interface SendDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (selectedContactIds: string[], message: string, attachPdf?: boolean) => Promise<void>;
  docType: DocType;
  documentTitle: string;
  contacts: ContactWithResponsibilities[];
  loading?: boolean;
}

const docTypeLabels: Record<DocType, string> = {
  quote: 'devis',
  invoice: 'facture',
  proposal: 'proposition',
  review_request: 'demande d\'avis',
};

export function SendDocumentModal({
  isOpen,
  onClose,
  onSend,
  docType,
  documentTitle,
  contacts,
  loading = false,
}: SendDocumentModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  // PDF attaché par défaut pour les factures, pas pour les devis
  const [attachPdf, setAttachPdf] = useState(docType === 'invoice');

  // Détermine si l'option PDF est disponible (seulement pour devis et factures)
  const supportsPdf = docType === 'quote' || docType === 'invoice';

  // Séparer les contacts par source
  const { teamContacts, otherContacts } = useMemo(
    () => separateContactsBySource(contacts),
    [contacts]
  );

  // Pré-sélection automatique au montage
  useEffect(() => {
    if (isOpen && contacts.length > 0) {
      const defaultSelected = getDefaultSelectedRecipients(docType, contacts);
      setSelectedIds(new Set(defaultSelected));
    }
  }, [isOpen, contacts, docType]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessage('');
      setSending(false);
      setAttachPdf(docType === 'invoice');
    }
  }, [isOpen, docType]);

  const toggleContact = (contactId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedIds(newSet);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;

    setSending(true);
    try {
      await onSend(Array.from(selectedIds), message, supportsPdf ? attachPdf : undefined);
      onClose();
    } catch (error) {
      console.error('Error sending document:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const hasContactsWithEmail = contacts.some((c) => c.email);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Envoyer {docTypeLabels[docType]}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{documentTitle}</p>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {!hasContactsWithEmail ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun contact avec email disponible.</p>
              <p className="text-sm mt-2">
                Ajoutez des contacts avec adresse email pour pouvoir envoyer ce document.
              </p>
            </div>
          ) : (
            <>
              {/* Team contacts */}
              {teamContacts.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Équipe projet
                  </h3>
                  <div className="space-y-2">
                    {teamContacts.map((contact) => (
                      <ContactCheckbox
                        key={contact.id}
                        contact={contact}
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other client contacts */}
              {otherContacts.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {teamContacts.length > 0 ? 'Autres contacts' : 'Contacts'}
                  </h3>
                  <div className="space-y-2">
                    {otherContacts.map((contact) => (
                      <ContactCheckbox
                        key={contact.id}
                        contact={contact}
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Message personnalisé */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Textarea
                  label="Message (optionnel)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ajoutez un message personnalisé..."
                  rows={3}
                />
              </div>

              {/* Option joindre PDF */}
              {supportsPdf && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachPdf}
                      onChange={(e) => setAttachPdf(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Joindre le PDF en pièce jointe
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Le lien vers le document en ligne sera toujours inclus dans l&apos;email
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selectedCount} destinataire{selectedCount > 1 ? 's' : ''} sélectionné
            {selectedCount > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedCount === 0 || sending}
              loading={sending || loading}
            >
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContactCheckboxProps {
  contact: ContactWithResponsibilities;
  checked: boolean;
  onChange: () => void;
}

function ContactCheckbox({ contact, checked, onChange }: ContactCheckboxProps) {
  const hasEmail = !!contact.email;
  const responsibilities = getResponsibilityLabels(contact);

  return (
    <label
      className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? 'border-blue-500 bg-blue-50'
          : hasEmail
            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={!hasEmail}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
      <div className="ml-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {formatContactName(contact)}
          </span>
          {contact.role && (
            <span className="text-xs text-gray-500">({contact.role})</span>
          )}
        </div>
        {hasEmail ? (
          <p className="text-sm text-gray-500">{contact.email}</p>
        ) : (
          <p className="text-sm text-red-500">Pas d&apos;email</p>
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
}
