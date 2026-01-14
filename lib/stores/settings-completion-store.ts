'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsCompletionState {
  // Whether user has dismissed the widget after reaching 100%
  dismissed: boolean;
  // Whether the celebration toast has been shown for 100%
  celebrationShown: boolean;
  // Trigger to force refetch (increments on invalidate)
  invalidateCounter: number;

  // Actions
  dismiss: () => void;
  markCelebrationShown: () => void;
  reset: () => void;
  invalidateCache: () => void;
}

export const useSettingsCompletionStore = create<SettingsCompletionState>()(
  persist(
    (set) => ({
      dismissed: false,
      celebrationShown: false,
      invalidateCounter: 0,

      dismiss: () => set({ dismissed: true }),
      markCelebrationShown: () => set({ celebrationShown: true }),
      reset: () => set({ dismissed: false, celebrationShown: false, invalidateCounter: 0 }),
      invalidateCache: () => {
        // Clear sessionStorage cache
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('verifolio-settings-completion-cache');
          } catch {
            // Ignore
          }
        }
        // Increment counter to trigger refetch in hook
        set((state) => ({ invalidateCounter: state.invalidateCounter + 1 }));
      },
    }),
    {
      name: 'verifolio-settings-completion',
    }
  )
);
