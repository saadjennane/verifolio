'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useRefreshTrigger } from '@/lib/hooks/useRefreshTrigger';
import { Button, Badge } from '@/components/ui';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface Client {
  id: string;
  nom: string;
  email: string | null;
  type: 'particulier' | 'entreprise';
}

interface Balance {
  client_id: string;
  total_restant: number;
}

export function ClientsListTab() {
  const { openTab } = useTabsStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [balances, setBalances] = useState<Map<string, Balance>>(new Map());
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    const supabase = createClient();

    // Charger d'abord les clients pour afficher rapidement la liste
    const clientsRes = await supabase
      .from('clients')
      .select('id, nom, email, type')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (clientsRes.data) {
      setClients(clientsRes.data);
      setLoading(false); // Afficher la liste immédiatement
    }

    // Charger les balances et la devise en arrière-plan
    const [balancesRes, currencyRes] = await Promise.all([
      supabase.from('client_balances').select('client_id, total_restant'),
      fetch('/api/settings/currency').then(r => r.json()),
    ]);

    if (balancesRes.data) {
      setBalances(new Map(balancesRes.data.map((b) => [b.client_id, b])));
    }

    if (currencyRes.data?.currency) {
      setCurrency(currencyRes.data.currency);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Écouter les triggers de refresh depuis le chat
  useRefreshTrigger('clients', fetchClients);

  const handleClientClick = (
    e: React.MouseEvent,
    client: Client
  ) => {
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <Button onClick={handleNewClient}>Nouveau client</Button>
        </div>

        {/* Liste */}
        {clients.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {clients.map((client) => {
              const balance = balances.get(client.id);
              return (
                <button
                  key={client.id}
                  onClick={(e) => handleClientClick(e, client)}
                  onDoubleClick={() => handleClientDoubleClick(client)}
                  className="w-full block p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{client.nom}</span>
                        <Badge variant={client.type === 'entreprise' ? 'blue' : 'gray'}>
                          {client.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                        </Badge>
                      </div>
                      {client.email && (
                        <p className="text-sm text-gray-500 mt-1">{client.email}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {balance && balance.total_restant > 0 ? (
                        <p className="text-sm font-medium text-orange-600">
                          {Number(balance.total_restant).toFixed(2)} {getCurrencySymbol(currency)} dû
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">À jour</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Aucun client pour le moment</p>
            <Button variant="secondary" onClick={handleNewClient}>
              Créer votre premier client
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
