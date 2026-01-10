'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';
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

export default function DealsPage() {
  const { openTab } = useTabsStore();
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currency, setCurrency] = useState<string>('MAD');

  useEffect(() => {
    loadCurrency();
    loadDeals();
  }, [filterStatus]);

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

  async function loadDeals() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }

      const res = await fetch(`/api/deals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load deals');

      const data = await res.json();
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <Button onClick={() => openTab({ type: 'new-deal', path: '/deals/new', title: 'Nouveau Deal' }, true)}>
          Nouveau Deal
        </Button>
      </div>

      <Card className="mb-4">
        <div className="p-4 flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="new">Nouveau</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="won">Gagné</option>
            <option value="lost">Perdu</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : deals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun deal trouvé
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow
                  key={deal.id}
                  onClick={(e) => {
                    const permanent = e.ctrlKey || e.metaKey;
                    openTab(
                      {
                        type: 'deal',
                        path: `/deals/${deal.id}`,
                        title: deal.title,
                        entityId: deal.id,
                      },
                      permanent
                    );
                  }}
                  onDoubleClick={() => {
                    openTab(
                      {
                        type: 'deal',
                        path: `/deals/${deal.id}`,
                        title: deal.title,
                        entityId: deal.id,
                      },
                      true
                    );
                  }}
                  className="cursor-pointer hover:bg-gray-50"
                >
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
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {deal.badges?.map((badge, idx) => (
                        <Badge key={idx} variant={badge.variant as any || 'gray'}>
                          {badge.badge}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {deal.tags?.map((tag, idx) => (
                        <Badge key={idx} variant="gray">
                          {tag.tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
