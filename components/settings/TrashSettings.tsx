'use client';

import { useState, useEffect } from 'react';
import { Button, Badge } from '@/components/ui';
import type { TrashedItem, TrashEntityType } from '@/lib/trash/types';
import { ENTITY_TYPE_LABELS, calculateDaysRemaining } from '@/lib/trash/types';

const ENTITY_ICONS: Record<TrashEntityType, string> = {
  client: '👤',
  contact: '📇',
  deal: '🤝',
  mission: '📋',
  quote: '📄',
  invoice: '🧾',
  proposal: '📑',
};

const ENTITY_BADGE_VARIANTS: Record<TrashEntityType, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  client: 'blue',
  contact: 'gray',
  deal: 'green',
  mission: 'yellow',
  quote: 'gray',
  invoice: 'blue',
  proposal: 'gray',
};

export function TrashSettings() {
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<TrashedItem | null>(null);

  useEffect(() => {
    fetchTrashedItems();
  }, []);

  async function fetchTrashedItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trash');
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors du chargement');
      }

      setItems(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(item: TrashedItem) {
    setRestoring(item.id);
    try {
      const res = await fetch(`/api/trash/${item.entity_type}/${item.id}/restore`, {
        method: 'POST',
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erreur lors de la restauration');
      }

      // Remove from list
      setItems(prev => prev.filter(i => i.id !== item.id));
      setShowRestoreConfirm(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-xl">🗑️</span>
          <div>
            <h3 className="font-medium text-amber-800">Corbeille</h3>
            <p className="text-sm text-amber-700 mt-1">
              Les elements supprimes sont conserves pendant 30 jours avant d&apos;etre definitivement supprimes.
              Vous pouvez les restaurer a tout moment pendant cette periode.
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Items list */}
      {items.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {items.map((item) => {
            const daysRemaining = calculateDaysRemaining(item.deleted_at);
            const isUrgent = daysRemaining <= 7;

            return (
              <div
                key={`${item.entity_type}-${item.id}`}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <span className="text-2xl">{ENTITY_ICONS[item.entity_type]}</span>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.title}</span>
                      <Badge variant={ENTITY_BADGE_VARIANTS[item.entity_type]}>
                        {ENTITY_TYPE_LABELS[item.entity_type]}
                      </Badge>
                    </div>
                    <p className={`text-sm mt-0.5 ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {daysRemaining > 0
                        ? `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
                        : 'Suppression imminente'
                      }
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRestoreConfirm(item)}
                  disabled={restoring === item.id}
                >
                  {restoring === item.id ? 'Restauration...' : 'Restaurer'}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <span className="text-4xl mb-4 block">🗑️</span>
          <p className="text-gray-500">La corbeille est vide</p>
          <p className="text-sm text-gray-400 mt-1">
            Les elements que vous supprimez apparaitront ici
          </p>
        </div>
      )}

      {/* Restore confirmation modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Restaurer cet element ?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              L&apos;element <strong>{showRestoreConfirm.title}</strong> ({ENTITY_TYPE_LABELS[showRestoreConfirm.entity_type]})
              sera restaure et accessible a nouveau.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowRestoreConfirm(null)}
                disabled={restoring !== null}
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleRestore(showRestoreConfirm)}
                loading={restoring === showRestoreConfirm.id}
              >
                Restaurer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
