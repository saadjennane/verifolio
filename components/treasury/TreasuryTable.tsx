'use client';

import { formatCurrency } from '@/lib/utils/currency';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/types';
import type { TreasuryMovement } from '@/lib/treasury/types';
import { FileText, ExternalLink } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useMemo } from 'react';

interface TreasuryTableProps {
  movements: TreasuryMovement[];
  currency?: string;
  loading?: boolean;
}

function getMovementLabel(movement: TreasuryMovement): string {
  const type = movement.direction === 'in' ? 'Paiement client' : 'Paiement fournisseur';

  if (movement.counterpart_name && movement.document_numero) {
    return `${type} — ${movement.counterpart_name}`;
  }

  if (movement.counterpart_name) {
    return `${type} — ${movement.counterpart_name}`;
  }

  return type;
}

function isPartialPayment(movement: TreasuryMovement): boolean {
  return (
    movement.payment_type === 'payment' ||
    movement.payment_type === 'supplier_payment'
  );
}

export function TreasuryTable({ movements, currency = 'EUR', loading }: TreasuryTableProps) {
  const { openTab } = useTabsStore();

  // Calculate totals
  const { totalIn, totalOut } = useMemo(() => {
    return movements.reduce(
      (acc, m) => {
        if (m.direction === 'in') {
          acc.totalIn += m.amount;
        } else {
          acc.totalOut += m.amount;
        }
        return acc;
      },
      { totalIn: 0, totalOut: 0 }
    );
  }, [movements]);

  if (loading) {
    return (
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                Designation
              </th>
              <th className="text-right p-4 text-sm font-medium text-green-600">IN</th>
              <th className="text-right p-4 text-sm font-medium text-red-600">OUT</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-border animate-pulse">
                <td className="p-4">
                  <div className="h-4 bg-muted rounded w-24" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-muted rounded w-48" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-muted rounded w-20 ml-auto" />
                </td>
                <td className="p-4">
                  <div className="h-4 bg-muted rounded w-20 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground mb-1">Aucun mouvement</p>
        <p className="text-sm text-muted-foreground">
          Aucun mouvement de tresorerie pour cette periode
        </p>
      </div>
    );
  }

  const handleInvoiceClick = (movement: TreasuryMovement) => {
    if (movement.document_type === 'supplier_invoice' && movement.supplier_invoice_id) {
      openTab(
        {
          type: 'supplier-invoice',
          path: `/suppliers/invoices/${movement.supplier_invoice_id}`,
          title: movement.document_numero || 'Facture fournisseur',
          entityId: movement.supplier_invoice_id,
        },
        false
      );
    } else if (movement.invoice_id) {
      openTab(
        {
          type: 'invoice',
          path: `/invoices/${movement.invoice_id}`,
          title: movement.document_numero || 'Facture',
          entityId: movement.invoice_id,
        },
        false
      );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        {/* Header with totals */}
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-4 text-sm font-medium text-muted-foreground w-32">Date</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">
              Designation
            </th>
            <th className="text-right p-4 text-sm font-medium text-green-600 dark:text-green-400 w-32">
              <div className="flex flex-col items-end">
                <span>IN</span>
                <span className="text-xs font-normal opacity-75">
                  {formatCurrency(totalIn, currency)}
                </span>
              </div>
            </th>
            <th className="text-right p-4 text-sm font-medium text-red-600 dark:text-red-400 w-32">
              <div className="flex flex-col items-end">
                <span>OUT</span>
                <span className="text-xs font-normal opacity-75">
                  {formatCurrency(totalOut, currency)}
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {movements.map((movement) => (
            <tr
              key={movement.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              {/* Date */}
              <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(movement.date)}
              </td>

              {/* Designation */}
              <td className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">
                    {getMovementLabel(movement)}
                  </span>

                  {/* Document link */}
                  {movement.document_numero && (
                    <button
                      onClick={() => handleInvoiceClick(movement)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {movement.document_numero}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {/* Badges */}
                  {movement.payment_type === 'advance' ||
                  movement.payment_type === 'supplier_advance' ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                      Avance
                    </span>
                  ) : null}

                  {movement.payment_type === 'refund' ||
                  movement.payment_type === 'supplier_refund' ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                      Remboursement
                    </span>
                  ) : null}
                </div>

                {/* Secondary info */}
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{PAYMENT_METHOD_LABELS[movement.payment_method]}</span>
                  {movement.reference && (
                    <>
                      <span className="text-border">·</span>
                      <span>Ref: {movement.reference}</span>
                    </>
                  )}
                </div>
              </td>

              {/* IN */}
              <td className="p-4 text-right">
                {movement.direction === 'in' && (
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    +{formatCurrency(movement.amount, currency)}
                  </span>
                )}
              </td>

              {/* OUT */}
              <td className="p-4 text-right">
                {movement.direction === 'out' && (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(movement.amount, currency)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
