import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CustomField,
  CustomFieldCreate,
  CustomFieldValue,
  CustomFieldScope,
  EntityType,
} from '@/lib/types/settings';

type Supabase = SupabaseClient;

// ============================================================================
// Custom Fields Helpers
// ============================================================================

/**
 * List custom fields for a user, optionally filtered by scope
 */
export async function listCustomFields(
  supabase: Supabase,
  userId: string,
  scope?: CustomFieldScope
): Promise<CustomField[]> {
  let query = supabase
    .from('custom_fields')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (scope) {
    query = query.eq('scope', scope);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listCustomFields error:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new custom field
 */
export async function createCustomField(
  supabase: Supabase,
  userId: string,
  payload: CustomFieldCreate
): Promise<{ success: boolean; data?: CustomField; error?: string }> {
  const { data, error } = await supabase
    .from('custom_fields')
    .insert({
      user_id: userId,
      scope: payload.scope,
      key: payload.key,
      label: payload.label,
      field_type: payload.field_type || 'text',
      is_active: payload.is_active ?? true,
      is_visible_default: payload.is_visible_default ?? true,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { success: false, error: `Field with key "${payload.key}" already exists for this scope` };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update a custom field
 */
export async function updateCustomField(
  supabase: Supabase,
  fieldId: string,
  patch: Partial<Pick<CustomField, 'label' | 'is_active' | 'is_visible_default'>>
): Promise<{ success: boolean; data?: CustomField; error?: string }> {
  const { data, error } = await supabase
    .from('custom_fields')
    .update(patch)
    .eq('id', fieldId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a custom field (and all its values via CASCADE)
 */
export async function deleteCustomField(
  supabase: Supabase,
  fieldId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('custom_fields')
    .delete()
    .eq('id', fieldId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Custom Field Values Helpers
// ============================================================================

/**
 * Upsert a custom field value for an entity
 */
export async function upsertCustomFieldValue(
  supabase: Supabase,
  userId: string,
  fieldId: string,
  entityType: EntityType,
  entityId: string,
  valueText: string | null
): Promise<{ success: boolean; data?: CustomFieldValue; error?: string }> {
  // Use upsert with onConflict
  const { data, error } = await supabase
    .from('custom_field_values')
    .upsert(
      {
        user_id: userId,
        field_id: fieldId,
        entity_type: entityType,
        entity_id: entityId,
        value_text: valueText,
      },
      {
        onConflict: 'field_id,entity_type,entity_id',
      }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * List all custom field values for a specific entity
 */
export async function listFieldValuesForEntity(
  supabase: Supabase,
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<CustomFieldValue[]> {
  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.error('listFieldValuesForEntity error:', error);
    return [];
  }

  return data || [];
}

/**
 * List custom field values with field metadata for an entity
 */
export async function listFieldValuesWithMetadata(
  supabase: Supabase,
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<Array<CustomFieldValue & { field: CustomField }>> {
  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*, field:custom_fields(*)')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.error('listFieldValuesWithMetadata error:', error);
    return [];
  }

  return (data || []) as Array<CustomFieldValue & { field: CustomField }>;
}

/**
 * Delete a custom field value
 */
export async function deleteCustomFieldValue(
  supabase: Supabase,
  fieldId: string,
  entityType: EntityType,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('custom_field_values')
    .delete()
    .eq('field_id', fieldId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
