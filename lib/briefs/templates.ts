import { createClient } from '@/lib/supabase/server';
import type {
  BriefTemplate,
  BriefTemplateWithQuestions,
  BriefTemplateQuestion,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateListFilter,
} from './types';

// ============================================================================
// Templates CRUD
// ============================================================================

/**
 * Create a new brief template
 */
export async function createTemplate(
  payload: CreateTemplatePayload
): Promise<{ success: boolean; data?: BriefTemplate; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // If setting as default, unset other defaults first
  if (payload.is_default) {
    await supabase
      .from('brief_templates')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('brief_templates')
    .insert({
      user_id: user.id,
      name: payload.name,
      description: payload.description || null,
      is_default: payload.is_default || false,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur creation template' };
  }

  // Add default blocks: title (required) and description (optional)
  const defaultQuestions = [
    {
      template_id: data.id,
      type: 'title',
      label: 'Titre du brief',
      position: 0,
      is_required: true,
      config: {},
    },
    {
      template_id: data.id,
      type: 'description',
      label: 'Decrivez votre projet en quelques mots...',
      position: 1,
      is_required: false,
      config: {},
    },
  ];

  await supabase.from('brief_template_questions').insert(defaultQuestions);

  return { success: true, data };
}

/**
 * Get a template with questions
 */
export async function getTemplate(
  templateId: string
): Promise<{ success: boolean; data?: BriefTemplateWithQuestions; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data, error } = await supabase
    .from('brief_templates')
    .select(`
      *,
      questions:brief_template_questions(*)
    `)
    .eq('id', templateId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return { success: false, error: 'Template introuvable' };
  }

  // Sort questions by position
  if (data.questions) {
    data.questions.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
  }

  return { success: true, data: data as BriefTemplateWithQuestions };
}

/**
 * List templates
 */
export async function listTemplates(
  filter?: TemplateListFilter
): Promise<{ success: boolean; data?: BriefTemplate[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  let query = supabase
    .from('brief_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (filter?.is_default !== undefined) {
    query = query.eq('is_default', filter.is_default);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BriefTemplate[] };
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  payload: UpdateTemplatePayload
): Promise<{ success: boolean; data?: BriefTemplate; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // If setting as default, unset other defaults first
  if (payload.is_default) {
    await supabase
      .from('brief_templates')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
      .neq('id', templateId);
  }

  const { data, error } = await supabase
    .from('brief_templates')
    .update(payload)
    .eq('id', templateId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur mise a jour' };
  }

  return { success: true, data };
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { error } = await supabase
    .from('brief_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  templateId: string,
  newName?: string
): Promise<{ success: boolean; data?: BriefTemplate; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Get original template with questions
  const { data: original, error: fetchError } = await supabase
    .from('brief_templates')
    .select(`
      *,
      questions:brief_template_questions(*)
    `)
    .eq('id', templateId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !original) {
    return { success: false, error: 'Template introuvable' };
  }

  // Create new template
  const { data: newTemplate, error: createError } = await supabase
    .from('brief_templates')
    .insert({
      user_id: user.id,
      name: newName || `${original.name} (copie)`,
      description: original.description,
      is_default: false, // Never copy default status
    })
    .select()
    .single();

  if (createError || !newTemplate) {
    return { success: false, error: createError?.message || 'Erreur duplication' };
  }

  // Copy questions if any
  if (original.questions && original.questions.length > 0) {
    const questions = original.questions.map(
      (q: BriefTemplateQuestion) => ({
        template_id: newTemplate.id,
        type: q.type,
        label: q.label,
        position: q.position,
        is_required: q.is_required,
        config: q.config,
      })
    );

    const { error: questionsError } = await supabase
      .from('brief_template_questions')
      .insert(questions);

    if (questionsError) {
      // Rollback: delete the new template
      await supabase.from('brief_templates').delete().eq('id', newTemplate.id);
      return { success: false, error: questionsError.message };
    }
  }

  return { success: true, data: newTemplate };
}

/**
 * Get default template for user
 */
export async function getDefaultTemplate(): Promise<{
  success: boolean;
  data?: BriefTemplateWithQuestions;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data, error } = await supabase
    .from('brief_templates')
    .select(`
      *,
      questions:brief_template_questions(*)
    `)
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  if (error || !data) {
    // No default template, return first one
    const { data: firstTemplate } = await supabase
      .from('brief_templates')
      .select(`
        *,
        questions:brief_template_questions(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (firstTemplate) {
      return { success: true, data: firstTemplate as BriefTemplateWithQuestions };
    }

    return { success: false, error: 'Aucune template disponible' };
  }

  // Sort questions by position
  if (data.questions) {
    data.questions.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
  }

  return { success: true, data: data as BriefTemplateWithQuestions };
}

// ============================================================================
// Create Template from Brief
// ============================================================================

/**
 * Create a new template from an existing brief's questions
 */
export async function createTemplateFromBrief(
  briefId: string,
  name: string,
  description?: string,
  isDefault?: boolean
): Promise<{ success: boolean; data?: BriefTemplate; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Get the brief with its questions
  const { data: brief, error: briefError } = await supabase
    .from('briefs')
    .select(`
      *,
      questions:brief_questions(*)
    `)
    .eq('id', briefId)
    .eq('user_id', user.id)
    .single();

  if (briefError || !brief) {
    return { success: false, error: 'Brief non trouve' };
  }

  // If setting as default, unset other defaults first
  if (isDefault) {
    await supabase
      .from('brief_templates')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  // Create the new template
  const { data: template, error: templateError } = await supabase
    .from('brief_templates')
    .insert({
      user_id: user.id,
      name,
      description: description || null,
      is_default: isDefault || false,
    })
    .select()
    .single();

  if (templateError || !template) {
    return { success: false, error: 'Erreur lors de la creation du template' };
  }

  // Copy questions from brief to template
  const questions = brief.questions as Array<{
    type: string;
    label: string;
    position: number;
    is_required: boolean;
    config: Record<string, unknown>;
  }>;

  if (questions && questions.length > 0) {
    const templateQuestions = questions.map((q) => ({
      template_id: template.id,
      type: q.type,
      label: q.label,
      position: q.position,
      is_required: q.is_required,
      config: q.config,
    }));

    const { error: questionsError } = await supabase
      .from('brief_template_questions')
      .insert(templateQuestions);

    if (questionsError) {
      // Rollback: delete the template
      await supabase.from('brief_templates').delete().eq('id', template.id);
      return { success: false, error: 'Erreur lors de la copie des questions' };
    }
  }

  return { success: true, data: template as BriefTemplate };
}
