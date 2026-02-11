'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { MissionListItem } from '@/lib/missions';

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  in_progress: 'blue',
  delivered: 'yellow',
  to_invoice: 'yellow',
  invoiced: 'blue',
  paid: 'green',
  closed: 'gray',
  cancelled: 'red',
};

const statusLabels: Record<string, string> = {
  in_progress: 'En cours',
  delivered: 'Livrée',
  to_invoice: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  closed: 'Clôturée',
  cancelled: 'Annulée',
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVerifolio, setFilterVerifolio] = useState<string>('all');
  const [currency, setCurrency] = useState<string>('EUR');

  useEffect(() => {
    loadCurrency();
    loadMissions();
  }, [filterStatus, filterVerifolio]);

  async function loadCurrency() {
    try {
      const res = await fetch('/api/settings/currency');
      if (res.ok) {
        const data = await res.json();
        setCurrency(data.data?.currency || 'EUR');
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  }

  async function loadMissions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      if (filterVerifolio !== 'all') {
        params.set('visible_on_verifolio', filterVerifolio);
      }

      const res = await fetch(`/api/missions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load missions');

      const data = await res.json();
      setMissions(data.missions || []);
    } catch (error) {
      console.error('Error loading missions:', error);
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
        <h1 className="text-2xl font-bold">Missions</h1>
        <Button onClick={() => window.location.href = '/missions/new'}>
          Nouvelle Mission
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
            <option value="in_progress">En cours</option>
            <option value="delivered">Livrée</option>
            <option value="to_invoice">À facturer</option>
            <option value="invoiced">Facturée</option>
            <option value="paid">Payée</option>
            <option value="closed">Clôturée</option>
            <option value="cancelled">Annulée</option>
          </select>

          <select
            value={filterVerifolio}
            onChange={(e) => setFilterVerifolio(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">Verifolio: Tous</option>
            <option value="true">Visible sur Verifolio</option>
            <option value="false">Non visible</option>
          </select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : missions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucune mission trouvée
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date début</TableHead>
                <TableHead>Verifolio</TableHead>
                <TableHead>Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missions.map((mission) => (
                <TableRow
                  key={mission.id}
                  onClick={() => window.location.href = `/missions/${mission.id}`}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <TableCell className="font-medium">{mission.title}</TableCell>
                  <TableCell>
                    {mission.client ? mission.client.nom : '-'}
                  </TableCell>
                  <TableCell>
                    {mission.deal ? mission.deal.title : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[mission.status]}>
                      {statusLabels[mission.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatAmount(mission.final_amount || mission.estimated_amount)}</TableCell>
                  <TableCell>{mission.started_at ? formatDate(mission.started_at) : '-'}</TableCell>
                  <TableCell>
                    {mission.visible_on_verifolio ? (
                      <Badge variant="green">Visible</Badge>
                    ) : (
                      <Badge variant="gray">Non visible</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {mission.badges?.map((badge, idx) => (
                        <Badge key={idx} variant={badge.variant as any || 'gray'}>
                          {badge.badge}
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
