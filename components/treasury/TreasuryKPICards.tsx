'use client';

import { formatCurrency } from '@/lib/utils/currency';
import type { TreasuryKPIs } from '@/lib/treasury/types';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Wallet,
  CreditCard,
} from 'lucide-react';

interface TreasuryKPICardsProps {
  kpis: TreasuryKPIs | null;
  currency?: string;
  loading?: boolean;
}

export function TreasuryKPICards({ kpis, currency = 'EUR', loading }: TreasuryKPICardsProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="bg-background rounded-xl border border-border p-4 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-1/2 mb-3" />
            <div className="h-7 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Encaisse',
      value: kpis.total_encaisse,
      icon: ArrowDownCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      label: 'Decaisse',
      value: kpis.total_decaisse,
      icon: ArrowUpCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    {
      label: 'Solde net',
      value: kpis.solde_net,
      icon: TrendingUp,
      color:
        kpis.solde_net >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      bgColor:
        kpis.solde_net >= 0
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-red-50 dark:bg-red-900/20',
      borderColor:
        kpis.solde_net >= 0
          ? 'border-green-200 dark:border-green-800'
          : 'border-red-200 dark:border-red-800',
      highlight: true,
    },
    {
      label: 'A encaisser',
      value: kpis.a_encaisser,
      icon: Wallet,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      label: 'A payer',
      value: kpis.a_payer,
      icon: CreditCard,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    {
      label: 'Retard encaissement',
      value: kpis.en_retard_encaissement,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      warning: kpis.en_retard_encaissement > 0,
    },
    {
      label: 'Retard paiement',
      value: kpis.en_retard_paiement,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      warning: kpis.en_retard_paiement > 0,
    },
    {
      label: 'A venir (IN)',
      value: kpis.a_venir_encaissement,
      icon: Clock,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-700',
    },
    {
      label: 'A venir (OUT)',
      value: kpis.a_venir_paiement,
      icon: Clock,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 transition-all ${card.bgColor} ${card.borderColor} ${
            card.warning ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900' : ''
          } ${card.highlight ? 'md:col-span-1 lg:col-span-1' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate">
              {card.label}
            </span>
          </div>
          <p className={`text-xl font-bold ${card.color} truncate`}>
            {card.value >= 0 ? '' : '-'}
            {formatCurrency(Math.abs(card.value), currency)}
          </p>
        </div>
      ))}
    </div>
  );
}
