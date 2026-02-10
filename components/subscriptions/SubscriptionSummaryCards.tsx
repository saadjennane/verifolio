'use client';

import { RefreshCw, Wallet, AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/currency';
import type { SubscriptionsSummary } from '@/lib/subscriptions';

interface SubscriptionSummaryCardsProps {
  summary: SubscriptionsSummary | null;
  currency?: string;
  loading?: boolean;
}

export function SubscriptionSummaryCards({
  summary,
  currency = 'MAD',
  loading = false,
}: SubscriptionSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-24" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Cout mensuel',
      value: formatCurrency(summary?.total_monthly || 0, currency),
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Abonnements actifs',
      value: summary?.active_count?.toString() || '0',
      icon: RefreshCw,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'A payer',
      value: summary?.pending_payments?.toString() || '0',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'En retard',
      value: summary?.overdue_payments?.toString() || '0',
      icon: AlertCircle,
      color: summary?.overdue_payments ? 'text-red-600' : 'text-gray-400',
      bgColor: summary?.overdue_payments ? 'bg-red-50' : 'bg-gray-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
