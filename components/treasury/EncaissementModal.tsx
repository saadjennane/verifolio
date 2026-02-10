'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/types';
import type { PaymentMethod } from '@/lib/payments/types';
import type { CreateEncaissementPayload, PendingClientInvoice } from '@/lib/treasury/types';
import { formatCurrency } from '@/lib/utils/currency';

interface EncaissementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEncaissementPayload) => Promise<void>;
  pendingInvoices: PendingClientInvoice[];
  currency?: string;
}

export function EncaissementModal({
  isOpen,
  onClose,
  onSubmit,
  pendingInvoices,
  currency = 'EUR',
}: EncaissementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('virement');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedInvoiceId('');
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('virement');
      setReference('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  // Update amount when invoice selected
  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = pendingInvoices.find((i) => i.id === selectedInvoiceId);
      if (invoice) {
        setAmount(invoice.remaining.toFixed(2));
      }
    }
  }, [selectedInvoiceId, pendingInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Le montant doit etre superieur a 0');
      return;
    }

    if (!selectedInvoiceId) {
      setError('Veuillez selectionner une facture');
      return;
    }

    const selectedInvoice = pendingInvoices.find((i) => i.id === selectedInvoiceId);
    if (selectedInvoice && numAmount > selectedInvoice.remaining) {
      setError(`Le montant depasse le reste a encaisser (${formatCurrency(selectedInvoice.remaining, currency)})`);
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        invoice_id: selectedInvoiceId,
        client_id: selectedInvoice?.client_id,
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_type: 'payment',
        reference: reference || undefined,
        notes: notes || undefined,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedInvoice = pendingInvoices.find((i) => i.id === selectedInvoiceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Nouvel encaissement</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Invoice selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Facture client <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">-- Selectionner une facture --</option>
              {pendingInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.numero} - {invoice.client_name} ({formatCurrency(invoice.remaining, currency)} restant)
                </option>
              ))}
            </select>
            {pendingInvoices.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Aucune facture en attente d&apos;encaissement
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Montant ({currency}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0.00"
              required
            />
            {selectedInvoice && parseFloat(amount) !== selectedInvoice.remaining && (
              <button
                type="button"
                onClick={() => setAmount(selectedInvoice.remaining.toFixed(2))}
                className="mt-1.5 text-xs text-primary hover:underline"
              >
                Encaisser le solde complet ({formatCurrency(selectedInvoice.remaining, currency)})
              </button>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Mode de paiement
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Reference{' '}
              <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="N cheque, ref virement..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedInvoiceId}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Enregistrement...' : 'Encaisser'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
