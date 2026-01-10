import { SupabaseClient } from '@supabase/supabase-js';
import type { ProposalPublicView, ProposalComment, ProposalStatus, ProposalTheme } from '@/lib/types/proposals';
import { buildContextFromProposal, renderTemplate, buildVariableMap } from './variables';

type Supabase = SupabaseClient;

interface ProposalActionResult {
  success: boolean;
  status?: ProposalStatus;
  error?: string;
}

/**
 * Get a proposal for public viewing (limited data, no sensitive info)
 * Variables are rendered in section title/body before returning.
 */
export async function getProposalPublicView(
  supabase: Supabase,
  publicToken: string
): Promise<ProposalPublicView | null> {
  // Get proposal with all data needed for variable interpolation
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      id,
      status,
      title,
      owner_user_id,
      theme_override,
      client:clients(nom, email, telephone, adresse, ville, code_postal, pays),
      deal:deals(title, estimated_amount, currency, description),
      template:proposal_templates(theme),
      sections:proposal_sections(
        id,
        title,
        body,
        position,
        is_enabled
      ),
      variables:proposal_variables(key, value),
      recipients:proposal_recipients(
        contact:contacts(civilite, prenom, nom, email, telephone)
      )
    `)
    .eq('public_token', publicToken)
    .single();

  if (error || !proposal) {
    console.error('getProposalPublicView error:', error);
    return null;
  }

  // Don't expose draft proposals publicly
  if (proposal.status === 'DRAFT') {
    return null;
  }

  // Get company info for header and variable interpolation
  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, email, phone, address, city, postal_code, country, siret, vat_number')
    .eq('user_id', proposal.owner_user_id)
    .single();

  // Get comments
  const { data: commentsData } = await supabase
    .from('proposal_comments')
    .select('*')
    .eq('proposal_id', proposal.id)
    .order('created_at', { ascending: true });

  // Handle relations which can be object or array
  const client = Array.isArray(proposal.client) ? proposal.client[0] : proposal.client;
  const deal = Array.isArray(proposal.deal) ? proposal.deal[0] : proposal.deal;
  const template = Array.isArray(proposal.template) ? proposal.template[0] : proposal.template;

  // Build variable context for rendering
  const context = buildContextFromProposal({
    variables: proposal.variables || [],
    deal: deal ? {
      title: deal.title,
      estimated_amount: deal.estimated_amount,
      currency: deal.currency,
      description: deal.description,
    } : undefined,
    client: client ? {
      nom: client.nom,
      email: client.email,
      telephone: client.telephone,
      adresse: client.adresse,
      ville: client.ville,
      code_postal: client.code_postal,
      pays: client.pays,
    } : undefined,
    recipients: proposal.recipients?.map((r: { contact: {
      civilite: string | null;
      prenom: string | null;
      nom: string | null;
      email: string | null;
      telephone: string | null;
    }[] | {
      civilite: string | null;
      prenom: string | null;
      nom: string | null;
      email: string | null;
      telephone: string | null;
    } | null }) => {
      // Handle both array (Supabase join) and object formats
      const contact = Array.isArray(r.contact) ? r.contact[0] : r.contact;
      return { contact };
    }),
    company: company ? {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      postal_code: company.postal_code,
      country: company.country,
      siret: company.siret,
      vat_number: company.vat_number,
    } : undefined,
  });

  const variableMap = buildVariableMap(context);

  // Filter and sort sections
  const sections = (proposal.sections || [])
    .filter((s: { is_enabled: boolean }) => s.is_enabled)
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position);

  // Resolve theme (override takes precedence)
  const theme: ProposalTheme = proposal.theme_override || template?.theme || {
    primaryColor: '#111111',
    accentColor: '#3B82F6',
    font: 'Inter',
  };

  return {
    status: proposal.status as ProposalStatus,
    title: renderTemplate(proposal.title, variableMap),
    client_name: client?.nom || 'Client',
    token: publicToken,
    theme,
    sections: sections.map((s: {
      id: string;
      title: string;
      body: string;
      position: number;
    }) => ({
      id: s.id,
      title: renderTemplate(s.title, variableMap),
      body: renderTemplate(s.body, variableMap),
      position: s.position,
    })),
    company: company ? {
      name: company.name,
      logo_url: company.logo_url,
    } : undefined,
    comments: (commentsData || []) as ProposalComment[],
  };
}

/**
 * Accept a proposal (public action via token)
 */
export async function acceptProposalByToken(
  supabase: Supabase,
  publicToken: string
): Promise<ProposalActionResult> {
  // Get proposal by token
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, status')
    .eq('public_token', publicToken)
    .single();

  if (!proposal) {
    return { success: false, error: 'Proposition non trouvée' };
  }

  // Don't allow action on draft proposals
  if (proposal.status === 'DRAFT') {
    return { success: false, error: 'Proposition non accessible' };
  }

  // Already accepted - idempotent response
  if (proposal.status === 'ACCEPTED') {
    return { success: true, status: 'ACCEPTED' };
  }

  // Already refused - can't accept
  if (proposal.status === 'REFUSED') {
    return { success: false, status: 'REFUSED', error: 'Cette proposition a déjà été refusée' };
  }

  // Update to accepted
  const { error } = await supabase
    .from('proposals')
    .update({
      status: 'ACCEPTED',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', proposal.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, status: 'ACCEPTED' };
}

/**
 * Refuse a proposal (public action via token)
 */
export async function refuseProposalByToken(
  supabase: Supabase,
  publicToken: string,
  reason?: string
): Promise<ProposalActionResult> {
  // Get proposal by token
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, status')
    .eq('public_token', publicToken)
    .single();

  if (!proposal) {
    return { success: false, error: 'Proposition non trouvée' };
  }

  // Don't allow action on draft proposals
  if (proposal.status === 'DRAFT') {
    return { success: false, error: 'Proposition non accessible' };
  }

  // Already refused - idempotent response
  if (proposal.status === 'REFUSED') {
    return { success: true, status: 'REFUSED' };
  }

  // Already accepted - can't refuse
  if (proposal.status === 'ACCEPTED') {
    return { success: false, status: 'ACCEPTED', error: 'Cette proposition a déjà été acceptée' };
  }

  // Update to refused
  const { error } = await supabase
    .from('proposals')
    .update({
      status: 'REFUSED',
      refused_at: new Date().toISOString(),
    })
    .eq('id', proposal.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // If a reason is provided, add it as a comment
  if (reason && reason.trim()) {
    await supabase
      .from('proposal_comments')
      .insert({
        proposal_id: proposal.id,
        section_id: null,
        author_type: 'client',
        author_name: null,
        body: `Raison du refus : ${reason.trim()}`,
      });
  }

  return { success: true, status: 'REFUSED' };
}
