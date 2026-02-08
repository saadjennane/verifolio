'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, TabConfig } from '@/lib/types/tabs';

// Type pour identifier les entités à rafraîchir
export type EntityType = 'clients' | 'invoices' | 'quotes' | 'deals' | 'missions' | 'proposals' | 'briefs' | 'contacts' | 'reviews' | 'suppliers' | 'expenses';

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  chatPanelOpen: boolean;
  chatPanelWidth: number;
  sidebarCollapsed: boolean;
  historyPanelOpen: boolean;
  // Compteur de refresh par type d'entité
  refreshTriggers: Record<EntityType, number>;
  // Mobile states
  mobileSidebarOpen: boolean;
  mobileChatOpen: boolean;

  // Actions
  openTab: (tabConfig: TabConfig, permanent?: boolean) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  makeTabPermanent: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;
  setChatPanelWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleHistoryPanel: () => void;
  setHistoryPanelOpen: (open: boolean) => void;
  setTabDirty: (tabId: string, dirty: boolean) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  getActiveTab: () => Tab | null;
  // Nouveau: déclencher un refresh pour un type d'entité
  triggerRefresh: (entityType: EntityType) => void;
  // Mobile actions
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileChat: () => void;
  setMobileChatOpen: (open: boolean) => void;
}

// Dashboard tab pinné par défaut
const DASHBOARD_TAB = {
  id: 'dashboard',
  type: 'dashboard' as const,
  path: '/',
  title: 'Dashboard',
  isPreview: false,
  pinned: true,
};

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [DASHBOARD_TAB],
      activeTabId: 'dashboard',
      chatPanelOpen: true,
      chatPanelWidth: 320,
      sidebarCollapsed: false,
      historyPanelOpen: false,
      refreshTriggers: {
        clients: 0,
        invoices: 0,
        quotes: 0,
        deals: 0,
        missions: 0,
        proposals: 0,
        briefs: 0,
        contacts: 0,
        reviews: 0,
        suppliers: 0,
        expenses: 0,
      },
      mobileSidebarOpen: false,
      mobileChatOpen: false,

      openTab: (tabConfig, permanent = false) => {
        const { tabs } = get();

        // Chercher si un onglet existe déjà pour cette ressource
        const existing = tabs.find(
          (t) =>
            t.type === tabConfig.type &&
            t.path === tabConfig.path &&
            t.entityId === tabConfig.entityId
        );

        if (existing) {
          // Activer l'existant
          set({ activeTabId: existing.id });
          if (permanent && existing.isPreview) {
            set((state) => ({
              tabs: state.tabs.map((t) =>
                t.id === existing.id ? { ...t, isPreview: false } : t
              ),
            }));
          }
          return;
        }

        // Si preview, fermer l'ancien preview
        let updatedTabs = tabs;
        if (!permanent) {
          const previewToClose = tabs.find((t) => t.isPreview);
          if (previewToClose) {
            updatedTabs = tabs.filter((t) => t.id !== previewToClose.id);
          }
        }

        // Créer nouvel onglet
        const newTab: Tab = {
          id: crypto.randomUUID(),
          ...tabConfig,
          isPreview: !permanent,
        };

        set({
          tabs: [...updatedTabs, newTab],
          activeTabId: newTab.id,
        });
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const tabToClose = tabs.find((t) => t.id === tabId);

        // Ne pas fermer les onglets pinned
        if (tabToClose?.pinned) return;

        const index = tabs.findIndex((t) => t.id === tabId);
        const newTabs = tabs.filter((t) => t.id !== tabId);

        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
          // Activer l'onglet adjacent
          if (newTabs.length > 0) {
            const newIndex = Math.min(index, newTabs.length - 1);
            newActiveId = newTabs[newIndex]?.id || null;
          } else {
            newActiveId = null;
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      makeTabPermanent: (tabId) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, isPreview: false } : t
          ),
        })),

      reorderTabs: (fromIndex, toIndex) => {
        const { tabs } = get();
        const newTabs = [...tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        set({ tabs: newTabs });
      },

      toggleChatPanel: () =>
        set((state) => ({
          chatPanelOpen: !state.chatPanelOpen,
        })),

      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),

      setChatPanelWidth: (width) => set({ chatPanelWidth: Math.max(280, Math.min(600, width)) }),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleHistoryPanel: () =>
        set((state) => ({
          historyPanelOpen: !state.historyPanelOpen,
        })),

      setHistoryPanelOpen: (open) => set({ historyPanelOpen: open }),

      setTabDirty: (tabId, dirty) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, isDirty: dirty } : t
          ),
        })),

      updateTabTitle: (tabId, title) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, title } : t
          ),
        })),

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) || null;
      },

      triggerRefresh: (entityType) => {
        set((state) => ({
          refreshTriggers: {
            ...state.refreshTriggers,
            [entityType]: state.refreshTriggers[entityType] + 1,
          },
        }));
      },

      // Mobile actions
      toggleMobileSidebar: () =>
        set((state) => ({
          mobileSidebarOpen: !state.mobileSidebarOpen,
        })),

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      toggleMobileChat: () =>
        set((state) => ({
          mobileChatOpen: !state.mobileChatOpen,
        })),

      setMobileChatOpen: (open) => set({ mobileChatOpen: open }),
    }),
    {
      name: 'verifolio-tabs',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        chatPanelOpen: state.chatPanelOpen,
        chatPanelWidth: state.chatPanelWidth,
        sidebarCollapsed: state.sidebarCollapsed,
        historyPanelOpen: state.historyPanelOpen,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TabsState>;
        // S'assurer que le Dashboard est toujours présent et en première position
        const tabs = persisted.tabs || [];
        const hasDashboard = tabs.some((t) => t.id === 'dashboard');
        const finalTabs = hasDashboard ? tabs : [DASHBOARD_TAB, ...tabs];
        // S'assurer que le dashboard est toujours pinned
        const tabsWithPinnedDashboard = finalTabs.map((t) =>
          t.id === 'dashboard' ? { ...t, pinned: true } : t
        );

        return {
          ...currentState,
          ...persisted,
          tabs: tabsWithPinnedDashboard,
          activeTabId: persisted.activeTabId || 'dashboard',
        };
      },
    }
  )
);
