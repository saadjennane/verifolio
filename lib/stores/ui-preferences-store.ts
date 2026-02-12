'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIPreferencesState {
  // Todos badge visibility
  showTodosBadge: boolean;

  // Actions
  setShowTodosBadge: (show: boolean) => void;
  toggleTodosBadge: () => void;
}

export const useUIPreferencesStore = create<UIPreferencesState>()(
  persist(
    (set) => ({
      showTodosBadge: true, // Visible par défaut

      setShowTodosBadge: (show) => set({ showTodosBadge: show }),
      toggleTodosBadge: () => set((state) => ({ showTodosBadge: !state.showTodosBadge })),
    }),
    {
      name: 'verifolio-ui-preferences',
    }
  )
);
