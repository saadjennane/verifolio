import { useEffect, useState } from 'react';
import type { NavigationTab } from '@/lib/navigation';

export function useNavigationPreferences() {
  const [tabs, setTabs] = useState<NavigationTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const res = await fetch('/api/navigation/preferences');

      if (!res.ok) {
        throw new Error('Failed to load navigation preferences');
      }

      const data = await res.json();
      setTabs(data.tabs || []);
      setError(null);
    } catch (err) {
      console.error('Error loading navigation preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Fallback vers la navigation par défaut en cas d'erreur
      setTabs(getDefaultNavigation());
    } finally {
      setLoading(false);
    }
  }

  function reload() {
    setLoading(true);
    loadPreferences();
  }

  return { tabs, loading, error, reload };
}

// Navigation par défaut en cas d'erreur
function getDefaultNavigation(): NavigationTab[] {
  return [
    { tab_key: 'deals', label: 'Deals', path: '/deals', display_order: 0, is_visible: true },
    { tab_key: 'missions', label: 'Missions', path: '/missions', display_order: 1, is_visible: true },
    { tab_key: 'clients', label: 'Clients', path: '/clients', display_order: 2, is_visible: true },
    { tab_key: 'contacts', label: 'Contacts', path: '/contacts', display_order: 3, is_visible: true },
    { tab_key: 'invoices', label: 'Factures', path: '/invoices', display_order: 4, is_visible: true },
    { tab_key: 'quotes', label: 'Devis', path: '/quotes', display_order: 5, is_visible: true },
    { tab_key: 'proposals', label: 'Propositions', path: '/proposals/templates', display_order: 6, is_visible: true },
    { tab_key: 'reviews', label: 'Avis', path: '/reviews', display_order: 7, is_visible: true },
    { tab_key: 'documents', label: 'Documents', path: '/documents', display_order: 8, is_visible: true },
    { tab_key: 'todos', label: 'Tâches', path: '/todos', display_order: 9, is_visible: true },
  ];
}
