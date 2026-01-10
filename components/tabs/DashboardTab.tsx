'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button } from '@/components/ui';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface Stats {
  clientsCount: number;
  quotesCount: number;
  invoicesCount: number;
  unpaidAmount: number;
  currency: string;
}

export function DashboardTab() {
  const { openTab } = useTabsStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      const [clientsRes, quotesRes, invoicesRes, unpaidRes, currencyRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('quotes').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase
          .from('invoices')
          .select('total_ttc')
          .neq('status', 'payee'),
        fetch('/api/settings/currency').then(r => r.json()),
      ]);

      const unpaidAmount = unpaidRes.data?.reduce(
        (sum, inv) => sum + Number(inv.total_ttc || 0),
        0
      ) || 0;

      setStats({
        clientsCount: clientsRes.count || 0,
        quotesCount: quotesRes.count || 0,
        invoicesCount: invoicesRes.count || 0,
        unpaidAmount,
        currency: currencyRes.data?.currency || 'EUR',
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const handleQuickAction = (type: 'new-client' | 'new-quote' | 'new-invoice') => {
    const configs = {
      'new-client': { type: 'new-client' as const, path: '/clients/new', title: 'Nouveau client' },
      'new-quote': { type: 'new-quote' as const, path: '/quotes/new', title: 'Nouveau devis' },
      'new-invoice': { type: 'new-invoice' as const, path: '/invoices/new', title: 'Nouvelle facture' },
    };
    openTab(configs[type], true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Bienvenue sur Verifolio</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Clients"
            value={stats?.clientsCount || 0}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="blue"
          />
          <StatCard
            title="Devis"
            value={stats?.quotesCount || 0}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="green"
          />
          <StatCard
            title="Factures"
            value={stats?.invoicesCount || 0}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            }
            color="purple"
          />
          <StatCard
            title="Impayés"
            value={`${(stats?.unpaidAmount || 0).toFixed(0)} ${getCurrencySymbol(stats?.currency)}`}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="orange"
          />
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleQuickAction('new-client')}>
              + Nouveau client
            </Button>
            <Button variant="secondary" onClick={() => handleQuickAction('new-quote')}>
              + Nouveau devis
            </Button>
            <Button variant="secondary" onClick={() => handleQuickAction('new-invoice')}>
              + Nouvelle facture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}
