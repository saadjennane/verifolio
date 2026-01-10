// Types pour la navigation personnalisée

export type TabKey =
  | 'deals'
  | 'missions'
  | 'clients'
  | 'contacts'
  | 'invoices'
  | 'quotes'
  | 'proposals'
  | 'reviews'
  | 'documents'
  | 'todos';

export interface NavigationTab {
  tab_key: TabKey;
  label: string;
  path: string;
  display_order: number;
  is_visible: boolean;
}

export interface UserNavigationPreference {
  id: string;
  user_id: string;
  tab_key: TabKey;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReorderTabsPayload {
  tab_orders: Array<{
    tab_key: TabKey;
    order: number;
  }>;
}

export interface ToggleTabVisibilityPayload {
  tab_key: TabKey;
  is_visible: boolean;
}
