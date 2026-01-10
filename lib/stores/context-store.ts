'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ContextId,
  type ContextState,
  type ContextMessage,
  type ContextEvent,
  contextIdToString,
  createInitialContextState,
  areContextsEqual,
  createDashboardContext,
  shouldRecalculateContext,
} from '@/lib/chat/context';
import { type ChatMode, getNextMode } from '@/lib/chat/modes';
import { type WorkingState, initialWorkingState } from '@/lib/chat/working';

// ============================================================================
// Store Interface
// ============================================================================

interface ContextStore {
  // State
  contexts: Record<string, ContextState>;
  currentContextId: ContextId | null;

  // Navigation
  setCurrentContext: (contextId: ContextId) => void;

  // Messages
  addMessage: (message: Omit<ContextMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Mode
  setMode: (mode: ChatMode) => void;
  cycleMode: () => void;

  // Working
  setWorking: (working: WorkingState | null) => void;

  // Suggestions
  dismissSuggestion: (suggestionId: string) => void;
  isSuggestionDismissed: (suggestionId: string) => boolean;

  // Context Events
  markContextDirty: (contextId?: ContextId) => void;
  handleContextEvent: (event: ContextEvent, contextId?: ContextId) => void;

  // Getters
  getCurrentState: () => ContextState | null;
  getContextState: (contextId: ContextId) => ContextState | null;

  // Cleanup
  clearAllContexts: () => void;
  clearOldContexts: (maxAge: number) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialGreeting: ContextMessage = {
  id: 'greeting',
  role: 'assistant',
  content: 'Salut ! Comment je peux t\'aider ?',
  timestamp: new Date(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useContextStore = create<ContextStore>()(
  persist(
    (set, get) => ({
      contexts: {},
      currentContextId: null,

      // ======================================================================
      // Navigation
      // ======================================================================
      setCurrentContext: (contextId) => {
        const key = contextIdToString(contextId);
        const { contexts, currentContextId } = get();

        // Si même contexte, ne rien faire
        if (areContextsEqual(contextId, currentContextId)) {
          return;
        }

        // Si contexte existe, restaurer
        if (contexts[key]) {
          set({
            currentContextId: contextId,
            contexts: {
              ...contexts,
              [key]: {
                ...contexts[key],
                lastInteraction: new Date(),
              },
            },
          });
          return;
        }

        // Nouveau contexte
        const newState = createInitialContextState(contextId);
        newState.messages = [{ ...initialGreeting, timestamp: new Date() }];

        set({
          currentContextId: contextId,
          contexts: {
            ...contexts,
            [key]: newState,
          },
        });
      },

      // ======================================================================
      // Messages
      // ======================================================================
      addMessage: (message) => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        const newMessage: ContextMessage = {
          ...message,
          id: Date.now().toString(),
          timestamp: new Date(),
        };

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              messages: [...currentState.messages, newMessage],
              lastInteraction: new Date(),
            },
          },
        });
      },

      clearMessages: () => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              messages: [{ ...initialGreeting, timestamp: new Date() }],
              lastInteraction: new Date(),
            },
          },
        });
      },

      // ======================================================================
      // Mode
      // ======================================================================
      setMode: (mode) => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              mode,
              lastInteraction: new Date(),
            },
          },
        });
      },

      cycleMode: () => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        const nextMode = getNextMode(currentState.mode);

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              mode: nextMode,
              lastInteraction: new Date(),
            },
          },
        });
      },

      // ======================================================================
      // Working
      // ======================================================================
      setWorking: (working) => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              working,
              lastInteraction: new Date(),
            },
          },
        });
      },

      // ======================================================================
      // Suggestions
      // ======================================================================
      dismissSuggestion: (suggestionId) => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        if (currentState.dismissedSuggestions.includes(suggestionId)) return;

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              dismissedSuggestions: [...currentState.dismissedSuggestions, suggestionId],
              lastInteraction: new Date(),
            },
          },
        });
      },

      isSuggestionDismissed: (suggestionId) => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return false;

        const key = contextIdToString(currentContextId);
        const currentState = contexts[key];
        if (!currentState) return false;

        return currentState.dismissedSuggestions.includes(suggestionId);
      },

      // ======================================================================
      // Context Events
      // ======================================================================
      markContextDirty: (contextId) => {
        const { currentContextId, contexts } = get();
        const targetContextId = contextId || currentContextId;
        if (!targetContextId) return;

        const key = contextIdToString(targetContextId);
        const currentState = contexts[key];
        if (!currentState) return;

        set({
          contexts: {
            ...contexts,
            [key]: {
              ...currentState,
              isDirty: true,
            },
          },
        });
      },

      handleContextEvent: (event, contextId) => {
        if (shouldRecalculateContext(event)) {
          get().markContextDirty(contextId);
        }
      },

      // ======================================================================
      // Getters
      // ======================================================================
      getCurrentState: () => {
        const { currentContextId, contexts } = get();
        if (!currentContextId) return null;

        const key = contextIdToString(currentContextId);
        return contexts[key] || null;
      },

      getContextState: (contextId) => {
        const { contexts } = get();
        const key = contextIdToString(contextId);
        return contexts[key] || null;
      },

      // ======================================================================
      // Cleanup
      // ======================================================================
      clearAllContexts: () => {
        set({
          contexts: {},
          currentContextId: null,
        });
      },

      clearOldContexts: (maxAge) => {
        const { contexts, currentContextId } = get();
        const now = new Date().getTime();

        const filteredContexts: Record<string, ContextState> = {};

        for (const [key, state] of Object.entries(contexts)) {
          const age = now - state.lastInteraction.getTime();

          // Garder le contexte courant et les contextes récents
          const isCurrentContext = currentContextId && contextIdToString(currentContextId) === key;
          if (isCurrentContext || age < maxAge) {
            filteredContexts[key] = state;
          }
        }

        set({ contexts: filteredContexts });
      },
    }),
    {
      name: 'verifolio-contexts',
      partialize: (state) => ({
        contexts: state.contexts,
        currentContextId: state.currentContextId,
      }),
      // Reconstituer les dates après hydratation
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convertir les strings en Date
          for (const key in state.contexts) {
            const ctx = state.contexts[key];
            ctx.lastInteraction = new Date(ctx.lastInteraction);
            ctx.messages = ctx.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
          }
        }
      },
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

export function useCurrentContextMessages(): ContextMessage[] {
  const getCurrentState = useContextStore((s) => s.getCurrentState);
  const state = getCurrentState();
  return state?.messages || [];
}

export function useCurrentContextMode(): ChatMode {
  const getCurrentState = useContextStore((s) => s.getCurrentState);
  const state = getCurrentState();
  return state?.mode || 'auto';
}

export function useCurrentContextWorking(): WorkingState | null {
  const getCurrentState = useContextStore((s) => s.getCurrentState);
  const state = getCurrentState();
  return state?.working || null;
}
