import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskEntityType, TaskOwnerScope, Task } from './types';

// ============================================================================
// Types
// ============================================================================

export type TemplateTargetEntityType = 'deal' | 'mission' | 'client';

export interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_entity_type: TemplateTargetEntityType | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  day_offset: number;
  sort_order: number;
  owner_scope: TaskOwnerScope;
  created_at: string;
}

export interface TaskTemplateWithItems extends TaskTemplate {
  items: TaskTemplateItem[];
}

export interface TaskTemplateWithCounts extends TaskTemplate {
  item_count: number;
  max_day_offset: number;
}

export interface CreateTaskTemplatePayload {
  name: string;
  description?: string;
  target_entity_type?: TemplateTargetEntityType;
  items?: CreateTaskTemplateItemPayload[];
}

export interface CreateTaskTemplateItemPayload {
  title: string;
  description?: string;
  day_offset?: number;
  sort_order?: number;
  owner_scope?: TaskOwnerScope;
}

export interface UpdateTaskTemplatePayload {
  name?: string;
  description?: string | null;
  target_entity_type?: TemplateTargetEntityType | null;
  is_active?: boolean;
}

export interface ApplyTemplatePayload {
  template_id: string;
  entity_type: TaskEntityType;
  entity_id: string;
  reference_date?: string; // Format YYYY-MM-DD, défaut: aujourd'hui
}

export interface EntityTaskProgress {
  entity_type: TaskEntityType;
  entity_id: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  progress_percent: number;
}

// ============================================================================
// Template CRUD
// ============================================================================

export async function createTaskTemplate(
  supabase: SupabaseClient,
  userId: string,
  payload: CreateTaskTemplatePayload
): Promise<{ success: boolean; data?: TaskTemplateWithItems; error?: string }> {
  const { name, description, target_entity_type, items } = payload;

  // Créer le template
  const { data: template, error: templateError } = await supabase
    .from('task_templates')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      target_entity_type: target_entity_type || null,
    })
    .select('*')
    .single();

  if (templateError) {
    return { success: false, error: templateError.message };
  }

  // Créer les items si fournis
  let templateItems: TaskTemplateItem[] = [];
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item, index) => ({
      template_id: template.id,
      title: item.title,
      description: item.description || null,
      day_offset: item.day_offset ?? 0,
      sort_order: item.sort_order ?? index,
      owner_scope: item.owner_scope || 'me',
    }));

    const { data: createdItems, error: itemsError } = await supabase
      .from('task_template_items')
      .insert(itemsToInsert)
      .select('*')
      .order('sort_order');

    if (itemsError) {
      return { success: false, error: itemsError.message };
    }

    templateItems = createdItems || [];
  }

  return {
    success: true,
    data: { ...template, items: templateItems },
  };
}

export async function getTaskTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string
): Promise<TaskTemplateWithItems | null> {
  const { data: template } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .eq('user_id', userId)
    .single();

  if (!template) return null;

  const { data: items } = await supabase
    .from('task_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order');

  return { ...template, items: items || [] };
}

export async function listTaskTemplates(
  supabase: SupabaseClient,
  userId: string,
  filters?: {
    target_entity_type?: TemplateTargetEntityType;
    is_active?: boolean;
  }
): Promise<TaskTemplateWithCounts[]> {
  let query = supabase
    .from('task_templates_with_counts')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (filters?.target_entity_type) {
    query = query.eq('target_entity_type', filters.target_entity_type);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data } = await query;
  return data || [];
}

export async function updateTaskTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string,
  payload: UpdateTaskTemplatePayload
): Promise<{ success: boolean; data?: TaskTemplate; error?: string }> {
  const { data, error } = await supabase
    .from('task_templates')
    .update(payload)
    .eq('id', templateId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteTaskTemplate(
  supabase: SupabaseClient,
  userId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Template Items CRUD
// ============================================================================

export async function addTaskTemplateItem(
  supabase: SupabaseClient,
  templateId: string,
  payload: CreateTaskTemplateItemPayload
): Promise<{ success: boolean; data?: TaskTemplateItem; error?: string }> {
  // Obtenir le prochain sort_order
  const { data: existing } = await supabase
    .from('task_template_items')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existing && existing.length > 0
    ? existing[0].sort_order + 1
    : 0;

  const { data, error } = await supabase
    .from('task_template_items')
    .insert({
      template_id: templateId,
      title: payload.title,
      description: payload.description || null,
      day_offset: payload.day_offset ?? 0,
      sort_order: payload.sort_order ?? nextSortOrder,
      owner_scope: payload.owner_scope || 'me',
    })
    .select('*')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function updateTaskTemplateItem(
  supabase: SupabaseClient,
  itemId: string,
  payload: Partial<CreateTaskTemplateItemPayload>
): Promise<{ success: boolean; data?: TaskTemplateItem; error?: string }> {
  const { data, error } = await supabase
    .from('task_template_items')
    .update(payload)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function deleteTaskTemplateItem(
  supabase: SupabaseClient,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('task_template_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function reorderTaskTemplateItems(
  supabase: SupabaseClient,
  templateId: string,
  itemIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // Update sort_order for each item
  const updates = itemIds.map((id, index) =>
    supabase
      .from('task_template_items')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('template_id', templateId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    return { success: false, error: 'Erreur lors de la réorganisation' };
  }

  return { success: true };
}

// ============================================================================
// Apply Template
// ============================================================================

export async function applyTaskTemplate(
  supabase: SupabaseClient,
  userId: string,
  payload: ApplyTemplatePayload
): Promise<{ success: boolean; data?: Task[]; error?: string }> {
  const { template_id, entity_type, entity_id, reference_date } = payload;

  // Utiliser la fonction SQL pour créer les tâches
  const { data, error } = await supabase.rpc('apply_task_template', {
    p_template_id: template_id,
    p_entity_type: entity_type,
    p_entity_id: entity_id,
    p_reference_date: reference_date || new Date().toISOString().split('T')[0],
    p_user_id: userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

// ============================================================================
// Entity Task Progress
// ============================================================================

export async function getEntityTaskProgress(
  supabase: SupabaseClient,
  userId: string,
  entityType: TaskEntityType,
  entityId: string
): Promise<EntityTaskProgress | null> {
  const { data } = await supabase
    .from('entity_task_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  return data;
}

export async function getEntityTasks(
  supabase: SupabaseClient,
  userId: string,
  entityType: TaskEntityType,
  entityId: string
): Promise<{ tasks: Task[]; progress: EntityTaskProgress | null }> {
  // Get tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('status', { ascending: true }) // open first, then done
    .order('due_date', { ascending: true, nullsFirst: false });

  // Get progress
  const progress = await getEntityTaskProgress(supabase, userId, entityType, entityId);

  return {
    tasks: tasks || [],
    progress,
  };
}
