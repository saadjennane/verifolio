'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { getTagColorClass } from '@/lib/constants/badges-tags';
import { DealKanbanView } from '@/components/deals/DealKanbanView';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { DealListItem } from '@/lib/deals';

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  new: 'blue',
  draft: 'gray',
  sent: 'yellow',
  won: 'green',
  lost: 'red',
  archived: 'gray',
};

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  draft: 'Brouillon',
  sent: 'Envoyé',
  won: 'Gagné',
  lost: 'Perdu',
  archived: 'Archivé',
};

type ViewMode = 'list' | 'kanban';

export function DealsListTab() {
  const { openTab } = useTabsStore();
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterBadges, setFilterBadges] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currency, setCurrency] = useState<string>('MAD');

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('deals-view-mode');
    if (saved === 'list' || saved === 'kanban') {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    loadDeals();
    loadCurrency();
  }, []);

  async function loadCurrency() {
    try {
      const res = await fetch('/api/settings/currency');
      if (res.ok) {
        const data = await res.json();
        setCurrency(data.data?.currency || 'MAD');
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  }

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const query = supabase
        .from('deals')
        .select(`
          *,
          client:clients(id, nom),
          tags:deal_tags(*),
          badges:deal_badges(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading deals:', error);
      } else {
        setDeals(data as DealListItem[] || []);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Écouter les triggers de refresh depuis le chat
  useRefreshTrigger('deals', loadDeals);

  // Get all unique badges and tags from deals
  const allBadges = useMemo(() => {
    const badgeSet = new Set<string>();
    deals.forEach(deal => {
      deal.badges?.forEach(b => badgeSet.add(b.badge));
    });
    return Array.from(badgeSet).sort();
  }, [deals]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    deals.forEach(deal => {
      deal.tags?.forEach(t => tagSet.add(t.tag));
    });
    return Array.from(tagSet).sort();
  }, [deals]);

  // Filter deals based on search and filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(search);
        const matchesClient = deal.client?.nom.toLowerCase().includes(search);
        if (!matchesTitle && !matchesClient) return false;
      }

      // Status filter
      if (filterStatus.length > 0 && !filterStatus.includes(deal.status)) {
        return false;
      }

      // Badge filter
      if (filterBadges.length > 0) {
        const dealBadges = deal.badges?.map(b => b.badge) || [];
        const hasAllBadges = filterBadges.every(badge => dealBadges.includes(badge));
        if (!hasAllBadges) return false;
      }

      // Tag filter
      if (filterTags.length > 0) {
        const dealTags = deal.tags?.map(t => t.tag) || [];
        const hasAllTags = filterTags.every(tag => dealTags.includes(tag));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [deals, searchTerm, filterStatus, filterBadges, filterTags]);

  function toggleStatusFilter(status: string) {
    setFilterStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }

  function toggleBadgeFilter(badge: string) {
    setFilterBadges(prev =>
      prev.includes(badge)
        ? prev.filter(b => b !== badge)
        : [...prev, badge]
    );
  }

  function toggleTagFilter(tag: string) {
    setFilterTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }

  function clearFilters() {
    setSearchTerm('');
    setFilterStatus([]);
    setFilterBadges([]);
    setFilterTags([]);
  }

  const activeFiltersCount = filterStatus.length + filterBadges.length + filterTags.length + (searchTerm ? 1 : 0);

  function handleNewDeal() {
    openTab({
      type: 'new-deal',
      path: '/deals/new',
      title: 'Nouveau Deal',
    });
  }

  function toggleViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('deals-view-mode', mode);
  }

  async function handleStatusChange(dealId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erreur lors du changement de statut');
        return;
      }

      await loadDeals();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors du changement de statut');
    }
  }

  function handleDealClick(deal: DealListItem) {
    openTab({
      type: 'deal',
      path: `/deals/${deal.id}`,
      title: deal.title,
      entityId: deal.id,
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatAmount(amount: number | null | undefined) {
    if (!amount) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
        <div className="flex items-center gap-3">
          {/* Toggle Liste/Kanban */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => toggleViewMode('list')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => toggleViewMode('kanban')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kanban
            </button>
          </div>
          <Button onClick={handleNewDeal}>
            Nouveau Deal
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-4">
        <div className="p-4 space-y-4">
          {/* Barre de recherche */}
          <div>
            <input
              type="text"
              placeholder="Rechercher par titre ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtres actifs et bouton reset */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Réinitialiser
              </Button>
            </div>
          )}

          {/* Filtres par statut */}
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Statuts</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`px-3 py-1.5 rounded text-sm transition-all ${
                    filterStatus.includes(status)
                      ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres par badges */}
          {allBadges.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2">Badges</div>
              <div className="flex flex-wrap gap-2">
                {allBadges.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => toggleBadgeFilter(badge)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      filterBadges.includes(badge)
                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtres par tags */}
          {allTags.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-3 py-1.5 rounded text-sm transition-all ${
                      filterTags.includes(tag)
                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Vue Kanban */}
      {viewMode === 'kanban' ? (
        loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <DealKanbanView
            deals={filteredDeals}
            onDealClick={handleDealClick}
            onStatusChange={handleStatusChange}
          />
        )
      ) : (
        /* Vue Liste */
        <Card>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {deals.length === 0 ? 'Aucun deal trouvé' : 'Aucun deal ne correspond aux filtres'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Badges</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date création</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow
                    key={deal.id}
                    onClick={() => handleDealClick(deal)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {deal.badges?.map((badge, idx) => (
                          <Badge key={idx} variant={badge.variant as any || 'gray'} className="text-xs">
                            {badge.badge}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {deal.tags?.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`${getTagColorClass(tag.color || 'gray')} px-2 py-0.5 rounded-full text-xs`}
                          >
                            {tag.tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>
                      {deal.client ? deal.client.nom : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[deal.status]}>
                        {statusLabels[deal.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatAmount(deal.estimated_amount)}</TableCell>
                    <TableCell>{formatDate(deal.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
