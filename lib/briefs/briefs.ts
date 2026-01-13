import { createClient } from '@/lib/supabase/server';
import type {
  Brief,
  BriefWithDetails,
  BriefListItem,
  BriefListFilter,
  CreateBriefPayload,
  UpdateBriefPayload,
  BriefStatus,
} from './types';

/**
 * Generate a unique public token for briefs
 */
function generatePublicToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================================================
// Briefs CRUD
// ============================================================================

/**
 * Create a new brief from a deal and template
 */
export async function createBrief(
  payload: CreateBriefPayload
): Promise<{ success: boolean; data?: Brief; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  // Verify deal ownership and get client_id
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, title, client_id')
    .eq('id', payload.deal_id)
    .eq('user_id', user.id)
    .single();

  if (dealError || !deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  // Verify template ownership and get theme settings
  const { data: template, error: templateError } = await supabase
    .from('brief_templates')
    .select('id, name, theme_color, show_logo, questions:brief_template_questions(*)')
    .eq('id', payload.template_id)
    .eq('user_id', user.id)
    .single();

  if (templateError || !template) {
    return { success: false, error: 'Template introuvable' };
  }

  // Create the brief with theme settings from template
  const { data: brief, error: briefError } = await supabase
    .from('briefs')
    .insert({
      user_id: user.id,
      deal_id: payload.deal_id,
      client_id: deal.client_id,
      template_id: payload.template_id,
      title: payload.title || `Brief - ${deal.title}`,
      status: 'DRAFT',
      public_token: generatePublicToken(),
      theme_color: template.theme_color || 'blue',
      show_logo: template.show_logo ?? true,
    })
    .select()
    .single();

  if (briefError || !brief) {
    return { success: false, error: briefError?.message || 'Erreur creation brief' };
  }

  // Copy template questions to brief
  if (template.questions && template.questions.length > 0) {
    const questions = template.questions.map(
      (q: { type: string; label: string; position: number; is_required: boolean; config: object }) => ({
        brief_id: brief.id,
        type: q.type,
        label: q.label,
        position: q.position,
        is_required: q.is_required,
        config: q.config,
      })
    );

    const { error: questionsError } = await supabase
      .from('brief_questions')
      .insert(questions);

    if (questionsError) {
      // Rollback: delete the brief
      await supabase.from('briefs').delete().eq('id', brief.id);
      return { success: false, error: questionsError.message };
    }
  }

  return { success: true, data: brief };
}

/**
 * Get a brief with full details
 */
export async function getBrief(
  briefId: string
): Promise<{ success: boolean; data?: BriefWithDetails; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data: brief, error } = await supabase
    .from('briefs')
    .select(`
      *,
      deal:deals(id, title),
      client:clients(id, nom),
      template:brief_templates(id, name),
      questions:brief_questions(
        *,
        response:brief_responses(*)
      )
    `)
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (error || !brief) {
    return { success: false, error: 'Brief introuvable' };
  }

  // Sort questions by position
  if (brief.questions) {
    brief.questions.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );

    // Flatten response array to single response
    brief.questions = brief.questions.map((q: { response: object[] }) => ({
      ...q,
      response: q.response?.[0] || null,
    }));
  }

  return { success: true, data: brief as BriefWithDetails };
}

/**
 * Get a brief by public token (for public access)
 */
export async function getBriefByToken(
  publicToken: string
): Promise<BriefWithDetails | null> {
  const supabase = await createClient();

  const { data: brief, error } = await supabase
    .from('briefs')
    .select(`
      *,
      deal:deals(id, title),
      client:clients(id, nom),
      template:brief_templates(id, name),
      questions:brief_questions(
        *,
        response:brief_responses(*)
      )
    `)
    .eq('public_token', publicToken)
    .is('deleted_at', null)
    .single();

  if (error || !brief) {
    return null;
  }

  // Sort questions by position
  if (brief.questions) {
    brief.questions.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );

    // Flatten response array to single response
    brief.questions = brief.questions.map((q: { response: object[] }) => ({
      ...q,
      response: q.response?.[0] || null,
    }));
  }

  return brief as BriefWithDetails;
}

/**
 * List briefs with optional filters
 */
export async function listBriefs(
  filter?: BriefListFilter
): Promise<{ success: boolean; data?: BriefListItem[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  let query = supabase
    .from('briefs')
    .select(`
      *,
      deal:deals(id, title),
      client:clients(id, nom)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.deal_id) {
    query = query.eq('deal_id', filter.deal_id);
  }

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BriefListItem[] };
}

/**
 * Update a brief
 */
export async function updateBrief(
  briefId: string,
  payload: UpdateBriefPayload
): Promise<{ success: boolean; data?: Brief; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { data, error } = await supabase
    .from('briefs')
    .update(payload)
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur mise a jour' };
  }

  return { success: true, data };
}

/**
 * Set brief status with appropriate timestamps
 */
export async function setBriefStatus(
  briefId: string,
  status: BriefStatus
): Promise<{ success: boolean; data?: Brief; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { status };

  // Set appropriate timestamp based on status
  switch (status) {
    case 'SENT':
      updateData.sent_at = now;
      break;
    case 'RESPONDED':
      updateData.responded_at = now;
      break;
  }

  const { data, error } = await supabase
    .from('briefs')
    .update(updateData)
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Erreur changement statut' };
  }

  return { success: true, data };
}

/**
 * Delete a brief (soft delete)
 */
export async function deleteBrief(
  briefId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifie' };
  }

  const { error } = await supabase
    .from('briefs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
