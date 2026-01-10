import { SupabaseClient } from '@supabase/supabase-js';
import type { ProposalRecipientWithContact } from '@/lib/types/proposals';

type Supabase = SupabaseClient;

// ============================================================================
// Client Contacts for Proposals
// ============================================================================

interface ClientContact {
  id: string;
  nom: string;
  prenom: string | null;
  civilite: string | null;
  email: string | null;
  telephone: string | null;
  role: string | null;
  is_primary: boolean;
}

/**
 * List all contacts linked to a client (for proposal recipient selection)
 */
export async function listClientContactsForProposal(
  supabase: Supabase,
  userId: string,
  clientId: string
): Promise<ClientContact[]> {
  // Verify client ownership
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (!client) {
    return [];
  }

  const { data, error } = await supabase
    .from('client_contacts')
    .select(`
      role,
      is_primary,
      contact:contacts(id, nom, prenom, civilite, email, telephone)
    `)
    .eq('client_id', clientId);

  if (error) {
    console.error('listClientContactsForProposal error:', error);
    return [];
  }

  // Flatten the response - contact can be an object or array depending on Supabase response
  return (data || [])
    .filter((item) => item.contact)
    .map((item) => {
      const contact = Array.isArray(item.contact) ? item.contact[0] : item.contact;
      return {
        id: contact.id as string,
        nom: contact.nom as string,
        prenom: contact.prenom as string | null,
        civilite: contact.civilite as string | null,
        email: contact.email as string | null,
        telephone: contact.telephone as string | null,
        role: item.role,
        is_primary: item.is_primary,
      };
    });
}

// ============================================================================
// Proposal Recipients
// ============================================================================

/**
 * List recipients for a proposal
 */
export async function listProposalRecipients(
  supabase: Supabase,
  userId: string,
  proposalId: string
): Promise<ProposalRecipientWithContact[]> {
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
    .from('proposal_recipients')
    .select(`
      *,
      contact:contacts(id, nom, prenom, civilite, email, telephone)
    `)
    .eq('proposal_id', proposalId);

  if (error) {
    console.error('listProposalRecipients error:', error);
    return [];
  }

  return (data || []) as ProposalRecipientWithContact[];
}

/**
 * Set proposal recipients (replaces existing list atomically)
 */
export async function setProposalRecipients(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  contactIds: string[]
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

  // Delete existing recipients
  const { error: deleteError } = await supabase
    .from('proposal_recipients')
    .delete()
    .eq('proposal_id', proposalId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Insert new recipients if any
  if (contactIds.length > 0) {
    const recipientsToInsert = contactIds.map((contactId) => ({
      proposal_id: proposalId,
      contact_id: contactId,
    }));

    const { error: insertError } = await supabase
      .from('proposal_recipients')
      .insert(recipientsToInsert);

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
}

/**
 * Add a single recipient to a proposal
 */
export async function addProposalRecipient(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  contactId: string
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
    .from('proposal_recipients')
    .insert({
      proposal_id: proposalId,
      contact_id: contactId,
    });

  if (error) {
    // Handle duplicate
    if (error.code === '23505') {
      return { success: true }; // Already exists, not an error
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a recipient from a proposal
 */
export async function removeProposalRecipient(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  contactId: string
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
    .from('proposal_recipients')
    .delete()
    .eq('proposal_id', proposalId)
    .eq('contact_id', contactId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
