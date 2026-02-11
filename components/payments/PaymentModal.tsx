'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  type PaymentMethod,
  type PaymentType,
  type PaymentCreate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/payments/types';
import { formatCurrency } from '@/lib/utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentCreate) => Promise<void>;
  // Pre-fill options
  invoiceId?: string;
  clientId?: string;
  missionId?: string;
  remainingAmount?: number;
  currency?: string;
  // Mode
  defaultType?: PaymentType;
  // For editing
  editData?: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    payment_type: PaymentType;
    reference: string | null;
    notes: string | null;
  };
}

export function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  invoiceId,
  clientId,
  missionId,
  remainingAmount,
  currency = 'EUR',
  defaultType = 'payment',
  editData,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>(defaultType);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('virement');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when opening/closing or when editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setPaymentType(editData.payment_type);
        setAmount(Math.abs(editData.amount).toString());
        setPaymentDate(editData.payment_date);
        setPaymentMethod(editData.payment_method);
        setReference(editData.reference || '');
        setNotes(editData.notes || '');
      } else {
        setPaymentType(defaultType);
        setAmount(remainingAmount ? remainingAmount.toString() : '');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('virement');
        setReference('');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, editData, defaultType, remainingAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      setError('Le montant doit être un nombre différent de 0');
      return;
    }

    setLoading(true);

    try {
      // Pour les remboursements, le montant est négatif
      const finalAmount = paymentType === 'refund' ? -Math.abs(numAmount) : Math.abs(numAmount);

      await onSubmit({
        invoice_id: invoiceId,
        client_id: clientId,
        mission_id: missionId,
        amount: finalAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_type: paymentType,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isRefund = paymentType === 'refund';
  const title = editData
    ? 'Modifier le paiement'
    : isRefund
    ? 'Enregistrer un remboursement'
    : paymentType === 'advance'
    ? 'Enregistrer une avance'
    : 'Enregistrer un paiement';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Payment Type - only if no invoice (can choose advance) */}
          {!invoiceId && !editData && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Type
              </label>
              <div className="flex gap-2">
                {(['payment', 'advance', 'refund'] as PaymentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentType(type)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      paymentType === type
                        ? type === 'refund'
                          ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
                          : type === 'advance'
                          ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
                          : 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {PAYMENT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* With invoice, only payment or refund */}
          {invoiceId && !editData && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Type
              </label>
              <div className="flex gap-2">
                {(['payment', 'refund'] as PaymentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPaymentType(type)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      paymentType === type
                        ? type === 'refund'
                          ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
                          : 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {PAYMENT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Montant ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0.00"
              required
            />
            {remainingAmount !== undefined && remainingAmount > 0 && !isRefund && (
              <p className="mt-1 text-xs text-muted-foreground">
                Reste à payer : {formatCurrency(remainingAmount, currency)}
                {parseFloat(amount) !== remainingAmount && (
                  <button
                    type="button"
                    onClick={() => setAmount(remainingAmount.toString())}
                    className="ml-2 text-primary hover:underline"
                  >
                    Utiliser ce montant
                  </button>
                )}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Mode de paiement
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              Référence <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="N° chèque, réf. virement..."
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
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Notes internes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={isRefund ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading ? 'Enregistrement...' : editData ? 'Modifier' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
