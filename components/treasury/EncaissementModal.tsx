'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/types';
import type { PaymentMethod } from '@/lib/payments/types';
import type { CreateEncaissementPayload, PendingClientInvoice } from '@/lib/treasury/types';
import { formatCurrency } from '@/lib/utils/currency';

interface Client {
  id: string;
  nom: string;
}

interface Mission {
  id: string;
  title: string;
}

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

  // Client selection (required)
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(false);

  // Invoice selection (optional)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [filteredInvoices, setFilteredInvoices] = useState<PendingClientInvoice[]>([]);

  // Mission selection (optional)
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [loadingMissions, setLoadingMissions] = useState(false);

  // Show optional fields
  const [showOptional, setShowOptional] = useState(false);

  // Payment details
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('virement');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch clients on open
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      resetForm();
    }
  }, [isOpen]);

  // Filter invoices by client
  useEffect(() => {
    if (selectedClientId) {
      const filtered = pendingInvoices.filter((i) => i.client_id === selectedClientId);
      setFilteredInvoices(filtered);
      // Reset invoice selection if client changes
      if (selectedInvoiceId) {
        const stillValid = filtered.some((i) => i.id === selectedInvoiceId);
        if (!stillValid) {
          setSelectedInvoiceId('');
        }
      }
    } else {
      setFilteredInvoices([]);
      setSelectedInvoiceId('');
    }
  }, [selectedClientId, pendingInvoices, selectedInvoiceId]);

  // Fetch missions for selected client
  useEffect(() => {
    if (selectedClientId) {
      fetchMissions(selectedClientId);
    } else {
      setMissions([]);
      setSelectedMissionId('');
    }
  }, [selectedClientId]);

  // Update amount when invoice selected
  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = filteredInvoices.find((i) => i.id === selectedInvoiceId);
      if (invoice) {
        setAmount(invoice.remaining.toFixed(2));
      }
    }
  }, [selectedInvoiceId, filteredInvoices]);

  const resetForm = () => {
    setSelectedClientId('');
    setSelectedInvoiceId('');
    setSelectedMissionId('');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('virement');
    setReference('');
    setNotes('');
    setError(null);
    setShowOptional(false);
  };

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch('/api/clients?type=client');
      if (res.ok) {
        const { data } = await res.json();
        setClients(data || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchMissions = async (clientId: string) => {
    setLoadingMissions(true);
    try {
      const res = await fetch(`/api/missions?client_id=${clientId}`);
      if (res.ok) {
        const { data } = await res.json();
        setMissions(data || []);
      }
    } catch (err) {
      console.error('Error fetching missions:', err);
    } finally {
      setLoadingMissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!selectedClientId) {
      setError('Veuillez selectionner un client');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Le montant doit etre superieur a 0');
      return;
    }

    // Validate amount against invoice if selected
    if (selectedInvoiceId) {
      const selectedInvoice = filteredInvoices.find((i) => i.id === selectedInvoiceId);
      if (selectedInvoice && numAmount > selectedInvoice.remaining) {
        setError(`Le montant depasse le reste a encaisser (${formatCurrency(selectedInvoice.remaining, currency)})`);
        return;
      }
    }

    setLoading(true);

    try {
      await onSubmit({
        client_id: selectedClientId,
        invoice_id: selectedInvoiceId || undefined,
        mission_id: selectedMissionId || undefined,
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_type: selectedInvoiceId ? 'payment' : 'advance',
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

  const selectedInvoice = filteredInvoices.find((i) => i.id === selectedInvoiceId);

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

          {/* Client selection (required) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
              disabled={loadingClients}
            >
              <option value="">-- Selectionner un client --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Amount (required) */}
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

          {/* Date (required) */}
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

          {/* Toggle for optional fields */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showOptional ? 'Masquer les options' : 'Afficher plus d\'options'}
          </button>

          {showOptional && (
            <>
              {/* Invoice selection (optional) */}
              {selectedClientId && filteredInvoices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Facture{' '}
                    <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- Paiement sans facture --</option>
                    {filteredInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.numero} ({formatCurrency(invoice.remaining, currency)} restant)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Sans facture, le paiement pourra etre associe plus tard
                  </p>
                </div>
              )}

              {/* Mission selection (optional) */}
              {selectedClientId && missions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Mission{' '}
                    <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </label>
                  <select
                    value={selectedMissionId}
                    onChange={(e) => setSelectedMissionId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loadingMissions}
                  >
                    <option value="">-- Sans mission --</option>
                    {missions.map((mission) => (
                      <option key={mission.id} value={mission.id}>
                        {mission.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
            </>
          )}

          {/* Info about payment type */}
          {selectedClientId && !selectedInvoiceId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm rounded-lg">
              Ce paiement sera enregistre comme une <strong>avance client</strong> et pourra etre associe a une facture ulterieurement.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedClientId}
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
