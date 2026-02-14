import type { TabType } from '@/lib/types/tabs';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string | null;
  path: string;
  tabType: TabType;
  entityType: EntityType;
}

export interface SearchResultGroup {
  type: EntityType;
  label: string;
  items: SearchResult[];
}

export type GroupedResults = SearchResultGroup[];

export type EntityType =
  | 'client'
  | 'contact'
  | 'deal'
  | 'mission'
  | 'quote'
  | 'invoice'
  | 'proposal'
  | 'brief'
  | 'note'
  | 'task';

export interface SearchHistoryItem extends SearchResult {
  searchedAt: number;
}
