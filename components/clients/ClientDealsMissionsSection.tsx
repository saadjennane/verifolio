'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface ClientDealsMissionsSectionProps {
  clientId: string;
  currency?: string;
}

interface DealItem {
  id: string;
  title: string;
  status: string;
  estimated_amount: number | null;
  created_at: string;
}

interface MissionItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

type TabId = 'deals' | 'missions';

const statusLabels: Record<string, string> = {
  // Deal statuses
  new: 'Nouveau',
  draft: 'Brouillon',
  sent: 'Envoyé',
  won: 'Gagné',
  lost: 'Perdu',
  archived: 'Archivé',
  // Mission statuses
  in_progress: 'En cours',
  delivered: 'Livrée',
  to_invoice: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  closed: 'Fermée',
  cancelled: 'Annulée',
};

const statusVariants: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  // Deal statuses
  new: 'blue',
  draft: 'gray',
  sent: 'yellow',
  won: 'green',
  lost: 'red',
  archived: 'gray',
  // Mission statuses
  in_progress: 'blue',
  delivered: 'green',
  to_invoice: 'yellow',
  invoiced: 'yellow',
  paid: 'green',
  closed: 'gray',
  cancelled: 'red',
};

export function ClientDealsMissionsSection({ clientId, currency = 'EUR' }: ClientDealsMissionsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('deals');
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [dealsRes, missionsRes] = await Promise.all([
        supabase
          .from('deals')
          .select('id, title, status, estimated_amount, created_at')
          .eq('client_id', clientId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('missions')
          .select('id, title, status, created_at')
          .eq('client_id', clientId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ]);

      if (dealsRes.data) setDeals(dealsRes.data);
      if (missionsRes.data) setMissions(missionsRes.data);
      setLoading(false);
    }

    fetchData();
  }, [clientId]);

  const tabItems: { id: TabId; label: string; count: number }[] = [
    { id: 'deals', label: 'Deals', count: deals.length },
    { id: 'missions', label: 'Missions', count: missions.length },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-4">
        <nav className="flex gap-6">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'deals' && (
          <div className="space-y-2">
            {deals.length > 0 ? (
              deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{deal.title}</div>
                      {deal.estimated_amount && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {Number(deal.estimated_amount).toLocaleString('fr-FR')} {getCurrencySymbol(currency)}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusVariants[deal.status] || 'gray'}>
                      {statusLabels[deal.status] || deal.status}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Aucun deal</p>
            )}
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-2">
            {missions.length > 0 ? (
              missions.map((mission) => (
                <Link
                  key={mission.id}
                  href={`/missions/${mission.id}`}
                  className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{mission.title}</div>
                    <Badge variant={statusVariants[mission.status] || 'gray'}>
                      {statusLabels[mission.status] || mission.status}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Aucune mission</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
