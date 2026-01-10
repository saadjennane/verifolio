'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { MissionKanbanView } from '@/components/missions/MissionKanbanView';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { MissionListItem } from '@/lib/missions';

type ViewMode = 'list' | 'kanban';

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

export function MissionsListTab() {
  const { openTab } = useTabsStore();
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVerifolio, setFilterVerifolio] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currency, setCurrency] = useState<string>('MAD');

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('missions-view-mode');
    if (saved === 'list' || saved === 'kanban') {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    loadMissions();
    loadCurrency();
  }, [filterStatus, filterVerifolio]);

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

  const loadMissions = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from('missions')
        .select(`
          *,
          client:clients(id, nom),
          deal:deals!missions_deal_id_fkey(id, title),
          badges:mission_badges(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterVerifolio !== 'all') {
        query = query.eq('visible_on_verifolio', filterVerifolio === 'true');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading missions:', error);
      } else {
        setMissions(data as MissionListItem[] || []);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterVerifolio]);

  // Écouter les triggers de refresh depuis le chat
  useRefreshTrigger('missions', loadMissions);

  function handleNewMission() {
    openTab({
      type: 'new-mission',
      path: '/missions/new',
      title: 'Nouvelle mission',
    });
  }

  function handleMissionClick(mission: MissionListItem) {
    openTab({
      type: 'mission',
      path: `/missions/${mission.id}`,
      title: mission.title,
      entityId: mission.id,
    });
  }

  function toggleViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('missions-view-mode', mode);
  }

  async function handleStatusChange(missionId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/missions/${missionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Erreur lors du changement de statut');
        return;
      }

      await loadMissions();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors du changement de statut');
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
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Missions</h1>
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
          <Button onClick={handleNewMission}>
            Nouvelle Mission
          </Button>
        </div>
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

      {/* Vue Kanban */}
      {viewMode === 'kanban' ? (
        loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <MissionKanbanView
            missions={missions}
            onMissionClick={handleMissionClick}
            onStatusChange={handleStatusChange}
          />
        )
      ) : (
        /* Vue Liste */
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
                  onClick={() => handleMissionClick(mission)}
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
      )}
    </div>
  );
}
