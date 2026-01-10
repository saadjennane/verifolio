'use client';

import type { ChatMode } from './modes';
import type { WorkingState } from './working';

// ============================================================================
// Context ID Types
// ============================================================================

export type ContextType =
  | 'dashboard'
  | 'deal'
  | 'mission'
  | 'invoice'
  | 'quote'
  | 'client'
  | 'contact'
  | 'proposal'
  | 'brief'
  | 'review'
  | 'settings';

export interface ContextId {
  type: ContextType;
  id: string; // 'global' for dashboard, UUID for entities
}

// ============================================================================
// Context State (stored per Context ID)
// ============================================================================

export interface ContextState {
  contextId: ContextId;
  messages: ContextMessage[];
  mode: ChatMode;
  working: WorkingState | null;
  dismissedSuggestions: string[]; // Suggestions refusées (IDs)
  lastInteraction: Date;
  isDirty: boolean; // True if entity was modified since last context load
}

export interface ContextMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ============================================================================
// Context Cache
// ============================================================================

export interface ContextCache {
  contexts: Record<string, ContextState>; // Key: contextIdToString(contextId)
  currentContextId: ContextId | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convertit un ContextId en string pour utiliser comme clé de cache
 */
export function contextIdToString(contextId: ContextId): string {
  return `${contextId.type}:${contextId.id}`;
}

/**
 * Parse une string en ContextId
 */
export function stringToContextId(str: string): ContextId | null {
  const [type, ...idParts] = str.split(':');
  const id = idParts.join(':'); // Rejoindre au cas où l'ID contient ':'

  if (!type || !id) return null;

  const validTypes: ContextType[] = [
    'dashboard', 'deal', 'mission', 'invoice', 'quote',
    'client', 'contact', 'proposal', 'brief', 'review', 'settings'
  ];

  if (!validTypes.includes(type as ContextType)) return null;

  return { type: type as ContextType, id };
}

/**
 * Crée un ContextId pour le dashboard global
 */
export function createDashboardContext(): ContextId {
  return { type: 'dashboard', id: 'global' };
}

/**
 * Crée un ContextId pour une entité
 */
export function createEntityContext(type: ContextType, id: string): ContextId {
  return { type, id };
}

/**
 * Compare deux ContextId
 */
export function areContextsEqual(a: ContextId | null, b: ContextId | null): boolean {
  if (!a || !b) return a === b;
  return a.type === b.type && a.id === b.id;
}

/**
 * Crée un état de contexte initial
 */
export function createInitialContextState(contextId: ContextId): ContextState {
  return {
    contextId,
    messages: [],
    mode: 'auto',
    working: null,
    dismissedSuggestions: [],
    lastInteraction: new Date(),
    isDirty: false,
  };
}

// ============================================================================
// URL to Context ID Mapping
// ============================================================================

/**
 * Extrait le ContextId depuis un pathname
 */
export function getContextIdFromPathname(pathname: string): ContextId {
  // Dashboard
  if (pathname === '/' || pathname === '/dashboard') {
    return createDashboardContext();
  }

  // Pattern: /[type]/[id] ou /[type]/[id]/...
  const patterns: { regex: RegExp; type: ContextType }[] = [
    { regex: /^\/deals\/([a-f0-9-]+)/, type: 'deal' },
    { regex: /^\/missions\/([a-f0-9-]+)/, type: 'mission' },
    { regex: /^\/invoices\/([a-f0-9-]+)/, type: 'invoice' },
    { regex: /^\/quotes\/([a-f0-9-]+)/, type: 'quote' },
    { regex: /^\/clients\/([a-f0-9-]+)/, type: 'client' },
    { regex: /^\/contacts\/([a-f0-9-]+)/, type: 'contact' },
    { regex: /^\/proposals\/([a-f0-9-]+)/, type: 'proposal' },
    { regex: /^\/briefs\/([a-f0-9-]+)/, type: 'brief' },
    { regex: /^\/reviews\/([a-f0-9-]+)/, type: 'review' },
  ];

  for (const { regex, type } of patterns) {
    const match = pathname.match(regex);
    if (match && match[1]) {
      return createEntityContext(type, match[1]);
    }
  }

  // Settings
  if (pathname.startsWith('/settings')) {
    return createEntityContext('settings', 'global');
  }

  // Liste pages (sans ID spécifique)
  const listPatterns: { regex: RegExp; type: ContextType }[] = [
    { regex: /^\/deals\/?$/, type: 'deal' },
    { regex: /^\/missions\/?$/, type: 'mission' },
    { regex: /^\/invoices\/?$/, type: 'invoice' },
    { regex: /^\/quotes\/?$/, type: 'quote' },
    { regex: /^\/clients\/?$/, type: 'client' },
    { regex: /^\/proposals\/?$/, type: 'proposal' },
    { regex: /^\/briefs\/?$/, type: 'brief' },
    { regex: /^\/reviews\/?$/, type: 'review' },
  ];

  for (const { regex, type } of listPatterns) {
    if (regex.test(pathname)) {
      return createEntityContext(type, 'list');
    }
  }

  // Fallback: dashboard
  return createDashboardContext();
}

// ============================================================================
// Context Label (for display)
// ============================================================================

const CONTEXT_LABELS: Record<ContextType, string> = {
  dashboard: 'Dashboard',
  deal: 'Deal',
  mission: 'Mission',
  invoice: 'Facture',
  quote: 'Devis',
  client: 'Client',
  contact: 'Contact',
  proposal: 'Proposition',
  brief: 'Brief',
  review: 'Avis',
  settings: 'Paramètres',
};

export function getContextLabel(contextId: ContextId): string {
  const baseLabel = CONTEXT_LABELS[contextId.type] || contextId.type;

  if (contextId.id === 'global' || contextId.id === 'list') {
    return baseLabel;
  }

  // Tronquer l'UUID pour l'affichage
  const shortId = contextId.id.slice(0, 8);
  return `${baseLabel} #${shortId}`;
}

// ============================================================================
// Suggestion Dismissal
// ============================================================================

const SUGGESTION_DISMISSAL_DURATION = 24 * 60 * 60 * 1000; // 24 heures

export interface DismissedSuggestion {
  id: string;
  dismissedAt: Date;
}

export function isSuggestionDismissed(
  suggestionId: string,
  dismissedSuggestions: DismissedSuggestion[]
): boolean {
  const dismissed = dismissedSuggestions.find((s) => s.id === suggestionId);
  if (!dismissed) return false;

  const now = new Date();
  const elapsed = now.getTime() - dismissed.dismissedAt.getTime();
  return elapsed < SUGGESTION_DISMISSAL_DURATION;
}

// ============================================================================
// Context Events (for marking dirty)
// ============================================================================

export type ContextEvent =
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'status_changed'
  | 'document_sent'
  | 'payment_received';

export function shouldRecalculateContext(event: ContextEvent): boolean {
  // Ces événements nécessitent un recalcul du contexte
  const criticalEvents: ContextEvent[] = [
    'entity_created',
    'entity_updated',
    'entity_deleted',
    'status_changed',
    'document_sent',
    'payment_received',
  ];

  return criticalEvents.includes(event);
}
