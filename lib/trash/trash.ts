import { SupabaseClient } from '@supabase/supabase-js';
import {
  TrashedItem,
  TrashEntityType,
  TRASH_RETENTION_DAYS,
  calculateDaysRemaining,
} from './types';

type Supabase = SupabaseClient;

// ============================================================================
// Get all trashed items for a user
// ============================================================================

export async function getTrashedItems(
  supabase: Supabase,
  userId: string
): Promise<TrashedItem[]> {
  const items: TrashedItem[] = [];

  // Fetch deleted clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, nom, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (clients) {
    for (const c of clients) {
      items.push({
        id: c.id,
        entity_type: 'client',
        title: c.nom,
        deleted_at: c.deleted_at,
        days_remaining: calculateDaysRemaining(c.deleted_at),
      });
    }
  }

  // Fetch deleted contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, nom, prenom, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (contacts) {
    for (const c of contacts) {
      const fullName = c.prenom ? `${c.prenom} ${c.nom}` : c.nom;
      items.push({
        id: c.id,
        entity_type: 'contact',
        title: fullName,
        deleted_at: c.deleted_at,
        days_remaining: calculateDaysRemaining(c.deleted_at),
      });
    }
  }

  // Fetch deleted deals
  const { data: deals } = await supabase
    .from('deals')
    .select('id, title, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (deals) {
    for (const d of deals) {
      items.push({
        id: d.id,
        entity_type: 'deal',
        title: d.title,
        deleted_at: d.deleted_at,
        days_remaining: calculateDaysRemaining(d.deleted_at),
      });
    }
  }

  // Fetch deleted missions
  const { data: missions } = await supabase
    .from('missions')
    .select('id, title, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (missions) {
    for (const m of missions) {
      items.push({
        id: m.id,
        entity_type: 'mission',
        title: m.title,
        deleted_at: m.deleted_at,
        days_remaining: calculateDaysRemaining(m.deleted_at),
      });
    }
  }

  // Fetch deleted quotes
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, numero, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (quotes) {
    for (const q of quotes) {
      items.push({
        id: q.id,
        entity_type: 'quote',
        title: q.numero,
        deleted_at: q.deleted_at,
        days_remaining: calculateDaysRemaining(q.deleted_at),
      });
    }
  }

  // Fetch deleted invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, numero, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (invoices) {
    for (const i of invoices) {
      items.push({
        id: i.id,
        entity_type: 'invoice',
        title: i.numero,
        deleted_at: i.deleted_at,
        days_remaining: calculateDaysRemaining(i.deleted_at),
      });
    }
  }

  // Fetch deleted proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, deleted_at')
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (proposals) {
    for (const p of proposals) {
      items.push({
        id: p.id,
        entity_type: 'proposal',
        title: p.title,
        deleted_at: p.deleted_at,
        days_remaining: calculateDaysRemaining(p.deleted_at),
      });
    }
  }

  // Sort all items by deleted_at (most recent first)
  items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

  return items;
}

// ============================================================================
// Restore a trashed item
// ============================================================================

export async function restoreItem(
  supabase: Supabase,
  userId: string,
  entityType: TrashEntityType,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  const tableMap: Record<TrashEntityType, string> = {
    client: 'clients',
    contact: 'contacts',
    deal: 'deals',
    mission: 'missions',
    quote: 'quotes',
    invoice: 'invoices',
    proposal: 'proposals',
  };

  const tableName = tableMap[entityType];
  if (!tableName) {
    return { success: false, error: 'Type d\'entite invalide' };
  }

  const { error } = await supabase
    .from(tableName)
    .update({ deleted_at: null })
    .eq('id', entityId)
    .eq('user_id', userId);

  if (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Permanently delete an item (skip trash)
// ============================================================================

export async function permanentlyDeleteItem(
  supabase: Supabase,
  userId: string,
  entityType: TrashEntityType,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  const tableMap: Record<TrashEntityType, string> = {
    client: 'clients',
    contact: 'contacts',
    deal: 'deals',
    mission: 'missions',
    quote: 'quotes',
    invoice: 'invoices',
    proposal: 'proposals',
  };

  const tableName = tableMap[entityType];
  if (!tableName) {
    return { success: false, error: 'Type d\'entite invalide' };
  }

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', entityId)
    .eq('user_id', userId)
    .not('deleted_at', 'is', null); // Only delete if already in trash

  if (error) {
    console.error('Permanent delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Cleanup old trashed items (older than retention period)
// ============================================================================

export async function cleanupOldTrashedItems(
  supabase: Supabase,
  userId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);
  const cutoffIso = cutoffDate.toISOString();

  let totalDeleted = 0;

  const tables = ['clients', 'contacts', 'deals', 'missions', 'quotes', 'invoices', 'proposals'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .lt('deleted_at', cutoffIso)
      .select('id');

    if (error) {
      console.error(`Cleanup error for ${table}:`, error);
      continue;
    }

    if (data) {
      totalDeleted += data.length;
    }
  }

  return { success: true, deletedCount: totalDeleted };
}

// ============================================================================
// Soft delete function (used by entity delete functions)
// ============================================================================

export async function softDelete(
  supabase: Supabase,
  tableName: string,
  entityId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from(tableName)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', entityId)
    .eq('user_id', userId);

  if (error) {
    console.error('Soft delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Empty entire trash (permanently delete all trashed items)
// ============================================================================

export async function emptyTrash(
  supabase: Supabase,
  userId: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  let totalDeleted = 0;

  const tables = ['clients', 'contacts', 'deals', 'missions', 'quotes', 'invoices', 'proposals'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select('id');

    if (error) {
      console.error(`Empty trash error for ${table}:`, error);
      continue;
    }

    if (data) {
      totalDeleted += data.length;
    }
  }

  return { success: true, deletedCount: totalDeleted };
}
