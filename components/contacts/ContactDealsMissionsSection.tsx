'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';

interface ContactDealsMissionsSectionProps {
  contactId: string;
}

interface DealItem {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
}

interface MissionItem {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
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

export function ContactDealsMissionsSection({ contactId }: ContactDealsMissionsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('deals');
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch deals linked to this contact
      const { data: dealContacts } = await supabase
        .from('deal_contacts')
        .select(`
          deal:deals(
            id,
            title,
            status,
            client:clients(nom)
          )
        `)
        .eq('contact_id', contactId);

      if (dealContacts) {
        const dealsList: DealItem[] = [];
        for (const dc of dealContacts) {
          // Supabase may return nested relations as arrays
          const rawDeal = dc.deal as unknown;
          const dealData = Array.isArray(rawDeal) ? rawDeal[0] : rawDeal;
          if (dealData && typeof dealData === 'object') {
            const d = dealData as Record<string, unknown>;
            // Handle client array from Supabase join
            const rawClient = d.client as unknown;
            const clientData = Array.isArray(rawClient) ? rawClient[0] : rawClient;
            dealsList.push({
              id: d.id as string,
              title: d.title as string,
              status: d.status as string,
              client_name: clientData && typeof clientData === 'object'
                ? (clientData as Record<string, unknown>).nom as string
                : null,
            });
          }
        }
        setDeals(dealsList);
      }

      // Fetch missions linked to this contact
      const { data: missionContacts } = await supabase
        .from('mission_contacts')
        .select(`
          mission:missions(
            id,
            title,
            status,
            client:clients(nom)
          )
        `)
        .eq('contact_id', contactId);

      if (missionContacts) {
        const missionsList: MissionItem[] = [];
        for (const mc of missionContacts) {
          // Supabase may return nested relations as arrays
          const rawMission = mc.mission as unknown;
          const missionData = Array.isArray(rawMission) ? rawMission[0] : rawMission;
          if (missionData && typeof missionData === 'object') {
            const m = missionData as Record<string, unknown>;
            // Handle client array from Supabase join
            const rawClient = m.client as unknown;
            const clientData = Array.isArray(rawClient) ? rawClient[0] : rawClient;
            missionsList.push({
              id: m.id as string,
              title: m.title as string,
              status: m.status as string,
              client_name: clientData && typeof clientData === 'object'
                ? (clientData as Record<string, unknown>).nom as string
                : null,
            });
          }
        }
        setMissions(missionsList);
      }

      setLoading(false);
    }

    fetchData();
  }, [contactId]);

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
                      {deal.client_name && (
                        <p className="text-sm text-gray-500 mt-0.5">{deal.client_name}</p>
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
                    <div>
                      <div className="font-medium text-gray-900">{mission.title}</div>
                      {mission.client_name && (
                        <p className="text-sm text-gray-500 mt-0.5">{mission.client_name}</p>
                      )}
                    </div>
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
