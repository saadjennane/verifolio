import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Note,
  NoteWithLinks,
  NoteListItem,
  CreateNotePayload,
  UpdateNotePayload,
  NoteLink,
  NoteEntityType,
  LinkedEntity,
} from './types';

// ============================================================================
// Helper: Get entity title
// ============================================================================

async function getEntityTitle(
  supabase: SupabaseClient,
  entityType: NoteEntityType,
  entityId: string
): Promise<string> {
  const tableMap: Record<NoteEntityType, { table: string; titleField: string }> = {
    deal: { table: 'deals', titleField: 'title' },
    mission: { table: 'missions', titleField: 'title' },
    proposal: { table: 'proposals', titleField: 'title' },
    brief: { table: 'briefs', titleField: 'title' },
    client: { table: 'clients', titleField: 'nom' },
    contact: { table: 'contacts', titleField: 'nom' },
    invoice: { table: 'invoices', titleField: 'numero' },
    quote: { table: 'quotes', titleField: 'numero' },
    review: { table: 'reviews', titleField: 'id' },
    task: { table: 'tasks', titleField: 'title' },
    supplier: { table: 'clients', titleField: 'nom' },
  };

  const config = tableMap[entityType];
  if (!config) return entityId;

  const { data } = await supabase
    .from(config.table)
    .select(config.titleField)
    .eq('id', entityId)
    .single();

  const record = data as Record<string, unknown> | null;
  return (record?.[config.titleField] as string) || entityId.slice(0, 8);
}

// ============================================================================
// Create Note
// ============================================================================

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateNotePayload
): Promise<{ success: boolean; data?: Note; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: payload.title || 'Sans titre',
        content: payload.content || '',
        content_json: payload.content_json || { type: 'doc', content: [{ type: 'paragraph' }] },
        color: payload.color || 'gray',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Add links if provided
    if (payload.links && payload.links.length > 0) {
      const links = payload.links.map((link) => ({
        note_id: data.id,
        entity_type: link.entity_type,
        entity_id: link.entity_id,
      }));

      const { error: linkError } = await supabase.from('note_links').insert(links);

      if (linkError) {
        console.error('Error adding links:', linkError);
      }
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Get Single Note
// ============================================================================

export async function getNote(
  supabase: SupabaseClient,
  noteId: string
): Promise<{ success: boolean; data?: NoteWithLinks; error?: string }> {
  try {
    const { data: note, error } = await supabase
      .from('notes')
      .select('*, links:note_links(*)')
      .eq('id', noteId)
      .is('deleted_at', null)
      .single();

    if (error || !note) {
      return { success: false, error: 'Note non trouvée' };
    }

    // Fetch entity titles for links
    const linkedEntities: LinkedEntity[] = [];
    for (const link of note.links || []) {
      const title = await getEntityTitle(supabase, link.entity_type, link.entity_id);
      linkedEntities.push({
        type: link.entity_type,
        id: link.entity_id,
        title,
      });
    }

    return {
      success: true,
      data: {
        ...note,
        linked_entities: linkedEntities,
      } as NoteWithLinks,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Get Notes List
// ============================================================================

export async function getNotes(
  supabase: SupabaseClient,
  filters?: {
    pinned?: boolean;
    entity_type?: NoteEntityType;
    entity_id?: string;
  }
): Promise<{ success: boolean; data?: NoteListItem[]; error?: string }> {
  try {
    // If filtering by entity, join with note_links
    if (filters?.entity_type && filters?.entity_id) {
      const { data, error } = await supabase
        .from('notes')
        .select('*, links:note_links!inner(*)')
        .eq('links.entity_type', filters.entity_type)
        .eq('links.entity_id', filters.entity_id)
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        data: (data || []).map((note) => ({
          ...note,
          link_count: note.links?.length || 0,
        })),
      };
    }

    // Regular list
    let query = supabase
      .from('notes')
      .select('*, links:note_links(id)')
      .is('deleted_at', null)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (filters?.pinned !== undefined) {
      query = query.eq('pinned', filters.pinned);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data || []).map((note) => ({
        ...note,
        link_count: note.links?.length || 0,
      })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Update Note
// ============================================================================

export async function updateNote(
  supabase: SupabaseClient,
  noteId: string,
  payload: UpdateNotePayload
): Promise<{ success: boolean; data?: Note; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {};

    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.content !== undefined) updateData.content = payload.content;
    if (payload.content_json !== undefined) updateData.content_json = payload.content_json;
    if (payload.color !== undefined) updateData.color = payload.color;
    if (payload.pinned !== undefined) updateData.pinned = payload.pinned;

    const { data, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Delete Note (soft delete)
// ============================================================================

export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noteId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Add Link
// ============================================================================

export async function addNoteLink(
  supabase: SupabaseClient,
  noteId: string,
  entityType: NoteEntityType,
  entityId: string
): Promise<{ success: boolean; data?: NoteLink; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('note_links')
      .insert({
        note_id: noteId,
        entity_type: entityType,
        entity_id: entityId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Lien déjà existant' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Remove Link
// ============================================================================

export async function removeNoteLink(
  supabase: SupabaseClient,
  noteId: string,
  entityType: NoteEntityType,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('note_links')
      .delete()
      .eq('note_id', noteId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// Get Note Links
// ============================================================================

export async function getNoteLinks(
  supabase: SupabaseClient,
  noteId: string
): Promise<{ success: boolean; data?: LinkedEntity[]; error?: string }> {
  try {
    const { data: links, error } = await supabase
      .from('note_links')
      .select('*')
      .eq('note_id', noteId);

    if (error) return { success: false, error: error.message };

    const linkedEntities: LinkedEntity[] = [];
    for (const link of links || []) {
      const title = await getEntityTitle(supabase, link.entity_type, link.entity_id);
      linkedEntities.push({
        type: link.entity_type,
        id: link.entity_id,
        title,
      });
    }

    return { success: true, data: linkedEntities };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
