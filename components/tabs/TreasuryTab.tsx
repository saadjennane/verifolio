'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import {
  TreasuryKPICards,
  TreasuryFilters,
  TreasuryTable,
  EncaissementModal,
  DecaissementModal,
} from '@/components/treasury';
import type {
  TreasuryKPIs,
  TreasuryMovement,
  TreasuryFilters as TreasuryFiltersType,
  CreateEncaissementPayload,
  CreateDecaissementPayload,
  PendingClientInvoice,
  PendingSupplierInvoice,
  PeriodPreset,
} from '@/lib/treasury/types';
import { getPeriodDates } from '@/lib/treasury';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

export function TreasuryTab() {
  const [kpis, setKpis] = useState<TreasuryKPIs | null>(null);
  const [movements, setMovements] = useState<TreasuryMovement[]>([]);
  const [pendingClientInvoices, setPendingClientInvoices] = useState<PendingClientInvoice[]>([]);
  const [pendingSupplierInvoices, setPendingSupplierInvoices] = useState<PendingSupplierInvoice[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [filters, setFilters] = useState<TreasuryFiltersType>(() => {
    const { from, to } = getPeriodDates('this_month');
    return { from_date: from, to_date: to };
  });

  const [showEncaissementModal, setShowEncaissementModal] = useState(false);
  const [showDecaissementModal, setShowDecaissementModal] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const queryParams = new URLSearchParams();
      if (filters.from_date) queryParams.set('from_date', filters.from_date);
      if (filters.to_date) queryParams.set('to_date', filters.to_date);
      if (filters.direction) queryParams.set('direction', filters.direction);
      if (filters.movement_type) queryParams.set('movement_type', filters.movement_type);
      if (filters.payment_method) queryParams.set('payment_method', filters.payment_method);
      if (filters.search) queryParams.set('search', filters.search);

      const [kpisRes, movementsRes, pendingClientRes, pendingSupplierRes] = await Promise.all([
        fetch(`/api/treasury/summary?${queryParams}`),
        fetch(`/api/treasury/movements?${queryParams}`),
        fetch('/api/treasury/pending?type=client'),
        fetch('/api/treasury/pending?type=supplier'),
      ]);

      const [kpisJson, movementsJson, pendingClientJson, pendingSupplierJson] = await Promise.all([
        kpisRes.json(),
        movementsRes.json(),
        pendingClientRes.json(),
        pendingSupplierRes.json(),
      ]);

      setKpis(kpisJson.data);
      setMovements(movementsJson.data || []);
      setPendingClientInvoices(pendingClientJson.data || []);
      setPendingSupplierInvoices(pendingSupplierJson.data || []);
    } catch (error) {
      console.error('Error fetching treasury data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEncaissement = async (data: CreateEncaissementPayload) => {
    const res = await fetch('/api/treasury/encaissement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur');
    }
    fetchData(true);
  };

  const handleDecaissement = async (data: CreateDecaissementPayload) => {
    const res = await fetch('/api/treasury/decaissement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur');
    }
    fetchData(true);
  };

  return (
    <div className="h-full overflow-auto bg-muted/30">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tresorerie</h1>
            <p className="text-muted-foreground mt-1">
              Suivez vos encaissements et decaissements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              onClick={() => setShowEncaissementModal(true)}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <ArrowDownCircle className="w-4 h-4" />
              Encaisser
            </Button>
            <Button
              onClick={() => setShowDecaissementModal(true)}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Decaisser
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <TreasuryKPICards kpis={kpis} loading={loading} />

        {/* Filters */}
        <TreasuryFilters
          filters={filters}
          onFiltersChange={setFilters}
          periodPreset={periodPreset}
          onPeriodPresetChange={setPeriodPreset}
        />

        {/* Movements Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Mouvements</h2>
            <span className="text-sm text-muted-foreground">
              {movements.length} mouvement{movements.length > 1 ? 's' : ''}
            </span>
          </div>
          <TreasuryTable movements={movements} loading={loading} />
        </div>
      </div>

      {/* Modals */}
      <EncaissementModal
        isOpen={showEncaissementModal}
        onClose={() => setShowEncaissementModal(false)}
        onSubmit={handleEncaissement}
        pendingInvoices={pendingClientInvoices}
      />

      <DecaissementModal
        isOpen={showDecaissementModal}
        onClose={() => setShowDecaissementModal(false)}
        onSubmit={handleDecaissement}
        pendingInvoices={pendingSupplierInvoices}
      />
    </div>
  );
}
