'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, Target, ChevronRight } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface OverdueInvoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

interface Action {
  id: string;
  type: 'relance' | 'suivi' | 'action';
  label: string;
  entityType: 'invoice' | 'quote' | 'deal';
  entityId: string;
}

interface DashboardReport {
  revenue: number;
  unpaid: number;
  overdueCount: number;
  overdueInvoices: OverdueInvoice[];
  actions: Action[];
  currency: string;
}

export function DailyReportCard() {
  const { openTab } = useTabsStore();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/report');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de chargement');
      }

      setReport(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleActionClick = (action: Action) => {
    const pathMap: Record<string, string> = {
      invoice: '/invoices',
      quote: '/quotes',
      deal: '/deals',
    };
    const basePath = pathMap[action.entityType];
    if (basePath) {
      openTab(
        {
          type: action.entityType as 'invoice' | 'quote' | 'deal',
          path: `${basePath}/${action.entityId}`,
          title: action.label.slice(0, 30),
          entityId: action.entityId,
        },
        true
      );
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = getCurrencySymbol(report?.currency || 'EUR');
    return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${symbol}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchReport()}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-medium text-gray-900">Rapport du jour</h2>
        </div>
        <button
          onClick={() => fetchReport(true)}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          title="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        <MetricCard
          label="CA du mois"
          value={formatCurrency(report.revenue)}
          color="green"
        />
        <MetricCard
          label="Impayés"
          value={formatCurrency(report.unpaid)}
          color={report.unpaid > 0 ? 'orange' : 'gray'}
        />
        <MetricCard
          label="Factures en retard"
          value={report.overdueCount.toString()}
          color={report.overdueCount > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Actions */}
      {report.actions.length > 0 && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-700">Actions prioritaires</h3>
          </div>
          <div className="space-y-2">
            {report.actions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="w-full flex items-center gap-3 p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-gray-700">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {report.actions.length === 0 && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <span className="text-green-600 text-sm">
              Tout est en ordre ! Aucune action urgente.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  color: 'green' | 'orange' | 'red' | 'gray';
}

function MetricCard({ label, value, color }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
  };

  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
