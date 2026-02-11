'use client';

import { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/currency';
import type { UnassociatedClientPayment, UnassociatedSupplierPayment } from '@/lib/payments/types';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/types';

interface PaymentAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // For client invoices
  invoiceId?: string;
  clientId?: string;
  // For supplier invoices
  supplierInvoiceId?: string;
  supplierId?: string;
  // Invoice info
  invoiceNumero: string;
  invoiceRemaining: number;
  currency?: string;
}

type Payment = UnassociatedClientPayment | UnassociatedSupplierPayment;

export function PaymentAssociationModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  clientId,
  supplierInvoiceId,
  supplierId,
  invoiceNumero,
  invoiceRemaining,
  currency = 'EUR',
}: PaymentAssociationModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [associating, setAssociating] = useState(false);

  const isSupplier = !!supplierInvoiceId;

  useEffect(() => {
    if (isOpen) {
      fetchPayments();
    } else {
      setPayments([]);
      setSelectedPaymentId(null);
      setError(null);
    }
  }, [isOpen, clientId, supplierId]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (isSupplier) {
        params.set('type', 'supplier');
        if (supplierId) params.set('supplier_id', supplierId);
      } else {
        params.set('type', 'client');
        if (clientId) params.set('client_id', clientId);
      }

      const res = await fetch(`/api/payments/unassociated?${params}`);
      if (!res.ok) throw new Error('Erreur lors du chargement');

      const { data } = await res.json();
      setPayments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleAssociate = async () => {
    if (!selectedPaymentId) return;

    setAssociating(true);
    setError(null);

    try {
      const body = isSupplier
        ? { supplier_invoice_id: supplierInvoiceId }
        : { invoice_id: invoiceId };

      const res = await fetch(`/api/payments/${selectedPaymentId}/associate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok || !result.data?.success) {
        throw new Error(result.error || result.data?.error || 'Erreur lors de l\'association');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setAssociating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Associer un paiement existant</h2>
            <p className="text-sm text-muted-foreground">
              Facture {invoiceNumero} - Reste: {formatCurrency(invoiceRemaining, currency)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun paiement non associe disponible</p>
              <p className="text-sm mt-1">
                {isSupplier
                  ? 'Vous devez d\'abord creer un paiement fournisseur sans facture.'
                  : 'Vous devez d\'abord creer un paiement client sans facture.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => {
                const isSelected = selectedPaymentId === payment.id;
                const isExactMatch = payment.amount === invoiceRemaining;
                const isPartial = payment.amount < invoiceRemaining;

                return (
                  <button
                    key={payment.id}
                    onClick={() => setSelectedPaymentId(isSelected ? null : payment.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {formatCurrency(payment.amount, currency)}
                          </span>
                          {isExactMatch && (
                            <Badge variant="green" className="text-xs">
                              Montant exact
                            </Badge>
                          )}
                          {isPartial && (
                            <Badge variant="gray" className="text-xs">
                              Paiement partiel
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.payment_date)} · {PAYMENT_METHOD_LABELS[payment.payment_method]}
                        </p>
                        {payment.reference && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
          {selectedPayment && (
            <div className="mb-3 p-3 bg-primary/10 rounded-lg text-sm">
              <p className="font-medium text-foreground">
                Associer {formatCurrency(selectedPayment.amount, currency)} a la facture {invoiceNumero}
              </p>
              {selectedPayment.amount > invoiceRemaining && (
                <p className="text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Le paiement depasse le montant restant. L'excedent restera disponible.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={associating}>
              Annuler
            </Button>
            <Button
              onClick={handleAssociate}
              disabled={!selectedPaymentId || associating}
            >
              {associating ? 'Association...' : 'Associer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
