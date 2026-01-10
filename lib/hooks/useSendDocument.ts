'use client';

import { useState, useCallback } from 'react';
import type { DocType, ContactWithResponsibilities } from '@/lib/documents/recipient-selection';

interface SendDocumentState {
  isOpen: boolean;
  docType: DocType | null;
  documentId: string | null;
  documentTitle: string;
  entityType: 'deal' | 'mission' | 'client' | null;
  entityId: string | null;
  contacts: ContactWithResponsibilities[];
  loading: boolean;
}

interface UseSendDocumentReturn {
  state: SendDocumentState;
  openSendModal: (params: {
    docType: DocType;
    documentId: string;
    documentTitle: string;
    entityType: 'deal' | 'mission' | 'client';
    entityId: string;
  }) => Promise<void>;
  closeSendModal: () => void;
  sendDocument: (selectedContactIds: string[], message: string, attachPdf?: boolean) => Promise<void>;
}

export function useSendDocument(): UseSendDocumentReturn {
  const [state, setState] = useState<SendDocumentState>({
    isOpen: false,
    docType: null,
    documentId: null,
    documentTitle: '',
    entityType: null,
    entityId: null,
    contacts: [],
    loading: false,
  });

  const openSendModal = useCallback(async (params: {
    docType: DocType;
    documentId: string;
    documentTitle: string;
    entityType: 'deal' | 'mission' | 'client';
    entityId: string;
  }) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      docType: params.docType,
      documentId: params.documentId,
      documentTitle: params.documentTitle,
      entityType: params.entityType,
      entityId: params.entityId,
      loading: true,
      contacts: [],
    }));

    try {
      // Récupérer les contacts disponibles
      const res = await fetch(
        `/api/documents/recipients?entityType=${params.entityType}&entityId=${params.entityId}`
      );

      if (!res.ok) {
        throw new Error('Erreur récupération contacts');
      }

      const data = await res.json();

      setState((prev) => ({
        ...prev,
        contacts: data.contacts || [],
        loading: false,
      }));
    } catch (error) {
      console.error('Error loading recipients:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, []);

  const closeSendModal = useCallback(() => {
    setState({
      isOpen: false,
      docType: null,
      documentId: null,
      documentTitle: '',
      entityType: null,
      entityId: null,
      contacts: [],
      loading: false,
    });
  }, []);

  const sendDocument = useCallback(async (selectedContactIds: string[], message: string, attachPdf?: boolean) => {
    if (!state.docType || !state.documentId || !state.entityType || !state.entityId) {
      throw new Error('État invalide');
    }

    // Récupérer les emails des contacts sélectionnés
    const selectedContacts = state.contacts.filter(c => selectedContactIds.includes(c.id));
    const toEmails = selectedContacts.filter(c => c.email).map(c => c.email as string);

    if (toEmails.length === 0) {
      throw new Error('Aucun contact avec email sélectionné');
    }

    // Mapper docType vers resource_type
    const resourceType = state.docType === 'review_request' ? 'review_request' : state.docType;

    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource_type: resourceType,
        resource_id: state.documentId,
        to_emails: toEmails,
        custom_message: message || undefined,
        contact_ids: selectedContactIds,
        attach_pdf: attachPdf,
      }),
    });

    if (!res.ok) {
      // Essayer de parser en JSON, sinon utiliser le texte brut
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur envoi');
      } else {
        const text = await res.text();
        console.error('[useSendDocument] Non-JSON response:', text);
        throw new Error(`Erreur serveur: ${res.status}`);
      }
    }

    return res.json();
  }, [state.docType, state.documentId, state.entityType, state.entityId, state.contacts]);

  return {
    state,
    openSendModal,
    closeSendModal,
    sendDocument,
  };
}
