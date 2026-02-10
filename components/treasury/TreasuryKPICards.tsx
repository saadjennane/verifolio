'use client';

import { formatCurrency } from '@/lib/utils/currency';
import type { TreasuryKPIs } from '@/lib/treasury/types';
import { TrendingUp, Wallet, CreditCard } from 'lucide-react';

interface TreasuryKPICardsProps {
  kpis: TreasuryKPIs | null;
  currency?: string;
  loading?: boolean;
}

export function TreasuryKPICards({ kpis, currency = 'EUR', loading }: TreasuryKPICardsProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-background rounded-xl border border-border p-5 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-1/3 mb-3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const soldeNet = kpis.solde_net;
  const isPositive = soldeNet >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Solde net */}
      <div
        className={`rounded-xl border p-5 transition-all ${
          isPositive
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-2 rounded-lg ${
              isPositive ? 'bg-green-100 dark:bg-green-800/30' : 'bg-red-100 dark:bg-red-800/30'
            }`}
          >
            <TrendingUp
              className={`w-5 h-5 ${
                isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Solde</span>
        </div>
        <p
          className={`text-2xl font-bold ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {soldeNet >= 0 ? '+' : ''}
          {formatCurrency(soldeNet, currency)}
        </p>
      </div>

      {/* À encaisser */}
      <div className="rounded-xl border p-5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800/30">
            <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">A encaisser</span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(kpis.a_encaisser, currency)}
          </p>
          {kpis.en_retard_encaissement > 0 && (
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              ({formatCurrency(kpis.en_retard_encaissement, currency)} en retard)
            </span>
          )}
        </div>
      </div>

      {/* À payer */}
      <div className="rounded-xl border p-5 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-800/30">
            <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">A payer</span>
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(kpis.a_payer, currency)}
          </p>
          {kpis.en_retard_paiement > 0 && (
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              ({formatCurrency(kpis.en_retard_paiement, currency)} en retard)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
