'use client';

import { useEffect } from 'react';
import { useContextStore } from '@/lib/stores/context-store';
import { useTabsStore } from '@/lib/stores/tabs-store';
import {
  type ContextId,
  getContextIdFromPathname,
  contextIdToString,
  getContextLabel,
} from '@/lib/chat/context';

/**
 * Hook qui synchronise automatiquement le contexte avec l'onglet actif
 * Détecte les changements d'onglet et met à jour le contexte du chat
 */
export function useCurrentContext() {
  const { getActiveTab } = useTabsStore();
  const activeTab = getActiveTab();

  const {
    currentContextId,
    setCurrentContext,
    getCurrentState,
    markContextDirty,
  } = useContextStore();

  // Synchroniser le contexte avec l'onglet actif
  useEffect(() => {
    // Utiliser le path de l'onglet actif, ou '/' par défaut
    const tabPath = activeTab?.path || '/';

    const newContextId = getContextIdFromPathname(tabPath);
    const currentKey = currentContextId ? contextIdToString(currentContextId) : null;
    const newKey = contextIdToString(newContextId);

    // Ne mettre à jour que si le contexte a changé
    if (currentKey !== newKey) {
      setCurrentContext(newContextId);
    }
  }, [activeTab?.path, activeTab?.id, currentContextId, setCurrentContext]);

  const currentState = getCurrentState();

  return {
    contextId: currentContextId,
    contextKey: currentContextId ? contextIdToString(currentContextId) : null,
    contextLabel: currentContextId ? getContextLabel(currentContextId) : null,
    contextState: currentState,
    messages: currentState?.messages || [],
    mode: currentState?.mode || 'auto',
    working: currentState?.working || null,
    isDirty: currentState?.isDirty || false,
    markDirty: () => markContextDirty(),
  };
}

/**
 * Hook pour obtenir le contexte sans synchronisation automatique
 * Utile pour les composants qui ne doivent pas déclencher de navigation
 */
export function useContextState() {
  const { currentContextId, getCurrentState, contexts } = useContextStore();

  const currentState = getCurrentState();

  return {
    contextId: currentContextId,
    contextState: currentState,
    contextCount: Object.keys(contexts).length,
  };
}

/**
 * Hook pour créer un contexte manuellement (pour les modales, drawers, etc.)
 */
export function useManualContext(contextId: ContextId | null) {
  const { getContextState, setCurrentContext } = useContextStore();

  useEffect(() => {
    if (contextId) {
      setCurrentContext(contextId);
    }
  }, [contextId, setCurrentContext]);

  return contextId ? getContextState(contextId) : null;
}

/**
 * Hook pour émettre des événements de contexte
 */
export function useContextEvents() {
  const { handleContextEvent, markContextDirty } = useContextStore();

  return {
    onEntityCreated: (contextId?: ContextId) =>
      handleContextEvent('entity_created', contextId),
    onEntityUpdated: (contextId?: ContextId) =>
      handleContextEvent('entity_updated', contextId),
    onEntityDeleted: (contextId?: ContextId) =>
      handleContextEvent('entity_deleted', contextId),
    onStatusChanged: (contextId?: ContextId) =>
      handleContextEvent('status_changed', contextId),
    onDocumentSent: (contextId?: ContextId) =>
      handleContextEvent('document_sent', contextId),
    onPaymentReceived: (contextId?: ContextId) =>
      handleContextEvent('payment_received', contextId),
    markDirty: markContextDirty,
  };
}
