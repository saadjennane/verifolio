'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, TabConfig, TabOpenedBy } from '@/lib/types/tabs';

// ============================================================
// CONSTANTES
// ============================================================

/** Nombre maximum d'onglets temporaires simultanés */
const MAX_TEMPORARY_TABS = 5;

/** Dashboard tab - toujours présent, jamais fermable */
const DASHBOARD_TAB: Tab = {
  id: 'dashboard',
  type: 'dashboard',
  path: '/',
  title: 'Dashboard',
  isTemporary: false, // Figé par défaut
  pinned: true, // Ne peut jamais être fermé
  openedBy: 'user',
  lastAccessedAt: Date.now(),
};

// ============================================================
// TYPES
// ============================================================

export type EntityType =
  | 'clients'
  | 'invoices'
  | 'quotes'
  | 'deals'
  | 'missions'
  | 'proposals'
  | 'briefs'
  | 'contacts'
  | 'reviews'
  | 'suppliers'
  | 'expenses';

interface OpenTabOptions {
  /** Source de l'ouverture */
  source?: TabOpenedBy;
  /** Forcer l'ouverture comme onglet figé (non temporaire) */
  pinned?: boolean;
  /** Forcer l'ouverture dans un nouvel onglet (Ctrl+Click) */
  forceNew?: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  chatPanelOpen: boolean;
  chatPanelWidth: number;
  sidebarCollapsed: boolean;
  historyPanelOpen: boolean;
  refreshTriggers: Record<EntityType, number>;
  mobileSidebarOpen: boolean;
  mobileChatOpen: boolean;

  // Actions principales
  openTab: (tabConfig: TabConfig, options?: OpenTabOptions | boolean) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Actions de gestion des onglets
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  cleanupTemporaryTabs: () => void;
  closeAllTemporaryTabs: () => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Actions de modification
  setTabDirty: (tabId: string, dirty: boolean) => void;
  updateTabTitle: (tabId: string, title: string) => void;

  // Getters
  getActiveTab: () => Tab | null;
  getTemporaryTabsCount: () => number;

  // Panels
  toggleChatPanel: () => void;
  setChatPanelOpen: (open: boolean) => void;
  setChatPanelWidth: (width: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleHistoryPanel: () => void;
  setHistoryPanelOpen: (open: boolean) => void;

  // Refresh
  triggerRefresh: (entityType: EntityType) => void;

  // Mobile
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileChat: () => void;
  setMobileChatOpen: (open: boolean) => void;

  // Legacy compatibility
  makeTabPermanent: (tabId: string) => void;
}

// ============================================================
// STORE
// ============================================================

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

      // ============================================================
      // openTab - Logique principale d'ouverture
      // ============================================================
      /**
       * Ouvre un onglet avec la logique suivante :
       *
       * R1 - Sidebar : Click simple ouvre un temporaire, remplace si actif est temporaire
       * R2 - Navigation interne : Click navigue dans le même onglet, Ctrl+Click ouvre nouveau
       * R3 - Double-clic : Fige l'onglet (géré par pinTab)
       * R4 - LLM : Ouvre TOUJOURS un nouvel onglet temporaire
       */
      openTab: (tabConfig, optionsOrPermanent) => {
        const { tabs, activeTabId } = get();

        // Support legacy: openTab(config, permanent: boolean)
        const options: OpenTabOptions =
          typeof optionsOrPermanent === 'boolean'
            ? { pinned: optionsOrPermanent }
            : optionsOrPermanent || {};

        const source = options.source || tabConfig.openedBy || 'user';
        const forceNew = options.forceNew || false;
        const forcePinned = options.pinned || false;

        // Chercher si un onglet existe déjà pour cette ressource
        const existing = tabs.find(
          (t) =>
            t.type === tabConfig.type &&
            t.path === tabConfig.path &&
            t.entityId === tabConfig.entityId
        );

        if (existing) {
          // Activer l'existant et mettre à jour lastAccessedAt
          set((state) => ({
            activeTabId: existing.id,
            tabs: state.tabs.map((t) =>
              t.id === existing.id ? { ...t, lastAccessedAt: Date.now() } : t
            ),
          }));

          // Si on veut le figer et qu'il est temporaire, le figer
          if (forcePinned && existing.isTemporary) {
            get().pinTab(existing.id);
          }
          return;
        }

        const currentTab = tabs.find((t) => t.id === activeTabId);
        let updatedTabs = [...tabs];

        // ============================================================
        // RÈGLES D'OUVERTURE
        // ============================================================

        // R4: LLM ouvre TOUJOURS un nouvel onglet temporaire
        const isLlmOpen = source === 'llm';

        // R1: Sidebar - remplace le temporaire actif, ou ouvre un nouveau
        // Ne remplacer que si l'onglet actif est temporaire, non dirty, et source sidebar
        const shouldReplaceCurrentTemporary =
          !isLlmOpen &&
          !forceNew &&
          source === 'sidebar' &&
          currentTab &&
          currentTab.isTemporary &&
          !currentTab.isDirty;

        if (shouldReplaceCurrentTemporary && currentTab) {
          // Remplacer l'onglet temporaire actif
          updatedTabs = tabs.filter((t) => t.id !== currentTab.id);
        }

        // R2: Navigation interne (source 'user' sans forceNew)
        // Naviguer dans le même onglet temporaire si c'est le cas
        if (
          !shouldReplaceCurrentTemporary &&
          !forceNew &&
          !isLlmOpen &&
          source === 'user' &&
          currentTab &&
          currentTab.isTemporary &&
          !currentTab.isDirty
        ) {
          // Naviguer dans le même onglet (mise à jour de son contenu)
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === currentTab.id
                ? {
                    ...t,
                    type: tabConfig.type,
                    path: tabConfig.path,
                    title: tabConfig.title,
                    entityId: tabConfig.entityId,
                    lastAccessedAt: Date.now(),
                  }
                : t
            ),
          }));
          return;
        }

        // Créer nouvel onglet
        const newTab: Tab = {
          id: crypto.randomUUID(),
          type: tabConfig.type,
          path: tabConfig.path,
          title: tabConfig.title,
          entityId: tabConfig.entityId,
          isTemporary: !forcePinned, // Temporaire par défaut, sauf si forcePinned
          openedBy: source,
          lastAccessedAt: Date.now(),
        };

        set({
          tabs: [...updatedTabs, newTab],
          activeTabId: newTab.id,
        });

        // Nettoyer les onglets temporaires excédentaires (F2)
        get().cleanupTemporaryTabs();
      },

      // ============================================================
      // closeTab - Fermer un onglet
      // ============================================================
      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const tabToClose = tabs.find((t) => t.id === tabId);

        // Ne pas fermer les onglets pinned (Dashboard)
        if (tabToClose?.pinned) return;

        // Ne pas fermer les onglets avec contenu non sauvegardé
        if (tabToClose?.isDirty) return;

        const index = tabs.findIndex((t) => t.id === tabId);
        const newTabs = tabs.filter((t) => t.id !== tabId);

        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
          // Activer l'onglet adjacent (préférence droite, puis gauche)
          if (newTabs.length > 0) {
            const newIndex = Math.min(index, newTabs.length - 1);
            newActiveId = newTabs[newIndex]?.id || 'dashboard';
          } else {
            newActiveId = 'dashboard';
          }
        }

        set({ tabs: newTabs, activeTabId: newActiveId });
      },

      // ============================================================
      // setActiveTab - Activer un onglet
      // ============================================================
      setActiveTab: (tabId) => {
        set((state) => ({
          activeTabId: tabId,
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, lastAccessedAt: Date.now() } : t
          ),
        }));
      },

      // ============================================================
      // pinTab - Figer un onglet (R3: double-clic)
      // Transforme un onglet temporaire en onglet figé
      // ============================================================
      pinTab: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId && !t.pinned ? { ...t, isTemporary: false } : t
          ),
        }));
      },

      // ============================================================
      // unpinTab - Rendre un onglet temporaire à nouveau
      // ============================================================
      unpinTab: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId && !t.pinned // Ne pas dé-figer le Dashboard
              ? { ...t, isTemporary: true }
              : t
          ),
        }));
      },

      // ============================================================
      // cleanupTemporaryTabs - F2: Maintenir max 5 temporaires
      // Ferme le plus ancien onglet temporaire NON actif si dépassement
      // ============================================================
      cleanupTemporaryTabs: () => {
        const { tabs, activeTabId } = get();

        // Filtrer les onglets temporaires fermables
        const temporaryTabs = tabs.filter(
          (t) =>
            t.isTemporary &&
            !t.pinned &&
            !t.isDirty &&
            t.id !== activeTabId // Ne pas fermer l'actif
        );

        if (temporaryTabs.length < MAX_TEMPORARY_TABS) return;

        // Trier par lastAccessedAt (plus ancien en premier)
        const sortedByAge = [...temporaryTabs].sort(
          (a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0)
        );

        // Calculer combien fermer
        const toCloseCount = temporaryTabs.length - MAX_TEMPORARY_TABS + 1;
        const tabsToClose = sortedByAge.slice(0, toCloseCount);
        const idsToClose = new Set(tabsToClose.map((t) => t.id));

        set((state) => ({
          tabs: state.tabs.filter((t) => !idsToClose.has(t.id)),
        }));
      },

      // ============================================================
      // closeAllTemporaryTabs - F3/F4: Fermer tous les temporaires
      // Utilisé lors de refresh/logout ou changement de contexte
      // ============================================================
      closeAllTemporaryTabs: () => {
        set((state) => {
          const remainingTabs = state.tabs.filter(
            (t) => !t.isTemporary || t.pinned || t.isDirty
          );

          // Vérifier si l'onglet actif est toujours présent
          const activeStillExists = remainingTabs.some(
            (t) => t.id === state.activeTabId
          );

          return {
            tabs: remainingTabs,
            activeTabId: activeStillExists ? state.activeTabId : 'dashboard',
          };
        });
      },

      // ============================================================
      // reorderTabs - Réordonner les onglets (drag & drop)
      // ============================================================
      reorderTabs: (fromIndex, toIndex) => {
        const { tabs } = get();
        const newTabs = [...tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        set({ tabs: newTabs });
      },

      // ============================================================
      // setTabDirty - Marquer comme modifié (empêche fermeture auto)
      // ============================================================
      setTabDirty: (tabId, dirty) =>
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, isDirty: dirty } : t
          ),
        })),

      // ============================================================
      // updateTabTitle - Mettre à jour le titre
      // ============================================================
      updateTabTitle: (tabId, title) =>
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
        })),

      // ============================================================
      // Getters
      // ============================================================
      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) || null;
      },

      getTemporaryTabsCount: () => {
        const { tabs } = get();
        return tabs.filter((t) => t.isTemporary && !t.pinned).length;
      },

      // ============================================================
      // Legacy compatibility - makeTabPermanent = pinTab
      // ============================================================
      makeTabPermanent: (tabId) => get().pinTab(tabId),

      // ============================================================
      // Panels
      // ============================================================
      toggleChatPanel: () =>
        set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),

      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),

      setChatPanelWidth: (width) =>
        set({ chatPanelWidth: Math.max(280, Math.min(600, width)) }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleHistoryPanel: () =>
        set((state) => ({ historyPanelOpen: !state.historyPanelOpen })),

      setHistoryPanelOpen: (open) => set({ historyPanelOpen: open }),

      // ============================================================
      // Refresh triggers
      // ============================================================
      triggerRefresh: (entityType) => {
        set((state) => ({
          refreshTriggers: {
            ...state.refreshTriggers,
            [entityType]: state.refreshTriggers[entityType] + 1,
          },
        }));
      },

      // ============================================================
      // Mobile
      // ============================================================
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      toggleMobileChat: () =>
        set((state) => ({ mobileChatOpen: !state.mobileChatOpen })),

      setMobileChatOpen: (open) => set({ mobileChatOpen: open }),
    }),
    {
      name: 'verifolio-tabs',
      partialize: (state) => ({
        // F3: Ne persister que les onglets non-temporaires + Dashboard
        tabs: state.tabs.filter((t) => !t.isTemporary || t.pinned),
        activeTabId: state.activeTabId,
        chatPanelOpen: state.chatPanelOpen,
        chatPanelWidth: state.chatPanelWidth,
        sidebarCollapsed: state.sidebarCollapsed,
        historyPanelOpen: state.historyPanelOpen,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TabsState>;

        // S'assurer que le Dashboard est toujours présent
        let tabs = persisted.tabs || [];
        const hasDashboard = tabs.some((t) => t.id === 'dashboard');
        if (!hasDashboard) {
          tabs = [DASHBOARD_TAB, ...tabs];
        }

        // Migrer les anciens onglets (isPreview -> isTemporary)
        tabs = tabs.map((t) => {
          const tabWithLegacy = t as Tab & { isPreview?: boolean };
          // Si le tab a isPreview mais pas isTemporary, migrer
          if ('isPreview' in tabWithLegacy && tabWithLegacy.isTemporary === undefined) {
            const { isPreview, ...rest } = tabWithLegacy;
            return {
              ...rest,
              isTemporary: isPreview ?? false,
            } as Tab;
          }
          return t;
        });

        // S'assurer que le dashboard est toujours pinned et non-temporaire
        tabs = tabs.map((t) =>
          t.id === 'dashboard' ? { ...t, pinned: true, isTemporary: false } : t
        );

        // S'assurer que activeTabId pointe vers un onglet existant
        const requestedActiveId = persisted.activeTabId || 'dashboard';
        const activeTabExists = tabs.some((t) => t.id === requestedActiveId);
        const validActiveTabId = activeTabExists ? requestedActiveId : 'dashboard';

        return {
          ...currentState,
          ...persisted,
          tabs,
          activeTabId: validActiveTabId,
        };
      },
    }
  )
);
