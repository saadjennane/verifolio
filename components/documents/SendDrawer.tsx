'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Send, Loader2, Paperclip, Mail, Check } from 'lucide-react';
import { Button, Textarea, Input } from '@/components/ui';
import {
  type ContactWithResponsibilities,
  getDefaultSelectedRecipients,
  formatContactName,
  getResponsibilityLabels,
  separateContactsBySource,
} from '@/lib/documents/recipient-selection';
import type { ResourceType } from '@/lib/send/types';
import { DOCUMENT_SEND_CONFIGS } from '@/lib/send/types';
import { getDefaultSubject } from '@/lib/email/templates';

// ============================================================================
// TYPES
// ============================================================================

interface SendDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  documentTitle: string;
  contacts: ContactWithResponsibilities[];
  // Variables pour les templates
  clientName?: string;
  dealTitle?: string;
  missionTitle?: string;
  quoteNumber?: string;
  invoiceNumber?: string;
  companyName: string;
  userDisplayName: string;
  // Callback success
  onSendSuccess?: () => void;
}

// ============================================================================
// LABELS
// ============================================================================

const resourceTypeLabels: Record<ResourceType, string> = {
  brief: 'brief',
  proposal: 'proposition',
  quote: 'devis',
  invoice: 'facture',
  review_request: "demande d'avis",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SendDrawer({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  documentTitle,
  contacts,
  clientName,
  dealTitle,
  missionTitle,
  quoteNumber,
  invoiceNumber,
  companyName,
  userDisplayName,
  onSendSuccess,
}: SendDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [attachPdf, setAttachPdf] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = DOCUMENT_SEND_CONFIGS[resourceType];

  // Séparer les contacts par source
  const { teamContacts, otherContacts } = useMemo(
    () => separateContactsBySource(contacts),
    [contacts]
  );

  // Initialiser le sujet par défaut
  useEffect(() => {
    if (isOpen) {
      const defaultSubject = getDefaultSubject(resourceType, {
        client_name: clientName,
        deal_title: dealTitle,
        mission_title: missionTitle,
        quote_number: quoteNumber,
        invoice_number: invoiceNumber,
        company_name: companyName,
        user_display_name: userDisplayName,
        public_link_url: '',
      });
      setSubject(defaultSubject);
      setAttachPdf(config.default_attach_pdf);
    }
  }, [isOpen, resourceType, clientName, dealTitle, missionTitle, quoteNumber, invoiceNumber, companyName, userDisplayName, config.default_attach_pdf]);

  // Pré-sélection automatique
  useEffect(() => {
    if (isOpen && contacts.length > 0) {
      const docType = resourceType === 'review_request' ? 'review_request' : resourceType as 'quote' | 'invoice' | 'proposal';
      const defaultSelected = getDefaultSelectedRecipients(docType, contacts);
      setSelectedIds(new Set(defaultSelected));
    }
  }, [isOpen, contacts, resourceType]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setCustomMessage('');
      setSending(false);
      setSent(false);
      setError(null);
    }
  }, [isOpen]);

  const toggleContact = useCallback((contactId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const handleSend = async () => {
    if (selectedIds.size === 0) return;

    setSending(true);
    setError(null);

    try {
      // Get emails from selected contacts
      const toEmails = contacts
        .filter(c => selectedIds.has(c.id) && c.email)
        .map(c => c.email as string);

      if (toEmails.length === 0) {
        setError('Aucun contact avec email sélectionné');
        setSending(false);
        return;
      }

      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          to_emails: toEmails,
          subject,
          custom_message: customMessage || undefined,
          attach_pdf: attachPdf,
          contact_ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setSent(true);
      onSendSuccess?.();

      // Fermer après un délai
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error sending:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const hasContactsWithEmail = contacts.some(c => c.email);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Envoyer {resourceTypeLabels[resourceType]}
              </h2>
              <p className="text-sm text-gray-500 truncate">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Envoyé !</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedCount} destinataire{selectedCount > 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <>
              {/* Destinataires */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Destinataires
                </h3>
                {!hasContactsWithEmail ? (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                    <p>Aucun contact avec email disponible.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {teamContacts.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Équipe projet
                        </p>
                        {teamContacts.map(contact => (
                          <ContactCheckbox
                            key={contact.id}
                            contact={contact}
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleContact(contact.id)}
                          />
                        ))}
                      </>
                    )}
                    {otherContacts.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mt-3">
                          {teamContacts.length > 0 ? 'Autres contacts' : 'Contacts'}
                        </p>
                        {otherContacts.map(contact => (
                          <ContactCheckbox
                            key={contact.id}
                            contact={contact}
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleContact(contact.id)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Sujet */}
              <div>
                <Input
                  label="Sujet"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              {/* Message personnalisé */}
              <div>
                <Textarea
                  label="Message (optionnel)"
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Ajoutez un message personnalisé qui apparaîtra dans l'email..."
                  rows={3}
                />
              </div>

              {/* Option PDF */}
              {config.supports_pdf && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="attach-pdf"
                    checked={attachPdf}
                    onChange={e => setAttachPdf(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="attach-pdf" className="flex items-center gap-2 cursor-pointer">
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Joindre le PDF</span>
                  </label>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {selectedCount} destinataire{selectedCount > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={sending}>
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                disabled={selectedCount === 0 || sending || !subject.trim()}
                className="gap-2"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

// ============================================================================
// SUB-COMPONENT
// ============================================================================

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
      className={`flex items-start p-2 rounded-lg border cursor-pointer transition-colors ${
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
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
      <div className="ml-2 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">
            {formatContactName(contact)}
          </span>
        </div>
        {hasEmail ? (
          <p className="text-xs text-gray-500 truncate">{contact.email}</p>
        ) : (
          <p className="text-xs text-red-500">Pas d&apos;email</p>
        )}
        {responsibilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {responsibilities.slice(0, 2).map(label => (
              <span
                key={label}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
              >
                {label}
              </span>
            ))}
            {responsibilities.length > 2 && (
              <span className="text-xs text-gray-400">
                +{responsibilities.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
