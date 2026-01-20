'use client';

import { formatCurrency } from '@/lib/utils/currency';
import {
  type InvoicePaymentStatus,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '@/lib/payments/types';

interface PaymentSummaryProps {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  paymentStatus: InvoicePaymentStatus;
  currency?: string;
  showProgressBar?: boolean;
}

export function PaymentSummary({
  totalAmount,
  totalPaid,
  remaining,
  paymentStatus,
  currency = 'MAD',
  showProgressBar = true,
}: PaymentSummaryProps) {
  const percentage = totalAmount > 0 ? Math.min((totalPaid / totalAmount) * 100, 100) : 0;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Total : </span>
            <span className="font-medium">{formatCurrency(totalAmount, currency)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Payé : </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid, currency)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Reste : </span>
            <span className={`font-medium ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {formatCurrency(remaining, currency)}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[paymentStatus]}`}>
          {PAYMENT_STATUS_LABELS[paymentStatus]}
        </span>
      </div>

      {/* Progress bar */}
      {showProgressBar && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              paymentStatus === 'paye'
                ? 'bg-green-500'
                : paymentStatus === 'partiel'
                ? 'bg-amber-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Version compacte pour les listes
export function PaymentStatusBadge({
  status,
  amount,
  currency = 'MAD',
}: {
  status: InvoicePaymentStatus;
  amount?: number;
  currency?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[status]}`}>
      {PAYMENT_STATUS_LABELS[status]}
      {amount !== undefined && status === 'partiel' && (
        <span className="opacity-75">({formatCurrency(amount, currency)})</span>
      )}
    </span>
  );
}
