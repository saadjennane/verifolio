import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Template,
  TemplateBlock,
  TemplateBlockPayload,
  TemplateWithBlocks,
  DocType,
  TemplateZone,
} from '@/lib/types/settings';

type Supabase = SupabaseClient;

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * List templates for a user, optionally filtered by doc type
 */
export async function listTemplates(
  supabase: Supabase,
  userId: string,
  docType?: DocType
): Promise<Template[]> {
  let query = supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (docType) {
    query = query.eq('doc_type', docType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listTemplates error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single template by ID (with or without blocks)
 */
export async function getTemplate(
  supabase: Supabase,
  templateId: string,
  includeBlocks: boolean = false
): Promise<Template | TemplateWithBlocks | null> {
  if (includeBlocks) {
    const { data, error } = await supabase
      .from('templates')
      .select('*, blocks:template_blocks(*)')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('getTemplate error:', error);
      return null;
    }

    // Sort blocks by zone and sort_order
    if (data?.blocks) {
      data.blocks.sort((a: TemplateBlock, b: TemplateBlock) => {
        if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
        return a.sort_order - b.sort_order;
      });
    }

    return data as TemplateWithBlocks;
  }

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('getTemplate error:', error);
    return null;
  }

  return data;
}

/**
 * Get the default template for a user and doc type
 */
export async function getDefaultTemplate(
  supabase: Supabase,
  userId: string,
  docType: DocType
): Promise<TemplateWithBlocks | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*, blocks:template_blocks(*)')
    .eq('user_id', userId)
    .eq('doc_type', docType)
    .eq('is_default', true)
    .single();

  if (error) {
    // No default found
    if (error.code === 'PGRST116') return null;
    console.error('getDefaultTemplate error:', error);
    return null;
  }

  return data as TemplateWithBlocks;
}

/**
 * Create a new template
 */
export async function createTemplate(
  supabase: Supabase,
  userId: string,
  docType: DocType,
  name: string,
  isDefault: boolean = false
): Promise<{ success: boolean; data?: Template; error?: string }> {
  // If setting as default, first unset any existing default
  if (isDefault) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('doc_type', docType)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      doc_type: docType,
      name,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update a template
 */
export async function updateTemplate(
  supabase: Supabase,
  templateId: string,
  patch: Partial<Pick<Template, 'name' | 'version'>>
): Promise<{ success: boolean; data?: Template; error?: string }> {
  const { data, error } = await supabase
    .from('templates')
    .update(patch)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Set a template as default for its doc type (unsets others)
 */
export async function setTemplateDefault(
  supabase: Supabase,
  userId: string,
  docType: DocType,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  // First, unset all defaults for this user/docType
  const { error: unsetError } = await supabase
    .from('templates')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('doc_type', docType);

  if (unsetError) {
    return { success: false, error: unsetError.message };
  }

  // Then set the new default
  const { error: setError } = await supabase
    .from('templates')
    .update({ is_default: true })
    .eq('id', templateId);

  if (setError) {
    return { success: false, error: setError.message };
  }

  return { success: true };
}

/**
 * Delete a template (and its blocks via CASCADE)
 */
export async function deleteTemplate(
  supabase: Supabase,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Duplicate a template with all its blocks
 */
export async function duplicateTemplate(
  supabase: Supabase,
  templateId: string,
  newName: string
): Promise<{ success: boolean; data?: Template; error?: string }> {
  // Get original template with blocks
  const original = await getTemplate(supabase, templateId, true) as TemplateWithBlocks | null;
  if (!original) {
    return { success: false, error: 'Template not found' };
  }

  // Create new template
  const { data: newTemplate, error: createError } = await supabase
    .from('templates')
    .insert({
      user_id: original.user_id,
      doc_type: original.doc_type,
      name: newName,
      is_default: false,
    })
    .select()
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  // Copy blocks
  if (original.blocks && original.blocks.length > 0) {
    const blocksToInsert = original.blocks.map((block) => ({
      template_id: newTemplate.id,
      zone: block.zone,
      block_type: block.block_type,
      field_id: block.field_id,
      label_override: block.label_override,
      is_visible: block.is_visible,
      sort_order: block.sort_order,
      config: block.config,
    }));

    const { error: blocksError } = await supabase
      .from('template_blocks')
      .insert(blocksToInsert);

    if (blocksError) {
      // Rollback: delete the template
      await supabase.from('templates').delete().eq('id', newTemplate.id);
      return { success: false, error: blocksError.message };
    }
  }

  return { success: true, data: newTemplate };
}

// ============================================================================
// Template Block Helpers
// ============================================================================

/**
 * Upsert a template block (create or update)
 */
export async function upsertTemplateBlock(
  supabase: Supabase,
  templateId: string,
  payload: TemplateBlockPayload
): Promise<{ success: boolean; data?: TemplateBlock; error?: string }> {
  const blockData = {
    template_id: templateId,
    zone: payload.zone,
    block_type: payload.block_type,
    field_id: payload.field_id ?? null,
    label_override: payload.label_override ?? null,
    is_visible: payload.is_visible ?? true,
    sort_order: payload.sort_order ?? 0,
    config: payload.config ?? {},
  };

  if (payload.id) {
    // Update existing block
    const { data, error } = await supabase
      .from('template_blocks')
      .update(blockData)
      .eq('id', payload.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } else {
    // Create new block
    const { data, error } = await supabase
      .from('template_blocks')
      .insert(blockData)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  }
}

/**
 * Delete a template block
 */
export async function deleteTemplateBlock(
  supabase: Supabase,
  blockId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('template_blocks')
    .delete()
    .eq('id', blockId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder blocks within a zone
 */
export async function reorderTemplateBlocks(
  supabase: Supabase,
  templateId: string,
  zone: TemplateZone,
  orderedBlockIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // Update each block with its new sort_order
  const updates = orderedBlockIds.map((blockId, index) => ({
    id: blockId,
    sort_order: index,
  }));

  // Batch update using Promise.all
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase
        .from('template_blocks')
        .update({ sort_order })
        .eq('id', id)
        .eq('template_id', templateId)
        .eq('zone', zone)
    )
  );

  const hasError = results.find((r) => r.error);
  if (hasError?.error) {
    return { success: false, error: hasError.error.message };
  }

  return { success: true };
}

/**
 * Get all blocks for a template, grouped by zone
 */
export async function getTemplateBlocksByZone(
  supabase: Supabase,
  templateId: string
): Promise<Record<TemplateZone, TemplateBlock[]>> {
  const { data, error } = await supabase
    .from('template_blocks')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getTemplateBlocksByZone error:', error);
    return {
      header: [],
      doc_info: [],
      client: [],
      items: [],
      totals: [],
      footer: [],
    };
  }

  // Group by zone
  const grouped: Record<TemplateZone, TemplateBlock[]> = {
    header: [],
    doc_info: [],
    client: [],
    items: [],
    totals: [],
    footer: [],
  };

  (data || []).forEach((block: TemplateBlock) => {
    if (grouped[block.zone]) {
      grouped[block.zone].push(block);
    }
  });

  return grouped;
}
