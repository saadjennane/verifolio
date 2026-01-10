'use client';

import { useState, useEffect } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { ActivityLog } from '@/lib/activity/types';
import type { TabType } from '@/lib/types/tabs';

// Map entity types to navigation paths
function getEntityPath(entityType: string, entityId: string): string {
  const paths: Record<string, string> = {
    client: `/clients/${entityId}`,
    contact: `/contacts/${entityId}`,
    deal: `/deals/${entityId}`,
    mission: `/missions/${entityId}`,
    quote: `/quotes/${entityId}`,
    invoice: `/invoices/${entityId}`,
    proposal: `/proposals/${entityId}`,
    brief: `/briefs/${entityId}`,
    review_request: `/reviews/requests/${entityId}`,
    supplier: `/suppliers/${entityId}`,
    supplier_consultation: `/suppliers/consultations/${entityId}`,
    supplier_quote: `/suppliers/quotes/${entityId}`,
    supplier_invoice: `/suppliers/invoices/${entityId}`,
    expense: `/expenses/${entityId}`,
  };
  return paths[entityType] || '#';
}

// Map entity types to tab types
function getTabType(entityType: string): TabType {
  const mapping: Record<string, TabType> = {
    client: 'client',
    contact: 'contact',
    deal: 'deal',
    mission: 'mission',
    quote: 'quote',
    invoice: 'invoice',
    proposal: 'proposal',
    brief: 'brief',
    review_request: 'review-request',
    supplier: 'supplier',
    supplier_consultation: 'supplier-consultation',
    supplier_quote: 'supplier-quote',
    supplier_invoice: 'supplier-invoice',
    expense: 'expense',
  };
  return mapping[entityType] || 'dashboard';
}

// Human-readable action labels
const ACTION_LABELS: Record<string, string> = {
  create: 'Créé',
  update: 'Modifié',
  delete: 'Supprimé',
  restore: 'Restauré',
};

// Human-readable entity labels
const ENTITY_LABELS: Record<string, string> = {
  client: 'client',
  contact: 'contact',
  deal: 'deal',
  mission: 'mission',
  quote: 'devis',
  invoice: 'facture',
  proposal: 'proposition',
  brief: 'brief',
  review_request: "demande d'avis",
  supplier: 'fournisseur',
  supplier_consultation: 'consultation',
  supplier_quote: 'devis fournisseur',
  supplier_invoice: 'facture fournisseur',
  expense: 'dépense',
};

// Icon for action type
function ActionIcon({ action }: { action: string }) {
  if (action === 'create') {
    return (
      <svg
        className="w-4 h-4 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    );
  }
  if (action === 'update') {
    return (
      <svg
        className="w-4 h-4 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    );
  }
  if (action === 'delete') {
    return (
      <svg
        className="w-4 h-4 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    );
  }
  if (action === 'restore') {
    return (
      <svg
        className="w-4 h-4 text-purple-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    );
  }
  return null;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ActivityHistoryPanel() {
  const { historyPanelOpen, chatPanelWidth, openTab } = useTabsStore();

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;

  // Fetch activities when panel opens
  useEffect(() => {
    if (!historyPanelOpen) return;

    async function fetchActivities() {
      setLoading(true);
      try {
        const res = await fetch(`/api/activity?limit=${LIMIT}&offset=0`);
        const json = await res.json();
        if (json.data) {
          setActivities(json.data);
          setHasMore(json.data.length === LIMIT);
          setOffset(LIMIT);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [historyPanelOpen]);

  // Load more
  const loadMore = async () => {
    try {
      const res = await fetch(`/api/activity?limit=${LIMIT}&offset=${offset}`);
      const json = await res.json();
      if (json.data) {
        setActivities((prev) => [...prev, ...json.data]);
        setHasMore(json.data.length === LIMIT);
        setOffset((prev) => prev + LIMIT);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    }
  };

  // Navigate to entity
  const handleClick = (activity: ActivityLog) => {
    if (activity.action === 'delete') return; // Can't navigate to deleted items

    const path = getEntityPath(activity.entity_type, activity.entity_id);
    openTab(
      {
        type: getTabType(activity.entity_type),
        path,
        title: activity.entity_title,
        entityId: activity.entity_id,
      },
      true
    );
  };

  if (!historyPanelOpen) return null;

  return (
    <div
      className="flex flex-col bg-gray-50 border-l border-gray-200"
      style={{ width: chatPanelWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="font-medium text-gray-900">Historique</h2>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto">
        {loading && activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Chargement...</div>
        ) : activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Aucune activité</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => handleClick(activity)}
                disabled={activity.action === 'delete'}
                className={`
                  w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors
                  ${activity.action === 'delete' ? 'opacity-60 cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ActionIcon action={activity.action} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {activity.entity_title}
                      </span>
                      {activity.source === 'assistant' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          IA
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ACTION_LABELS[activity.action]}{' '}
                      {ENTITY_LABELS[activity.entity_type] || activity.entity_type} &middot;{' '}
                      {formatRelativeTime(activity.created_at)}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 text-sm text-blue-600 hover:bg-gray-100"
              >
                Charger plus
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
