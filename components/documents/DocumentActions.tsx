'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { SendDocumentModal } from '@/components/documents/SendDocumentModal';
import { PaymentModal, PaymentAssociationModal } from '@/components/payments';
import { useSendDocument } from '@/lib/hooks/useSendDocument';
import type { PaymentCreate } from '@/lib/payments/types';

interface DocumentActionsProps {
  type: 'quote' | 'invoice';
  id: string;
  status: string;
  clientEmail?: string | null;
  clientId?: string;
  dealId?: string | null;
  missionId?: string | null;
  documentTitle?: string;
  // For invoice payment
  remainingAmount?: number;
  currency?: string;
  onPaymentAdded?: () => void;
}

export function DocumentActions({
  type,
  id,
  status,
  clientEmail,
  clientId,
  dealId,
  missionId,
  documentTitle,
  remainingAmount,
  currency = 'EUR',
  onPaymentAdded,
}: DocumentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAssociationModalOpen, setIsAssociationModalOpen] = useState(false);
  const sendDocument = useSendDocument();

  const isInvoice = type === 'invoice';

  // Determiner l'entite pour l'envoi (deal > mission > client)
  const entityType = dealId ? 'deal' : missionId ? 'mission' : 'client';
  const entityId = dealId || missionId || clientId || '';

  const handleGeneratePDF = async () => {
    setLoading('pdf');
    setMessage(null);

    try {
      const response = await fetch(`/api/pdf/${type}/${id}`);
      if (!response.ok) throw new Error('Erreur generation PDF');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      setMessage({ type: 'success', text: 'PDF genere avec succes' });
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la generation du PDF' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendEmail = () => {
    if (!entityId) {
      // Fallback: envoi simple au client
      if (!clientEmail) {
        setMessage({ type: 'error', text: 'Le client n\'a pas d\'email' });
        return;
      }
      handleSimpleSend();
      return;
    }

    // Ouvrir la modal d'envoi avec selection des destinataires
    sendDocument.openSendModal({
      docType: type,
      documentId: id,
      documentTitle: documentTitle || (isInvoice ? 'Facture' : 'Devis'),
      entityType,
      entityId,
    });
  };

  // Fallback: envoi simple sans modal (quand pas de contexte deal/mission/client)
  const handleSimpleSend = async () => {
    if (!confirm(`Envoyer le document par email a ${clientEmail} ?`)) {
      return;
    }

    setLoading('email');
    setMessage(null);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, to: clientEmail }),
      });

      if (!response.ok) throw new Error('Erreur envoi email');

      // Mettre a jour le statut
      const supabase = createClient();
      const table = isInvoice ? 'invoices' : 'quotes';
      const newStatus = isInvoice ? 'envoyee' : 'envoye';

      await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', id);

      setMessage({ type: 'success', text: 'Email envoye avec succes' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi de l\'email' });
    } finally {
      setLoading(null);
    }
  };

  const handleSendSuccess = () => {
    setMessage({ type: 'success', text: 'Email envoye avec succes' });
    router.refresh();
  };

  const handleEncaisser = () => {
    setIsPaymentModalOpen(true);
  };

  const handleAssocierPaiement = () => {
    setIsAssociationModalOpen(true);
  };

  const handleAssociationSuccess = () => {
    setMessage({ type: 'success', text: 'Paiement associe avec succes' });
    onPaymentAdded?.();
    router.refresh();
  };

  const handlePaymentSubmit = async (data: PaymentCreate) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur');
    }

    setMessage({ type: 'success', text: 'Paiement enregistre' });
    setIsPaymentModalOpen(false);
    onPaymentAdded?.();
    router.refresh();
  };

  const handleConvertToInvoice = async () => {
    if (!confirm('Creer une facture a partir de ce devis ?')) {
      return;
    }

    setLoading('convert');
    setMessage(null);

    try {
      const supabase = createClient();

      // Recuperer le devis avec ses lignes
      const { data: quote } = await supabase
        .from('quotes')
        .select('*, items:quote_line_items(*)')
        .eq('id', id)
        .single();

      if (!quote) throw new Error('Devis non trouve');

      // Recuperer le numero de facture
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifie');

      const { data: company } = await supabase
        .from('companies')
        .select('invoice_prefix, next_invoice_number')
        .eq('user_id', user.id)
        .single();

      const prefix = company?.invoice_prefix || 'FAC-';
      const number = company?.next_invoice_number || 1;
      const numero = `${prefix}${String(number).padStart(4, '0')}`;

      // Creer la facture
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_id: quote.client_id,
          quote_id: quote.id,
          numero,
          date_emission: new Date().toISOString().split('T')[0],
          status: 'brouillon',
          devise: quote.devise,
          total_ht: quote.total_ht,
          total_tva: quote.total_tva,
          total_ttc: quote.total_ttc,
          notes: quote.notes,
        })
        .select()
        .single();

      if (invoiceError || !invoice) throw invoiceError;

      // Copier les lignes
      const items = quote.items || [];
      if (items.length > 0) {
        const invoiceItems = items.map((item: { description: string; quantite: number; prix_unitaire: number; tva_rate: number; montant_ht: number; montant_tva: number; montant_ttc: number; ordre: number }) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          tva_rate: item.tva_rate,
          montant_ht: item.montant_ht,
          montant_tva: item.montant_tva,
          montant_ttc: item.montant_ttc,
          ordre: item.ordre,
        }));

        await supabase.from('invoice_line_items').insert(invoiceItems);
      }

      // Incrementer le compteur
      await supabase
        .from('companies')
        .update({ next_invoice_number: number + 1 })
        .eq('user_id', user.id);

      setMessage({ type: 'success', text: 'Facture creee avec succes' });
      router.push(`/invoices/${invoice.id}`);
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la conversion' });
    } finally {
      setLoading(null);
    }
  };

  // Show Encaisser button if invoice is not fully paid
  const showEncaisserButton = isInvoice && status !== 'payee' && (remainingAmount === undefined || remainingAmount > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleGeneratePDF}
          loading={loading === 'pdf'}
          variant="secondary"
        >
          Generer PDF
        </Button>

        <Button
          onClick={handleSendEmail}
          loading={loading === 'email'}
          variant="secondary"
          disabled={!clientEmail && !entityId}
        >
          Envoyer par email
        </Button>

        {showEncaisserButton && (
          <>
            <Button
              onClick={handleEncaisser}
              variant="secondary"
            >
              Encaisser
            </Button>
            <Button
              onClick={handleAssocierPaiement}
              variant="outline"
            >
              Associer un paiement
            </Button>
          </>
        )}

        {!isInvoice && (
          <Button
            onClick={handleConvertToInvoice}
            loading={loading === 'convert'}
          >
            Convertir en facture
          </Button>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      {/* Modal d'envoi de document */}
      {sendDocument.state.docType && (
        <SendDocumentModal
          isOpen={sendDocument.state.isOpen}
          onClose={sendDocument.closeSendModal}
          onSend={async (contactIds, message) => {
            await sendDocument.sendDocument(contactIds, message);
            handleSendSuccess();
          }}
          docType={sendDocument.state.docType}
          documentTitle={sendDocument.state.documentTitle}
          contacts={sendDocument.state.contacts}
          loading={sendDocument.state.loading}
        />
      )}

      {/* Modal de paiement */}
      {isInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handlePaymentSubmit}
          invoiceId={id}
          clientId={clientId}
          remainingAmount={remainingAmount}
          currency={currency}
        />
      )}

      {/* Modal d'association de paiement existant */}
      {isInvoice && (
        <PaymentAssociationModal
          isOpen={isAssociationModalOpen}
          onClose={() => setIsAssociationModalOpen(false)}
          onSuccess={handleAssociationSuccess}
          invoiceId={id}
          clientId={clientId}
          invoiceNumero={documentTitle || 'Facture'}
          invoiceRemaining={remainingAmount || 0}
          currency={currency}
        />
      )}
    </div>
  );
}
