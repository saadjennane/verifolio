'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTabsStore, type EntityType } from '@/lib/stores/tabs-store';

/**
 * Hook pour écouter les triggers de refresh pour un type d'entité
 * et exécuter une fonction de rechargement quand nécessaire.
 *
 * @param entityType - Le type d'entité à surveiller
 * @param onRefresh - La fonction à appeler pour rafraîchir les données
 */
export function useRefreshTrigger(entityType: EntityType, onRefresh: () => void) {
  const refreshTrigger = useTabsStore((state) => state.refreshTriggers[entityType]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Ne pas déclencher au premier rendu
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Déclencher le refresh
    onRefresh();
  }, [refreshTrigger, onRefresh]);
}

/**
 * Hook pour obtenir la fonction triggerRefresh
 */
export function useTriggerRefresh() {
  const triggerRefresh = useTabsStore((state) => state.triggerRefresh);
  return triggerRefresh;
}
