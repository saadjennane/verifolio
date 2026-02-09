'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Building2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { Button, Badge, Input } from '@/components/ui';
import { Checkbox } from '@/components/ui/Checkbox';
import { BulkActionBar } from '@/components/ui/BulkActionBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getCurrencySymbol } from '@/lib/utils/currency';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Client {
  id: string;
  nom: string;
  email: string | null;
  type: 'particulier' | 'entreprise';
  activeDealsCount?: number;
  activeMissionsCount?: number;
}

interface Balance {
  client_id: string;
  total_restant: number;
}

type FilterType = 'all' | 'particulier' | 'entreprise';
type FilterActivity = 'all' | 'active-deals' | 'active-missions';

export function ClientsListTab() {
  const { openTab } = useTabsStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [balances, setBalances] = useState<Map<string, Balance>>(new Map());
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterActivity, setFilterActivity] = useState<FilterActivity>('all');

  // Filter clients based on search and filters
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = client.nom.toLowerCase().includes(query);
        const matchesEmail = client.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      if (filterType !== 'all' && client.type !== filterType) {
        return false;
      }
      if (filterActivity === 'active-deals' && (client.activeDealsCount || 0) === 0) {
        return false;
      }
      if (filterActivity === 'active-missions' && (client.activeMissionsCount || 0) === 0) {
        return false;
      }
      return true;
    });
  }, [clients, searchQuery, filterType, filterActivity]);

  const bulk = useBulkSelection({
    items: filteredClients,
    getItemId: (c) => c.id,
  });

  const fetchClients = useCallback(async () => {
    const supabase = createClient();

    const clientsRes = await supabase
      .from('clients')
      .select('id, nom, email, type, is_client')
      .eq('is_client', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (clientsRes.data) {
      setClients(clientsRes.data);
      setLoading(false);
    }

    const [balancesRes, dealsRes, missionsRes, currencyRes] = await Promise.all([
      supabase.from('client_balances').select('client_id, total_restant'),
      supabase
        .from('deals')
        .select('client_id')
        .is('deleted_at', null)
        .not('status', 'in', '("gagne","perdu","archive")'),
      supabase
        .from('missions')
        .select('client_id')
        .is('deleted_at', null)
        .not('status', 'in', '("cloture","annule")'),
      fetch('/api/settings/currency').then(r => r.json()),
    ]);

    if (balancesRes.data) {
      setBalances(new Map(balancesRes.data.map((b) => [b.client_id, b])));
    }

    const dealsCountMap = new Map<string, number>();
    if (dealsRes.data) {
      for (const deal of dealsRes.data) {
        if (deal.client_id) {
          dealsCountMap.set(deal.client_id, (dealsCountMap.get(deal.client_id) || 0) + 1);
        }
      }
    }

    const missionsCountMap = new Map<string, number>();
    if (missionsRes.data) {
      for (const mission of missionsRes.data) {
        if (mission.client_id) {
          missionsCountMap.set(mission.client_id, (missionsCountMap.get(mission.client_id) || 0) + 1);
        }
      }
    }

    if (clientsRes.data) {
      setClients(clientsRes.data.map(c => ({
        ...c,
        activeDealsCount: dealsCountMap.get(c.id) || 0,
        activeMissionsCount: missionsCountMap.get(c.id) || 0,
      })));
    }

    if (currencyRes.data?.currency) {
      setCurrency(currencyRes.data.currency);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useRefreshTrigger('clients', fetchClients);

  const handleClientClick = (e: React.MouseEvent, client: Client) => {
    if (bulk.isSelectionMode) {
      e.preventDefault();
      bulk.toggleItem(client.id);
      return;
    }
    const permanent = e.ctrlKey || e.metaKey;
    openTab(
      {
        type: 'client',
        path: `/clients/${client.id}`,
        title: client.nom,
        entityId: client.id,
      },
      permanent
    );
  };

  const handleClientDoubleClick = (client: Client) => {
    if (bulk.isSelectionMode) return;
    openTab(
      {
        type: 'client',
        path: `/clients/${client.id}`,
        title: client.nom,
        entityId: client.id,
      },
      true
    );
  };

  const handleNewClient = () => {
    openTab(
      { type: 'new-client', path: '/clients/new', title: 'Nouveau client' },
      true
    );
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/clients/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(bulk.selectedIds) }),
      });

      if (response.ok) {
        bulk.exitSelectionMode();
        fetchClients();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkTypeChange = async (newType: 'particulier' | 'entreprise') => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/clients/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(bulk.selectedIds),
          updates: { type: newType },
        }),
      });

      if (response.ok) {
        bulk.exitSelectionMode();
        fetchClients();
      }
    } catch (error) {
      console.error('Bulk update error:', error);
    } finally {
      setIsUpdating(false);
    }
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
          <div className="flex items-center gap-2">
            {clients.length > 0 && (
              <Button
                variant={bulk.isSelectionMode ? 'outline' : 'secondary'}
                onClick={bulk.toggleSelectionMode}
              >
                {bulk.isSelectionMode ? 'Annuler' : 'Modifier'}
              </Button>
            )}
            {!bulk.isSelectionMode && (
              <Button onClick={handleNewClient}>Nouveau client</Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        {!bulk.isSelectionMode && (
          <div className="mb-4 space-y-3">
            <Input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilterType('entreprise')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterType === 'entreprise'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Entreprises
                </button>
                <button
                  onClick={() => setFilterType('particulier')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterType === 'particulier'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Particuliers
                </button>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setFilterActivity('all')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterActivity === 'all'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilterActivity('active-deals')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterActivity === 'active-deals'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Deals actifs
                </button>
                <button
                  onClick={() => setFilterActivity('active-missions')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filterActivity === 'active-missions'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Missions actives
                </button>
              </div>
            </div>

            {(searchQuery || filterType !== 'all' || filterActivity !== 'all') && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouve{filteredClients.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Liste */}
        {filteredClients.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredClients.map((client) => {
              const balance = balances.get(client.id);
              return (
                <button
                  key={client.id}
                  onClick={(e) => handleClientClick(e, client)}
                  onDoubleClick={() => handleClientDoubleClick(client)}
                  className="w-full block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    {bulk.isSelectionMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={bulk.isSelected(client.id)}
                          onCheckedChange={() => bulk.toggleItem(client.id)}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{client.nom}</span>
                          <Badge variant={client.type === 'entreprise' ? 'blue' : 'gray'}>
                            {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                          </Badge>
                          {(client.activeDealsCount || 0) > 0 && (
                            <Badge variant="yellow">
                              {client.activeDealsCount} deal{(client.activeDealsCount || 0) > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {(client.activeMissionsCount || 0) > 0 && (
                            <Badge variant="green">
                              {client.activeMissionsCount} mission{(client.activeMissionsCount || 0) > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        {client.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{client.email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {balance && balance.total_restant > 0 ? (
                          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {Number(balance.total_restant).toFixed(2)} {getCurrencySymbol(currency)} du
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500">A jour</p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            {clients.length > 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun client ne correspond aux filtres</p>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun client pour le moment</p>
                <Button variant="secondary" onClick={handleNewClient}>
                  Creer votre premier client
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {bulk.isSelectionMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          actions={[
            {
              label: 'Supprimer',
              icon: <Trash2 className="h-4 w-4" />,
              variant: 'destructive',
              onClick: () => setShowDeleteConfirm(true),
            },
          ]}
          onSelectAll={bulk.selectAll}
          onDeselectAll={bulk.deselectAll}
          onExit={bulk.exitSelectionMode}
          isAllSelected={bulk.isAllSelected}
          totalCount={filteredClients.length}
        />
      )}

      {/* Type change dropdown - rendered separately */}
      {bulk.isSelectionMode && bulk.hasSelection && (
        <div className="fixed bottom-6 left-1/2 translate-x-32 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" disabled={isUpdating}>
                Changer type
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkTypeChange('entreprise')}>
                <Building2 className="h-4 w-4 mr-2" />
                Entreprise
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkTypeChange('particulier')}>
                <User className="h-4 w-4 mr-2" />
                Particulier
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Supprimer les clients"
        description={`Vous allez supprimer ${bulk.selectedCount} client(s). Cette action peut etre annulee depuis la corbeille.`}
        confirmLabel="Supprimer"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
