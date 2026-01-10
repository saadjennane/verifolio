import { createClient } from '@/lib/supabase/server';
import type {
  BriefQuestion,
  BriefTemplateQuestion,
  BriefResponse,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  SubmitBriefPayload,
  StructuredValue,
} from './types';

// ============================================================================
// Template Questions CRUD
// ============================================================================

/**
 * Add a question to a template
 */
export async function addTemplateQuestion(
  templateId: string,
  payload: CreateQuestionPayload
): Promise<{ success: boolean; data?: BriefTemplateQuestion; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify template ownership
  const { data: template } = await supabase
    .from('brief_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .single();

  if (!template) {
    return { success: false, error: 'Template introuvable' };
  }

  // Get max position if not provided
  let position = payload.position;
  if (position === undefined) {
    const { data: maxPos } = await supabase
      .from('brief_template_questions')
      .select('position')
      .eq('template_id', templateId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    position = (maxPos?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('brief_template_questions')
    .insert({
      template_id: templateId,
      type: payload.type,
      label: payload.label,
      position,
      is_required: payload.is_required || false,
      config: payload.config || {},
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur ajout question' };
  }

  return { success: true, data };
}

/**
 * Update a template question
 */
export async function updateTemplateQuestion(
  questionId: string,
  payload: UpdateQuestionPayload
): Promise<{ success: boolean; data?: BriefTemplateQuestion; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify ownership via template
  const { data: question } = await supabase
    .from('brief_template_questions')
    .select('id, template:brief_templates!inner(user_id)')
    .eq('id', questionId)
    .single();

  if (!question) {
    return { success: false, error: 'Question introuvable' };
  }

  const templateData = question.template as unknown as { user_id: string };
  if (templateData.user_id !== user.id) {
    return { success: false, error: 'Acces refuse' };
  }

  const { data, error } = await supabase
    .from('brief_template_questions')
    .update(payload)
    .eq('id', questionId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur mise a jour' };
  }

  return { success: true, data };
}

/**
 * Delete a template question
 */
export async function deleteTemplateQuestion(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify ownership via template
  const { data: question } = await supabase
    .from('brief_template_questions')
    .select('id, template:brief_templates!inner(user_id)')
    .eq('id', questionId)
    .single();

  if (!question) {
    return { success: false, error: 'Question introuvable' };
  }

  const templateData = question.template as unknown as { user_id: string };
  if (templateData.user_id !== user.id) {
    return { success: false, error: 'Acces refuse' };
  }

  const { error } = await supabase
    .from('brief_template_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder template questions
 */
export async function reorderTemplateQuestions(
  templateId: string,
  questionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify template ownership
  const { data: template } = await supabase
    .from('brief_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .single();

  if (!template) {
    return { success: false, error: 'Template introuvable' };
  }

  // Update positions
  const updates = questionIds.map((id, index) =>
    supabase
      .from('brief_template_questions')
      .update({ position: index })
      .eq('id', id)
      .eq('template_id', templateId)
  );

  await Promise.all(updates);

  return { success: true };
}

// ============================================================================
// Brief Questions CRUD
// ============================================================================

/**
 * Add a question to a brief
 */
export async function addBriefQuestion(
  briefId: string,
  payload: CreateQuestionPayload
): Promise<{ success: boolean; data?: BriefQuestion; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify brief ownership and status
  const { data: brief } = await supabase
    .from('briefs')
    .select('id, status')
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!brief) {
    return { success: false, error: 'Brief introuvable' };
  }

  if (brief.status !== 'DRAFT') {
    return { success: false, error: 'Brief non modifiable' };
  }

  // Get max position if not provided
  let position = payload.position;
  if (position === undefined) {
    const { data: maxPos } = await supabase
      .from('brief_questions')
      .select('position')
      .eq('brief_id', briefId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    position = (maxPos?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('brief_questions')
    .insert({
      brief_id: briefId,
      type: payload.type,
      label: payload.label,
      position,
      is_required: payload.is_required || false,
      config: payload.config || {},
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur ajout question' };
  }

  return { success: true, data };
}

/**
 * Update a brief question
 */
export async function updateBriefQuestion(
  questionId: string,
  payload: UpdateQuestionPayload
): Promise<{ success: boolean; data?: BriefQuestion; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify ownership via brief
  const { data: question } = await supabase
    .from('brief_questions')
    .select('id, brief:briefs!inner(user_id, status)')
    .eq('id', questionId)
    .single();

  if (!question) {
    return { success: false, error: 'Question introuvable' };
  }

  const briefData = question.brief as unknown as { user_id: string; status: string };
  if (briefData.user_id !== user.id) {
    return { success: false, error: 'Acces refuse' };
  }

  if (briefData.status !== 'DRAFT') {
    return { success: false, error: 'Brief non modifiable' };
  }

  const { data, error } = await supabase
    .from('brief_questions')
    .update(payload)
    .eq('id', questionId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur mise a jour' };
  }

  return { success: true, data };
}

/**
 * Delete a brief question
 */
export async function deleteBriefQuestion(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify ownership via brief
  const { data: question } = await supabase
    .from('brief_questions')
    .select('id, brief:briefs!inner(user_id, status)')
    .eq('id', questionId)
    .single();

  if (!question) {
    return { success: false, error: 'Question introuvable' };
  }

  const briefData = question.brief as unknown as { user_id: string; status: string };
  if (briefData.user_id !== user.id) {
    return { success: false, error: 'Acces refuse' };
  }

  if (briefData.status !== 'DRAFT') {
    return { success: false, error: 'Brief non modifiable' };
  }

  const { error } = await supabase
    .from('brief_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder brief questions
 */
export async function reorderBriefQuestions(
  briefId: string,
  questionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify brief ownership and status
  const { data: brief } = await supabase
    .from('briefs')
    .select('id, status')
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!brief) {
    return { success: false, error: 'Brief introuvable' };
  }

  if (brief.status !== 'DRAFT') {
    return { success: false, error: 'Brief non modifiable' };
  }

  // Update positions
  const updates = questionIds.map((id, index) =>
    supabase
      .from('brief_questions')
      .update({ position: index })
      .eq('id', id)
      .eq('brief_id', briefId)
  );

  await Promise.all(updates);

  return { success: true };
}

// ============================================================================
// Responses (Public submission)
// ============================================================================

/**
 * Submit responses to a brief (via public token)
 * Note: This uses service role or bypasses RLS for public access
 */
export async function submitBriefResponses(
  publicToken: string,
  payload: SubmitBriefPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get brief by token (no auth required for public access)
  const { data: brief, error: briefError } = await supabase
    .from('briefs')
    .select('id, status')
    .eq('public_token', publicToken)
    .is('deleted_at', null)
    .single();

  if (briefError || !brief) {
    return { success: false, error: 'Brief introuvable' };
  }

  if (brief.status !== 'SENT') {
    return { success: false, error: 'Brief non disponible pour reponse' };
  }

  // Get all questions for this brief
  const { data: questions } = await supabase
    .from('brief_questions')
    .select('id, is_required, type')
    .eq('brief_id', brief.id);

  if (!questions) {
    return { success: false, error: 'Aucune question' };
  }

  // Validate required questions
  const dataQuestions = questions.filter(
    (q) => !['title', 'description', 'separator'].includes(q.type)
  );

  for (const q of dataQuestions) {
    if (q.is_required) {
      const response = payload.responses.find((r) => r.question_id === q.id);
      if (!response || (!response.value && !response.structured_value)) {
        return { success: false, error: 'Champ obligatoire manquant' };
      }
    }
  }

  // Upsert responses
  for (const response of payload.responses) {
    const { error } = await supabase
      .from('brief_responses')
      .upsert(
        {
          question_id: response.question_id,
          value: response.value || null,
          structured_value: response.structured_value as StructuredValue || null,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'question_id' }
      );

    if (error) {
      console.error('Error saving response:', error);
    }
  }

  // Update brief status to RESPONDED
  await supabase
    .from('briefs')
    .update({
      status: 'RESPONDED',
      responded_at: new Date().toISOString(),
    })
    .eq('id', brief.id);

  return { success: true };
}

/**
 * Get responses for a brief
 */
export async function getBriefResponses(
  briefId: string
): Promise<{ success: boolean; data?: BriefResponse[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify brief ownership
  const { data: brief } = await supabase
    .from('briefs')
    .select('id')
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!brief) {
    return { success: false, error: 'Brief introuvable' };
  }

  const { data, error } = await supabase
    .from('brief_responses')
    .select('*, question:brief_questions!inner(brief_id)')
    .eq('question.brief_id', briefId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BriefResponse[] };
}
