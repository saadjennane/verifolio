'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments/types';
import {
  PERIOD_PRESET_LABELS,
  DIRECTION_LABELS,
  MOVEMENT_TYPE_LABELS,
  getPeriodDates,
} from '@/lib/treasury';
import type {
  TreasuryFilters as TreasuryFiltersType,
  PeriodPreset,
  MovementDirection,
  MovementType,
} from '@/lib/treasury/types';
import type { PaymentMethod } from '@/lib/payments/types';
import { Filter, X, Calendar, Search } from 'lucide-react';

interface TreasuryFiltersProps {
  filters: TreasuryFiltersType;
  onFiltersChange: (filters: TreasuryFiltersType) => void;
  periodPreset: PeriodPreset;
  onPeriodPresetChange: (preset: PeriodPreset) => void;
}

export function TreasuryFilters({
  filters,
  onFiltersChange,
  periodPreset,
  onPeriodPresetChange,
}: TreasuryFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePeriodChange = (preset: PeriodPreset) => {
    onPeriodPresetChange(preset);

    if (preset !== 'custom') {
      const { from, to } = getPeriodDates(preset);
      onFiltersChange({ ...filters, from_date: from, to_date: to });
    }
  };

  const handleClearFilters = () => {
    onFiltersChange({
      from_date: filters.from_date,
      to_date: filters.to_date,
    });
  };

  const hasActiveFilters =
    filters.direction || filters.movement_type || filters.payment_method || filters.search;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PERIOD_PRESET_LABELS) as PeriodPreset[]).map((preset) => (
          <Button
            key={preset}
            variant={periodPreset === preset ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodChange(preset)}
          >
            {PERIOD_PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>

      {/* Custom date range */}
      {periodPreset === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={filters.from_date || ''}
            onChange={(e) => onFiltersChange({ ...filters, from_date: e.target.value })}
            className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-muted-foreground">a</span>
          <input
            type="date"
            value={filters.to_date || ''}
            onChange={(e) => onFiltersChange({ ...filters, to_date: e.target.value })}
            className="px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      {/* Advanced filters toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtres avances
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
              !
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-xl border border-border">
          {/* Direction filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Direction
            </label>
            <select
              value={filters.direction || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  direction: (e.target.value as MovementDirection) || undefined,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Toutes</option>
              {(Object.keys(DIRECTION_LABELS) as MovementDirection[]).map((dir) => (
                <option key={dir} value={dir}>
                  {DIRECTION_LABELS[dir]}
                </option>
              ))}
            </select>
          </div>

          {/* Movement type filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
            <select
              value={filters.movement_type || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  movement_type: (e.target.value as MovementType) || undefined,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Tous</option>
              {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((type) => (
                <option key={type} value={type}>
                  {MOVEMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Payment method filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Mode de paiement
            </label>
            <select
              value={filters.payment_method || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  payment_method: (e.target.value as PaymentMethod) || undefined,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Tous</option>
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value || undefined })
                }
                placeholder="Reference, notes, nom..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
