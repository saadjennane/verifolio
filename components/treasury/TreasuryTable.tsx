'use client';

import { formatCurrency } from '@/lib/utils/currency';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/types';
import { DIRECTION_COLORS, MOVEMENT_TYPE_LABELS } from '@/lib/treasury/types';
import type { TreasuryMovement } from '@/lib/treasury/types';
import { ArrowDownCircle, ArrowUpCircle, FileText, ExternalLink } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface TreasuryTableProps {
  movements: TreasuryMovement[];
  currency?: string;
  loading?: boolean;
}

export function TreasuryTable({ movements, currency = 'EUR', loading }: TreasuryTableProps) {
  const { openTab } = useTabsStore();

  if (loading) {
    return (
      <div className="bg-background rounded-xl border border-border">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
              <div className="h-5 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
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

  // Group by date
  const groupedMovements = movements.reduce(
    (acc, movement) => {
      if (!acc[movement.date]) {
        acc[movement.date] = [];
      }
      acc[movement.date].push(movement);
      return acc;
    },
    {} as Record<string, TreasuryMovement[]>
  );

  return (
    <div className="bg-background rounded-xl border border-border divide-y divide-border overflow-hidden">
      {Object.entries(groupedMovements).map(([date, dayMovements]) => (
        <div key={date}>
          {/* Date header */}
          <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
            <span className="text-sm font-medium text-foreground">
              {new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Movements for this date */}
          {dayMovements.map((movement) => {
            const colors = DIRECTION_COLORS[movement.direction];
            return (
              <div
                key={movement.id}
                className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Direction icon */}
                <div className={`p-2.5 rounded-full ${colors.bg}`}>
                  {movement.direction === 'in' ? (
                    <ArrowDownCircle className={`w-5 h-5 ${colors.text}`} />
                  ) : (
                    <ArrowUpCircle className={`w-5 h-5 ${colors.text}`} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {movement.counterpart_name || 'Inconnu'}
                    </span>
                    {movement.document_numero && (
                      <button
                        onClick={() => handleInvoiceClick(movement)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {movement.document_numero}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{MOVEMENT_TYPE_LABELS[movement.movement_type]}</span>
                    <span className="text-border">-</span>
                    <span>{PAYMENT_METHOD_LABELS[movement.payment_method]}</span>
                    {movement.reference && (
                      <>
                        <span className="text-border">-</span>
                        <span className="truncate">Ref: {movement.reference}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className={`text-right font-bold text-lg ${colors.text}`}>
                  {movement.direction === 'in' ? '+' : '-'}
                  {formatCurrency(movement.amount, currency)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
