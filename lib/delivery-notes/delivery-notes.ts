import { SupabaseClient } from '@supabase/supabase-js';
import type {
  DeliveryNote,
  DeliveryNoteWithRelations,
  DeliveryNoteListItem,
  CreateDeliveryNotePayload,
  UpdateDeliveryNotePayload,
} from './types';

/**
 * List all delivery notes for the current user
 */
export async function listDeliveryNotes(
  supabase: SupabaseClient
): Promise<DeliveryNoteListItem[]> {
  const { data, error } = await supabase
    .from('delivery_notes')
    .select(`
      *,
      client:clients!delivery_notes_client_id_fkey(id, nom),
      mission:missions!delivery_notes_mission_id_fkey(id, title)
    `)
    .is('deleted_at', null)
    .order('date_emission', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single delivery note by ID with all relations
 */
export async function getDeliveryNote(
  supabase: SupabaseClient,
  id: string
): Promise<DeliveryNoteWithRelations | null> {
  const { data, error } = await supabase
    .from('delivery_notes')
    .select(`
      *,
      client:clients!delivery_notes_client_id_fkey(id, nom),
      mission:missions!delivery_notes_mission_id_fkey(id, title),
      line_items:delivery_note_line_items(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Create a new delivery note
 */
export async function createDeliveryNote(
  supabase: SupabaseClient,
  payload: CreateDeliveryNotePayload
): Promise<DeliveryNote> {
  // Get the next BL number
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: numeroData, error: numeroError } = await supabase
    .rpc('generate_bl_number', { p_user_id: userData.user.id });

  if (numeroError) throw numeroError;

  const { line_items, ...noteData } = payload;

  // Create the delivery note
  const { data, error } = await supabase
    .from('delivery_notes')
    .insert({
      ...noteData,
      numero: numeroData,
      date_emission: noteData.date_emission || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;

  // Create line items if provided
  if (line_items && line_items.length > 0) {
    const itemsToInsert = line_items.map((item, index) => ({
      delivery_note_id: data.id,
      description: item.description,
      quantite: item.quantite ?? 1,
      unite: item.unite ?? 'unité',
      ordre: item.ordre ?? index,
    }));

    const { error: itemsError } = await supabase
      .from('delivery_note_line_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  return data;
}

/**
 * Update a delivery note
 */
export async function updateDeliveryNote(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateDeliveryNotePayload
): Promise<DeliveryNote> {
  const { data, error } = await supabase
    .from('delivery_notes')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft delete a delivery note
 */
export async function deleteDeliveryNote(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('delivery_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * List delivery notes for a specific mission
 */
export async function listDeliveryNotesForMission(
  supabase: SupabaseClient,
  missionId: string
): Promise<DeliveryNoteListItem[]> {
  const { data, error } = await supabase
    .from('delivery_notes')
    .select(`
      *,
      client:clients!delivery_notes_client_id_fkey(id, nom),
      mission:missions!delivery_notes_mission_id_fkey(id, title)
    `)
    .eq('mission_id', missionId)
    .is('deleted_at', null)
    .order('date_emission', { ascending: false });

  if (error) throw error;
  return data || [];
}
