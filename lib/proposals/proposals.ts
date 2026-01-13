import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Proposal,
  ProposalWithDetails,
  ProposalCreate,
  ProposalUpdate,
  ProposalListFilter,
  ProposalStatus,
  ProposalSection,
  ProposalVariable,
} from '@/lib/types/proposals';

type Supabase = SupabaseClient;

/**
 * Generate a unique public token for proposals
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
// Proposals CRUD
// ============================================================================

/**
 * Create a new proposal from a deal and template
 * This is the main function to create proposals - client_id is derived from the deal
 */
export async function createProposalFromDeal(
  supabase: Supabase,
  userId: string,
  dealId: string,
  templateId: string,
  title?: string
): Promise<{ success: boolean; data?: Proposal; error?: string }> {
  // Verify deal ownership and get client_id
  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, client_id')
    .eq('id', dealId)
    .eq('user_id', userId)
    .single();

  if (!deal) {
    return { success: false, error: 'Deal not found' };
  }

  // Verify template access (user-owned OR system template)
  const { data: template } = await supabase
    .from('proposal_templates')
    .select('id, name, theme, sections:proposal_template_sections(*)')
    .eq('id', templateId)
    .or(`owner_user_id.eq.${userId},is_system.eq.true`)
    .single();

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  // Create the proposal
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      owner_user_id: userId,
      deal_id: dealId,
      client_id: deal.client_id, // Derived from deal
      template_id: templateId,
      title: title || `Proposition - ${deal.title}`,
      theme_override: null, // Use template theme by default
      public_token: generatePublicToken(),
      status: 'DRAFT',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Copy template sections to proposal_sections (instance-level copies)
  if (template.sections && template.sections.length > 0) {
    const sections = template.sections.map(
      (s: { title: string; body: string; position: number; is_enabled: boolean }) => ({
        proposal_id: data.id,
        title: s.title,
        body: s.body,
        position: s.position,
        is_enabled: s.is_enabled,
      })
    );

    const { error: sectionsError } = await supabase
      .from('proposal_sections')
      .insert(sections);

    if (sectionsError) {
      // Rollback: delete the proposal if sections failed
      await supabase.from('proposals').delete().eq('id', data.id);
      return { success: false, error: sectionsError.message };
    }
  }

  // Set default variables from deal/client
  const { data: client } = await supabase
    .from('clients')
    .select('nom')
    .eq('id', deal.client_id)
    .single();

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('user_id', userId)
    .single();

  const defaultVariables = [
    { proposal_id: data.id, key: 'client_name', value: client?.nom || '' },
    { proposal_id: data.id, key: 'deal_title', value: deal.title || '' },
    { proposal_id: data.id, key: 'company_name', value: company?.name || '' },
    { proposal_id: data.id, key: 'contact_name', value: '' }, // To be set later when recipients are added
  ];

  await supabase.from('proposal_variables').insert(defaultVariables);

  return { success: true, data };
}

/**
 * Create a new proposal (legacy function, prefer createProposalFromDeal)
 */
export async function createProposal(
  supabase: Supabase,
  userId: string,
  payload: ProposalCreate
): Promise<{ success: boolean; data?: Proposal; error?: string }> {
  return createProposalFromDeal(
    supabase,
    userId,
    payload.deal_id,
    payload.template_id,
    payload.title
  );
}

/**
 * Get a proposal with full details
 */
export async function getProposal(
  supabase: Supabase,
  userId: string,
  proposalId: string
): Promise<ProposalWithDetails | null> {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      *,
      client:clients(id, nom, email, type),
      deal:deals(id, title, status),
      template:proposal_templates(
        *,
        sections:proposal_template_sections(*)
      ),
      sections:proposal_sections(*),
      variables:proposal_variables(*),
      recipients:proposal_recipients(
        *,
        contact:contacts(id, nom, prenom, civilite, email, telephone)
      )
    `)
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .single();

  if (error || !proposal) {
    console.error('getProposal error:', error);
    return null;
  }

  console.log('[getProposal] Returning proposal with preset_id:', proposal.preset_id);

  // Sort sections by position
  if (proposal.sections) {
    proposal.sections.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
  }

  return proposal as ProposalWithDetails;
}

/**
 * Get a proposal by public token (for public access)
 */
export async function getProposalByToken(
  supabase: Supabase,
  publicToken: string
): Promise<ProposalWithDetails | null> {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      *,
      client:clients(id, nom, email, type),
      deal:deals(id, title, status),
      template:proposal_templates(*),
      sections:proposal_sections(*),
      variables:proposal_variables(*),
      recipients:proposal_recipients(
        *,
        contact:contacts(id, nom, prenom, civilite, email, telephone)
      )
    `)
    .eq('public_token', publicToken)
    .single();

  if (error || !proposal) {
    console.error('getProposalByToken error:', error);
    return null;
  }

  // Sort sections by position
  if (proposal.sections) {
    proposal.sections.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );
  }

  return proposal as ProposalWithDetails;
}

/**
 * List proposals with optional filters
 */
export async function listProposals(
  supabase: Supabase,
  userId: string,
  filter?: ProposalListFilter
): Promise<Proposal[]> {
  let query = supabase
    .from('proposals')
    .select(`
      *,
      client:clients(id, nom, type),
      deal:deals(id, title),
      template:proposal_templates(id, name)
    `)
    .eq('owner_user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id);
  }

  if (filter?.deal_id) {
    query = query.eq('deal_id', filter.deal_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listProposals error:', error);
    return [];
  }

  return data || [];
}

/**
 * Update a proposal
 */
export async function updateProposal(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  patch: ProposalUpdate
): Promise<{ success: boolean; data?: Proposal; error?: string }> {
  const { data, error } = await supabase
    .from('proposals')
    .update(patch)
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Set proposal status with appropriate timestamps
 */
export async function setProposalStatus(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  status: ProposalStatus
): Promise<{ success: boolean; data?: Proposal; error?: string }> {
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = { status };

  // Set appropriate timestamp based on status
  switch (status) {
    case 'SENT':
      updateData.sent_at = now;
      break;
    case 'ACCEPTED':
      updateData.accepted_at = now;
      break;
    case 'REFUSED':
      updateData.refused_at = now;
      break;
  }

  const { data, error } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a proposal (soft delete - goes to trash)
 */
export async function deleteProposal(
  supabase: Supabase,
  userId: string,
  proposalId: string
): Promise<{ success: boolean; error?: string }> {
  // Soft delete - set deleted_at instead of actual delete
  const { error } = await supabase
    .from('proposals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .is('deleted_at', null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update proposal sections
 */
export async function updateProposalSection(
  supabase: Supabase,
  userId: string,
  sectionId: string,
  patch: { title?: string; body?: string; position?: number; is_enabled?: boolean }
): Promise<{ success: boolean; data?: ProposalSection; error?: string }> {
  // Verify ownership via proposal
  const { data: section } = await supabase
    .from('proposal_sections')
    .select('id, proposal_id, proposals!inner(owner_user_id)')
    .eq('id', sectionId)
    .single();

  if (!section || (section as unknown as { proposals: { owner_user_id: string } }).proposals.owner_user_id !== userId) {
    return { success: false, error: 'Section not found' };
  }

  const { data, error } = await supabase
    .from('proposal_sections')
    .update(patch)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Set proposal variables
 */
export async function setProposalVariables(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  variables: { key: string; value: string }[]
): Promise<{ success: boolean; data?: ProposalVariable[]; error?: string }> {
  // Verify ownership
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .single();

  if (!proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  // Delete existing variables
  await supabase
    .from('proposal_variables')
    .delete()
    .eq('proposal_id', proposalId);

  // Insert new variables
  if (variables.length > 0) {
    const { data, error } = await supabase
      .from('proposal_variables')
      .insert(variables.map(v => ({
        proposal_id: proposalId,
        key: v.key,
        value: v.value,
      })))
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  return { success: true, data: [] };
}

// ============================================================================
// Create Proposal from Structure Template
// ============================================================================

interface CreateFromStructureInput {
  structure_template_id: string;
  design_preset_id?: string;
  title?: string;
  deal_id?: string;
  client_id?: string;
}

/**
 * Create a new proposal from a structure template
 * This copies the pages from the template with their placeholders
 */
export async function createProposalFromStructure(
  supabase: Supabase,
  userId: string,
  input: CreateFromStructureInput
): Promise<{ success: boolean; data?: Proposal; error?: string }> {
  // Fetch the structure template with pages
  const { data: template, error: templateError } = await supabase
    .from('structure_templates')
    .select(`
      *,
      pages:structure_template_pages(*)
    `)
    .eq('id', input.structure_template_id)
    .single();

  if (templateError || !template) {
    return { success: false, error: 'Template de structure non trouvé' };
  }

  // Verify access (system template or owned by user)
  if (!template.is_system && template.owner_user_id !== userId) {
    return { success: false, error: 'Accès non autorisé au template' };
  }

  // Validate deal if provided
  if (input.deal_id) {
    const { data: deal } = await supabase
      .from('deals')
      .select('id')
      .eq('id', input.deal_id)
      .eq('user_id', userId)
      .single();

    if (!deal) {
      return { success: false, error: 'Deal non trouvé' };
    }
  }

  // Validate client if provided
  if (input.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', input.client_id)
      .eq('user_id', userId)
      .single();

    if (!client) {
      return { success: false, error: 'Client non trouvé' };
    }
  }

  // Create the proposal
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .insert({
      owner_user_id: userId,
      deal_id: input.deal_id || null,
      client_id: input.client_id || null,
      template_id: null, // No design template, using preset_id instead
      preset_id: input.design_preset_id || 'classic',
      title: input.title || template.name,
      theme_override: null,
      visual_options_override: null,
      public_token: generatePublicToken(),
      status: 'DRAFT',
    })
    .select()
    .single();

  if (proposalError) {
    console.error('[createProposalFromStructure] Error creating proposal:', proposalError);
    return { success: false, error: 'Erreur lors de la création de la proposition' };
  }

  console.log('[createProposalFromStructure] Created proposal with preset_id:', proposal.preset_id);

  // Copy pages from the structure template
  const sortedPages = (template.pages || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  if (sortedPages.length > 0) {
    const pagesToInsert = sortedPages.map((page: {
      title: string;
      sort_order: number;
      is_cover: boolean;
      content: unknown;
    }, index: number) => ({
      proposal_id: proposal.id,
      title: page.title,
      sort_order: index,
      is_cover: page.is_cover,
      is_visible: true,
      content: page.content,
    }));

    const { error: pagesError } = await supabase
      .from('proposal_pages')
      .insert(pagesToInsert);

    if (pagesError) {
      console.error('[createProposalFromStructure] Error creating pages:', pagesError);
      // Cleanup: delete the proposal
      await supabase.from('proposals').delete().eq('id', proposal.id);
      return { success: false, error: 'Erreur lors de la création des pages' };
    }
  }

  return { success: true, data: proposal };
}
