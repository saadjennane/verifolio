'use client';

import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
  type Payment,
  type PaymentWithRelations,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/payments/types';
import { Trash2, Edit2 } from 'lucide-react';

interface PaymentsListProps {
  payments: (Payment | PaymentWithRelations)[];
  currency?: string;
  showInvoice?: boolean;
  showClient?: boolean;
  showMission?: boolean;
  onEdit?: (payment: Payment) => void;
  onDelete?: (paymentId: string) => void;
  emptyMessage?: string;
}

export function PaymentsList({
  payments,
  currency = 'MAD',
  showInvoice = false,
  showClient = false,
  showMission = false,
  onEdit,
  onDelete,
  emptyMessage = 'Aucun paiement enregistré',
}: PaymentsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const handleDelete = async (paymentId: string) => {
    if (!onDelete) return;

    if (deletingId === paymentId) {
      // Confirm delete
      onDelete(paymentId);
      setDeletingId(null);
    } else {
      // First click - show confirm
      setDeletingId(paymentId);
      // Reset after 3 seconds
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <div className="divide-y divide-border">
      {payments.map((payment) => {
        const isRefund = payment.payment_type === 'refund';
        const isAdvance = payment.payment_type === 'advance';

        return (
          <div
            key={payment.id}
            className="py-3 flex items-center justify-between gap-4"
          >
            {/* Left: Date + Type + Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {formatDate(payment.payment_date)}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${
                    isRefund
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : isAdvance
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {PAYMENT_TYPE_LABELS[payment.payment_type]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[payment.payment_method]}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {showClient && 'client' in payment && payment.client && (
                  <span>{payment.client.nom}</span>
                )}
                {showInvoice && 'invoice' in payment && payment.invoice && (
                  <span>Facture {payment.invoice.numero}</span>
                )}
                {showMission && 'mission' in payment && payment.mission && (
                  <span>{payment.mission.title}</span>
                )}
                {payment.reference && (
                  <span className="text-muted-foreground/70">
                    Réf: {payment.reference}
                  </span>
                )}
              </div>

              {payment.notes && (
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {payment.notes}
                </p>
              )}
            </div>

            {/* Right: Amount + Actions */}
            <div className="flex items-center gap-3">
              <span
                className={`font-semibold ${
                  isRefund
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {isRefund ? '-' : '+'}
                {formatCurrency(Math.abs(payment.amount), currency)}
              </span>

              {(onEdit || onDelete) && (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(payment)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className={`p-1.5 rounded transition-colors ${
                        deletingId === payment.id
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={deletingId === payment.id ? 'Confirmer la suppression' : 'Supprimer'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
