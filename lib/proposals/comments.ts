import { SupabaseClient } from '@supabase/supabase-js';
import type { ProposalComment } from '@/lib/types/proposals';

type Supabase = SupabaseClient;

// ============================================================================
// Proposal Comments
// ============================================================================

/**
 * List all comments for a proposal
 */
export async function listProposalComments(
  supabase: Supabase,
  userId: string,
  proposalId: string
): Promise<ProposalComment[]> {
  // Verify proposal ownership
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (!proposal) {
    return [];
  }

  const { data, error } = await supabase
    .from('proposal_comments')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('listProposalComments error:', error);
    return [];
  }

  return (data || []) as ProposalComment[];
}

/**
 * Add a comment from the user (author_type = 'user')
 */
export async function addProposalCommentUser(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  sectionId: string | null,
  body: string
): Promise<{ success: boolean; comment?: ProposalComment; error?: string }> {
  // Verify proposal ownership
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  const { data, error } = await supabase
    .from('proposal_comments')
    .insert({
      proposal_id: proposalId,
      section_id: sectionId,
      author_type: 'user',
      author_name: null, // User comments don't need a name (we know who they are)
      body,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, comment: data as ProposalComment };
}

/**
 * List comments for a proposal by public token (no auth required)
 */
export async function listProposalCommentsByToken(
  supabase: Supabase,
  publicToken: string
): Promise<ProposalComment[]> {
  // Get proposal by token
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, status')
    .eq('public_token', publicToken)
    .single();

  if (!proposal || proposal.status === 'draft') {
    return [];
  }

  const { data, error } = await supabase
    .from('proposal_comments')
    .select('*')
    .eq('proposal_id', proposal.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('listProposalCommentsByToken error:', error);
    return [];
  }

  return (data || []) as ProposalComment[];
}

/**
 * Add a comment from a client (author_type = 'client', no auth required)
 * Validates token and section ownership
 */
export async function addProposalCommentClient(
  supabase: Supabase,
  publicToken: string,
  sectionId: string | null,
  authorName: string | null,
  body: string
): Promise<{ success: boolean; comment?: ProposalComment; error?: string }> {
  // Validate body length (anti-abuse)
  if (!body || body.trim().length === 0) {
    return { success: false, error: 'Le commentaire ne peut pas être vide' };
  }
  if (body.length > 2000) {
    return { success: false, error: 'Le commentaire est trop long (max 2000 caractères)' };
  }

  // Validate author name if provided
  if (authorName && authorName.length > 100) {
    return { success: false, error: 'Le nom est trop long (max 100 caractères)' };
  }

  // Get proposal by token
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, status, template_id')
    .eq('public_token', publicToken)
    .single();

  if (!proposal) {
    return { success: false, error: 'Proposition non trouvée' };
  }

  // Don't allow comments on draft proposals
  if (proposal.status === 'draft') {
    return { success: false, error: 'Proposition non accessible' };
  }

  // If sectionId provided, verify it belongs to this proposal's template
  if (sectionId) {
    const { data: section } = await supabase
      .from('proposal_template_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('template_id', proposal.template_id)
      .single();

    if (!section) {
      return { success: false, error: 'Section non trouvée' };
    }
  }

  // Insert comment
  const { data, error } = await supabase
    .from('proposal_comments')
    .insert({
      proposal_id: proposal.id,
      section_id: sectionId,
      author_type: 'client',
      author_name: authorName?.trim() || null,
      body: body.trim(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update proposal status to 'commented' if it was 'sent' or 'draft'
  if (proposal.status === 'sent' || proposal.status === 'draft') {
    await supabase
      .from('proposals')
      .update({ status: 'commented' })
      .eq('id', proposal.id);
  }

  return { success: true, comment: data as ProposalComment };
}

/**
 * Delete a comment from a proposal
 */
export async function deleteProposalComment(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify proposal ownership
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  const { error } = await supabase
    .from('proposal_comments')
    .delete()
    .eq('id', commentId)
    .eq('proposal_id', proposalId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
