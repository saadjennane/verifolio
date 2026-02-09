import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${Math.random().toString(36).substr(2, 9)}`,
});

// We need to reset the store between tests
import { useTabsStore } from '@/lib/stores/tabs-store';

describe('tabs-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTabsStore.setState({
      tabs: [
        {
          id: 'dashboard',
          type: 'dashboard',
          path: '/',
          title: 'Dashboard',
          isTemporary: false,
          pinned: true,
          openedBy: 'user',
          lastAccessedAt: Date.now(),
        },
      ],
      activeTabId: 'dashboard',
    });
  });

  describe('openTab', () => {
    describe('R1 - Sidebar opens temporary tab', () => {
      it('should open a temporary tab from sidebar', () => {
        const { openTab } = useTabsStore.getState();

        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        const state = useTabsStore.getState();
        expect(state.tabs).toHaveLength(2);

        const newTab = state.tabs.find((t) => t.type === 'clients');
        expect(newTab).toBeDefined();
        expect(newTab?.isTemporary).toBe(true);
        expect(newTab?.openedBy).toBe('sidebar');
      });

      it('should replace current temporary tab when opening from sidebar', () => {
        const { openTab } = useTabsStore.getState();

        // Open first temporary tab
        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        const clientTabId = useTabsStore.getState().activeTabId;

        // Open second tab from sidebar - should replace the first
        useTabsStore.getState().openTab(
          { type: 'invoices', path: '/invoices', title: 'Factures' },
          { source: 'sidebar' }
        );

        const state = useTabsStore.getState();
        expect(state.tabs).toHaveLength(2); // Dashboard + Invoices
        expect(state.tabs.find((t) => t.id === clientTabId)).toBeUndefined();
        expect(state.tabs.find((t) => t.type === 'invoices')).toBeDefined();
      });

      it('should NOT replace pinned tab when opening from sidebar', () => {
        const { openTab, pinTab } = useTabsStore.getState();

        // Open and pin a tab
        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        const clientTabId = useTabsStore.getState().activeTabId!;
        useTabsStore.getState().pinTab(clientTabId);

        // Open another tab - should NOT replace pinned
        useTabsStore.getState().openTab(
          { type: 'invoices', path: '/invoices', title: 'Factures' },
          { source: 'sidebar' }
        );

        const state = useTabsStore.getState();
        expect(state.tabs).toHaveLength(3); // Dashboard + Clients + Invoices
        expect(state.tabs.find((t) => t.id === clientTabId)).toBeDefined();
      });
    });

    describe('R2 - User navigation within tab', () => {
      it('should navigate within same temporary tab for user clicks', () => {
        const { openTab } = useTabsStore.getState();

        // Open first tab
        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        const firstTabId = useTabsStore.getState().activeTabId;

        // Navigate within the same tab (user click, no forceNew)
        useTabsStore.getState().openTab(
          { type: 'client', path: '/clients/123', title: 'Client ABC', entityId: '123' },
          { source: 'user' }
        );

        const state = useTabsStore.getState();
        // Should still have same number of tabs
        expect(state.tabs).toHaveLength(2);
        // Active tab should be the same id but with updated content
        expect(state.activeTabId).toBe(firstTabId);

        const updatedTab = state.tabs.find((t) => t.id === firstTabId);
        expect(updatedTab?.type).toBe('client');
        expect(updatedTab?.path).toBe('/clients/123');
        expect(updatedTab?.entityId).toBe('123');
      });

      it('should open new tab with forceNew (Ctrl+Click)', () => {
        const { openTab } = useTabsStore.getState();

        // Open first tab
        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        // Open with forceNew
        useTabsStore.getState().openTab(
          { type: 'client', path: '/clients/123', title: 'Client ABC', entityId: '123' },
          { source: 'user', forceNew: true }
        );

        const state = useTabsStore.getState();
        expect(state.tabs).toHaveLength(3); // Dashboard + Clients + Client
      });
    });

    describe('R3 - Double-click pins tab (via pinTab)', () => {
      it('should pin a temporary tab', () => {
        const { openTab, pinTab } = useTabsStore.getState();

        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        const tabId = useTabsStore.getState().activeTabId!;
        const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
        expect(tab?.isTemporary).toBe(true);

        useTabsStore.getState().pinTab(tabId);

        const pinnedTab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
        expect(pinnedTab?.isTemporary).toBe(false);
      });

      it('should not affect dashboard pinned status', () => {
        const { pinTab } = useTabsStore.getState();

        pinTab('dashboard');

        const dashboard = useTabsStore.getState().tabs.find((t) => t.id === 'dashboard');
        expect(dashboard?.pinned).toBe(true);
        expect(dashboard?.isTemporary).toBe(false);
      });
    });

    describe('R4 - LLM always opens new temporary tab', () => {
      it('should always open new tab for LLM regardless of current state', () => {
        const { openTab, pinTab } = useTabsStore.getState();

        // Open and pin a tab
        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        useTabsStore.getState().pinTab(useTabsStore.getState().activeTabId!);

        // LLM opens a tab
        useTabsStore.getState().openTab(
          { type: 'client', path: '/clients/123', title: 'Client ABC', entityId: '123' },
          { source: 'llm' }
        );

        const state = useTabsStore.getState();
        expect(state.tabs).toHaveLength(3); // Dashboard + Clients + Client from LLM

        const llmTab = state.tabs.find((t) => t.openedBy === 'llm');
        expect(llmTab).toBeDefined();
        expect(llmTab?.isTemporary).toBe(true);
      });

      it('should not replace existing temporary tab when LLM opens', () => {
        const { openTab } = useTabsStore.getState();

        // Open temporary tab
        openTab(
          { type: 'clients', path: '/clients', title: 'Clients' },
          { source: 'sidebar' }
        );

        // LLM opens another tab - should NOT replace
        useTabsStore.getState().openTab(
          { type: 'invoices', path: '/invoices', title: 'Factures' },
          { source: 'llm' }
        );

        const state = useTabsStore.getState();
        expect(state.tabs).toHaveLength(3); // Dashboard + Clients + Invoices
      });
    });
  });

  describe('closeTab', () => {
    it('should close a temporary tab', () => {
      const { openTab, closeTab } = useTabsStore.getState();

      openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'sidebar' }
      );

      const tabId = useTabsStore.getState().activeTabId!;
      useTabsStore.getState().closeTab(tabId);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1); // Only Dashboard
      expect(state.activeTabId).toBe('dashboard');
    });

    it('should NOT close dashboard (pinned)', () => {
      const { closeTab } = useTabsStore.getState();

      closeTab('dashboard');

      const state = useTabsStore.getState();
      expect(state.tabs.find((t) => t.id === 'dashboard')).toBeDefined();
    });

    it('should NOT close dirty tab', () => {
      const { openTab, closeTab, setTabDirty } = useTabsStore.getState();

      openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'sidebar' }
      );

      const tabId = useTabsStore.getState().activeTabId!;
      useTabsStore.getState().setTabDirty(tabId, true);
      useTabsStore.getState().closeTab(tabId);

      const state = useTabsStore.getState();
      expect(state.tabs.find((t) => t.id === tabId)).toBeDefined();
    });
  });

  describe('F2 - cleanupTemporaryTabs (max 5)', () => {
    it('should cleanup oldest temporary tabs when exceeding limit', () => {
      const { openTab } = useTabsStore.getState();

      // Open 7 tabs
      for (let i = 1; i <= 7; i++) {
        useTabsStore.getState().openTab(
          { type: 'client', path: `/clients/${i}`, title: `Client ${i}`, entityId: `${i}` },
          { source: 'llm' } // LLM always creates new tabs
        );
      }

      const state = useTabsStore.getState();
      // Should have Dashboard + max 5 temporary
      const temporaryTabs = state.tabs.filter((t) => t.isTemporary && !t.pinned);
      expect(temporaryTabs.length).toBeLessThanOrEqual(5);
    });

    it('should not close active tab during cleanup', () => {
      // Open 6 tabs from LLM (to exceed limit)
      for (let i = 1; i <= 6; i++) {
        useTabsStore.getState().openTab(
          { type: 'client', path: `/clients/${i}`, title: `Client ${i}`, entityId: `${i}` },
          { source: 'llm' }
        );
      }

      // The active tab (last opened) should still exist after cleanup
      const activeTabId = useTabsStore.getState().activeTabId!;
      const state = useTabsStore.getState();
      expect(state.tabs.find((t) => t.id === activeTabId)).toBeDefined();
      expect(state.activeTabId).toBe(activeTabId);
    });
  });

  describe('F3 - closeAllTemporaryTabs', () => {
    it('should close all temporary tabs', () => {
      // Open several tabs
      for (let i = 1; i <= 3; i++) {
        useTabsStore.getState().openTab(
          { type: 'client', path: `/clients/${i}`, title: `Client ${i}`, entityId: `${i}` },
          { source: 'llm' }
        );
      }

      useTabsStore.getState().closeAllTemporaryTabs();

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1); // Only Dashboard
      expect(state.activeTabId).toBe('dashboard');
    });

    it('should keep pinned tabs', () => {
      const { openTab, pinTab, closeAllTemporaryTabs } = useTabsStore.getState();

      // Open and pin a tab
      openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'sidebar' }
      );

      const pinnedTabId = useTabsStore.getState().activeTabId!;
      useTabsStore.getState().pinTab(pinnedTabId);

      // Open more temporary tabs
      useTabsStore.getState().openTab(
        { type: 'invoices', path: '/invoices', title: 'Factures' },
        { source: 'llm' }
      );

      useTabsStore.getState().closeAllTemporaryTabs();

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(2); // Dashboard + Clients (pinned)
      expect(state.tabs.find((t) => t.id === pinnedTabId)).toBeDefined();
    });

    it('should keep dirty tabs', () => {
      const { openTab, setTabDirty, closeAllTemporaryTabs } = useTabsStore.getState();

      openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'sidebar' }
      );

      const dirtyTabId = useTabsStore.getState().activeTabId!;
      useTabsStore.getState().setTabDirty(dirtyTabId, true);
      useTabsStore.getState().closeAllTemporaryTabs();

      const state = useTabsStore.getState();
      expect(state.tabs.find((t) => t.id === dirtyTabId)).toBeDefined();
    });
  });

  describe('getTemporaryTabsCount', () => {
    it('should return correct count of temporary tabs', () => {
      expect(useTabsStore.getState().getTemporaryTabsCount()).toBe(0);

      useTabsStore.getState().openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'llm' }
      );

      expect(useTabsStore.getState().getTemporaryTabsCount()).toBe(1);

      useTabsStore.getState().openTab(
        { type: 'invoices', path: '/invoices', title: 'Factures' },
        { source: 'llm' }
      );

      expect(useTabsStore.getState().getTemporaryTabsCount()).toBe(2);
    });
  });

  describe('setActiveTab', () => {
    it('should update lastAccessedAt when setting active tab', () => {
      const { openTab, setActiveTab } = useTabsStore.getState();

      openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'sidebar' }
      );

      const tabId = useTabsStore.getState().activeTabId!;
      const initialTime = useTabsStore.getState().tabs.find((t) => t.id === tabId)?.lastAccessedAt;

      useTabsStore.getState().setActiveTab('dashboard');
      useTabsStore.getState().setActiveTab(tabId);

      const newTime = useTabsStore.getState().tabs.find((t) => t.id === tabId)?.lastAccessedAt;
      expect(newTime).toBeGreaterThanOrEqual(initialTime!);
    });
  });

  describe('Legacy compatibility', () => {
    it('makeTabPermanent should work as pinTab', () => {
      const { openTab, makeTabPermanent } = useTabsStore.getState();

      openTab(
        { type: 'clients', path: '/clients', title: 'Clients' },
        { source: 'sidebar' }
      );

      const tabId = useTabsStore.getState().activeTabId!;
      useTabsStore.getState().makeTabPermanent(tabId);

      const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
      expect(tab?.isTemporary).toBe(false);
    });

    it('should accept boolean as second parameter (legacy API)', () => {
      const { openTab } = useTabsStore.getState();

      openTab({ type: 'clients', path: '/clients', title: 'Clients' }, true);

      const tab = useTabsStore.getState().tabs.find((t) => t.type === 'clients');
      expect(tab?.isTemporary).toBe(false); // pinned = true means not temporary
    });
  });
});
