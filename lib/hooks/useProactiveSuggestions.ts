'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useContextStore } from '@/lib/stores/context-store';
import { type ContextId, contextIdToString } from '@/lib/chat/context';

// ============================================================================
// Types
// ============================================================================

export interface ScreenSuggestion {
  id: string;
  label: string;
  prompt: string;
  source: 'screen' | 'business';
}

interface UseProactiveSuggestionsOptions {
  enabled?: boolean;
  maxSuggestions?: number;
}

interface UseProactiveSuggestionsReturn {
  suggestions: ScreenSuggestion[];
  loading: boolean;
  error: string | null;
  dismissSuggestion: (suggestionId: string) => void;
  dismissAllForScreen: () => void;
  hasSuggestionsBeenShown: boolean;
}

// ============================================================================
// Session Tracking (in-memory, resets on page reload)
// ============================================================================

// Set des écrans où les suggestions ont déjà été affichées dans cette session
const shownScreensThisSession = new Set<string>();

// Set des suggestions dismissées dans cette session (tous écrans confondus)
const dismissedSuggestionsThisSession = new Set<string>();

/**
 * Marque un écran comme "suggestions déjà affichées"
 */
function markScreenAsShown(contextKey: string): void {
  shownScreensThisSession.add(contextKey);
}

/**
 * Vérifie si les suggestions ont déjà été affichées pour cet écran
 */
function hasScreenBeenShown(contextKey: string): boolean {
  return shownScreensThisSession.has(contextKey);
}

/**
 * Marque une suggestion comme dismissée pour cette session
 */
function markSuggestionDismissed(suggestionId: string): void {
  dismissedSuggestionsThisSession.add(suggestionId);
}

/**
 * Vérifie si une suggestion a été dismissée dans cette session
 */
function isSuggestionDismissed(suggestionId: string): boolean {
  return dismissedSuggestionsThisSession.has(suggestionId);
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook pour charger et gérer les suggestions basées sur l'écran
 *
 * Règles:
 * - Une seule apparition par écran par session
 * - Si l'utilisateur ignore et navigue, ne pas réafficher
 * - Si l'utilisateur dismiss, ne plus proposer cette suggestion
 */
export function useProactiveSuggestions(
  contextId: ContextId | null,
  options: UseProactiveSuggestionsOptions = {}
): UseProactiveSuggestionsReturn {
  const { enabled = true, maxSuggestions = 3 } = options;

  const [suggestions, setSuggestions] = useState<ScreenSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSuggestionsBeenShown, setHasSuggestionsBeenShown] = useState(false);

  const { dismissSuggestion: storeDismiss, getCurrentState } = useContextStore();

  // Ref pour éviter les double-fetches
  const fetchedContextRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (ctxId: ContextId, dismissedIds: string[]) => {
    const contextKey = contextIdToString(ctxId);

    // Vérifier si les suggestions ont déjà été affichées pour cet écran
    if (hasScreenBeenShown(contextKey)) {
      console.log('[Suggestions] Screen already shown this session:', contextKey);
      setSuggestions([]);
      setHasSuggestionsBeenShown(true);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const allDismissedIds = [
        ...dismissedIds,
        ...Array.from(dismissedSuggestionsThisSession),
      ];

      const params = new URLSearchParams({
        contextType: ctxId.type,
        contextId: ctxId.id,
      });

      if (allDismissedIds.length > 0) {
        params.set('dismissed', allDismissedIds.join(','));
      }

      console.log('[Suggestions Hook] Fetching from API:', `/api/suggestions?${params}`);
      const response = await fetch(`/api/suggestions?${params}`, {
        signal: controller.signal,
      });

      console.log('[Suggestions Hook] Response status:', response.status);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des suggestions');
      }

      const data = await response.json();
      console.log('[Suggestions Hook] API response:', data);

      const fetchedSuggestions = (data.suggestions as ScreenSuggestion[]).slice(0, maxSuggestions);

      // Filtrer les suggestions déjà dismissées dans la session
      const activeSuggestions = fetchedSuggestions.filter(
        s => !isSuggestionDismissed(s.id)
      );

      console.log('[Suggestions Hook] Active suggestions:', activeSuggestions.length);
      setSuggestions(activeSuggestions);

      // Marquer l'écran comme "vu" seulement si on a des suggestions
      if (activeSuggestions.length > 0) {
        markScreenAsShown(contextKey);
        setHasSuggestionsBeenShown(true);
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[Suggestions] Error fetching:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [maxSuggestions]);

  // Charger les suggestions au changement de contexte
  useEffect(() => {
    console.log('[Suggestions Hook] useEffect:', {
      enabled,
      contextId: contextId ? `${contextId.type}:${contextId.id}` : null,
    });

    if (!enabled || !contextId) {
      console.log('[Suggestions Hook] Skipping - disabled or no contextId');
      setSuggestions([]);
      return;
    }

    const contextKey = contextIdToString(contextId);

    // Éviter de refetch si même contexte
    if (fetchedContextRef.current === contextKey) {
      console.log('[Suggestions Hook] Skipping - already fetched:', contextKey);
      return;
    }

    console.log('[Suggestions Hook] Fetching for:', contextKey);
    fetchedContextRef.current = contextKey;
    setHasSuggestionsBeenShown(hasScreenBeenShown(contextKey));

    // Récupérer les suggestions dismissées du store
    const currentState = getCurrentState();
    const storeDismissedIds = currentState?.dismissedSuggestions || [];

    fetchSuggestions(contextId, storeDismissedIds);

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [contextId, enabled, fetchSuggestions, getCurrentState]);

  // Fonction pour dismiss une suggestion
  const handleDismiss = useCallback((suggestionId: string) => {
    // Marquer comme dismissée dans la session
    markSuggestionDismissed(suggestionId);

    // Mettre à jour le store (persistence)
    storeDismiss(suggestionId);

    // Retirer de la liste locale
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, [storeDismiss]);

  // Fonction pour dismiss toutes les suggestions de l'écran actuel
  const dismissAllForScreen = useCallback(() => {
    if (!contextId) return;

    const contextKey = contextIdToString(contextId);
    markScreenAsShown(contextKey);

    // Dismiss toutes les suggestions actuelles
    suggestions.forEach(s => {
      markSuggestionDismissed(s.id);
      storeDismiss(s.id);
    });

    setSuggestions([]);
    setHasSuggestionsBeenShown(true);
  }, [contextId, suggestions, storeDismiss]);

  return {
    suggestions,
    loading,
    error,
    dismissSuggestion: handleDismiss,
    dismissAllForScreen,
    hasSuggestionsBeenShown,
  };
}

/**
 * Hook simplifié qui utilise le contexte courant automatiquement
 */
export function useCurrentContextSuggestions(
  options: UseProactiveSuggestionsOptions = {}
): UseProactiveSuggestionsReturn {
  const { currentContextId } = useContextStore();
  return useProactiveSuggestions(currentContextId, options);
}
