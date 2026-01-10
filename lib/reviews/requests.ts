import { createClient } from '@/lib/supabase/server';
import type {
  ReviewRequest,
  ReviewRequestRecipient,
  CreateReviewRequestPayload,
  ListReviewRequestsFilter,
} from './types';

/**
 * Génère un token public unique pour une review request
 */
function generatePublicToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Crée une demande d'avis pour une facture
 * RÈGLES STRICTES:
 * - Facture DOIT être au statut 'sent' ou 'envoyee'
 * - Facture DOIT être liée à une mission
 */
export async function createReviewRequest(
  invoiceId: string,
  payload: CreateReviewRequestPayload
): Promise<{ success: boolean; data?: ReviewRequest; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que la facture existe et est au statut 'sent'
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, status, client_id, mission_id')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (invoiceError || !invoice) {
    return { success: false, error: 'Facture introuvable' };
  }

  // Validation stricte: facture envoyée
  if (!['sent', 'envoyee'].includes(invoice.status)) {
    return {
      success: false,
      error: `Une Review Request ne peut être créée QUE pour une facture envoyée. Statut actuel: "${invoice.status}".`,
    };
  }

  // Validation stricte: facture liée à une mission
  if (!invoice.mission_id) {
    // Vérifier via mission_invoices
    const { data: missionLink } = await supabase
      .from('mission_invoices')
      .select('mission_id')
      .eq('invoice_id', invoiceId)
      .single();

    if (!missionLink) {
      return {
        success: false,
        error: 'La facture doit être liée à une mission pour créer une Review Request.',
      };
    }

    // Utiliser le mission_id récupéré
    invoice.mission_id = missionLink.mission_id;
  }

  // Vérifier qu'il n'existe pas déjà une request pour cette facture
  const { data: existingRequest } = await supabase
    .from('review_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('invoice_id', invoiceId)
    .maybeSingle();

  if (existingRequest) {
    return {
      success: false,
      error: 'Une demande d\'avis existe déjà pour cette facture',
    };
  }

  // Récupérer les tags de la mission pour les proposer
  let suggestedTags: Array<{ tag: string; color: string }> = [];
  if (invoice.mission_id) {
    const { data: missionTags } = await supabase
      .from('mission_tags')
      .select('tag, color')
      .eq('mission_id', invoice.mission_id);

    if (missionTags) {
      suggestedTags = missionTags;
    }
  }

  const publicToken = generatePublicToken();

  // Créer la review request
  const { data: reviewRequest, error: requestError } = await supabase
    .from('review_requests')
    .insert({
      user_id: user.id,
      invoice_id: invoiceId,
      client_id: invoice.client_id,
      title: payload.title,
      context_text: payload.context_text || null,
      public_token: publicToken,
      status: 'sent',
      suggested_tags: suggestedTags,
    })
    .select()
    .single();

  if (requestError || !reviewRequest) {
    return { success: false, error: 'Erreur lors de la création de la demande' };
  }

  // Créer les destinataires
  if (payload.recipients.length > 0) {
    const recipients = payload.recipients.map((r) => ({
      review_request_id: reviewRequest.id,
      email: r.email,
      contact_id: r.contact_id || null,
    }));

    const { error: recipientsError } = await supabase
      .from('review_request_recipients')
      .insert(recipients);

    if (recipientsError) {
      // Rollback: supprimer la request créée
      await supabase.from('review_requests').delete().eq('id', reviewRequest.id);
      return {
        success: false,
        error: 'Erreur lors de l\'ajout des destinataires',
      };
    }
  }

  return { success: true, data: reviewRequest as ReviewRequest };
}

/**
 * Liste les demandes d'avis avec filtres optionnels
 */
export async function listReviewRequests(
  filter?: ListReviewRequestsFilter
): Promise<{ success: boolean; data?: ReviewRequest[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  let query = supabase
    .from('review_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id);
  }

  if (filter?.invoice_id) {
    query = query.eq('invoice_id', filter.invoice_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as ReviewRequest[] };
}

/**
 * Récupère une review request avec ses destinataires et review(s)
 */
export async function getReviewRequest(requestId: string): Promise<{
  success: boolean;
  data?: {
    request: ReviewRequest;
    recipients: ReviewRequestRecipient[];
    reviews: any[];
  };
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Récupérer la request
  const { data: request, error: requestError } = await supabase
    .from('review_requests')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single();

  if (requestError || !request) {
    return { success: false, error: 'Demande d\'avis introuvable' };
  }

  // Récupérer les destinataires
  const { data: recipients, error: recipientsError } = await supabase
    .from('review_request_recipients')
    .select('*')
    .eq('review_request_id', requestId)
    .order('sent_at', { ascending: true });

  if (recipientsError) {
    return { success: false, error: 'Erreur lors de la récupération des destinataires' };
  }

  // Récupérer les reviews associées
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .eq('review_request_id', requestId)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    return { success: false, error: 'Erreur lors de la récupération des avis' };
  }

  return {
    success: true,
    data: {
      request: request as ReviewRequest,
      recipients: (recipients || []) as ReviewRequestRecipient[],
      reviews: reviews || [],
    },
  };
}

/**
 * Relance une demande d'avis
 * Met à jour last_reminded_at et passe en statut 'pending' si pas responded
 */
export async function remindReviewRequest(requestId: string): Promise<{
  success: boolean;
  data?: ReviewRequest;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que la request existe et n'est pas déjà responded
  const { data: request, error: fetchError } = await supabase
    .from('review_requests')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !request) {
    return { success: false, error: 'Demande d\'avis introuvable' };
  }

  if (request.status === 'responded') {
    return {
      success: false,
      error: 'Cette demande a déjà reçu une réponse',
    };
  }

  // Mettre à jour
  const { data: updated, error: updateError } = await supabase
    .from('review_requests')
    .update({
      last_reminded_at: new Date().toISOString(),
      status: 'pending',
    })
    .eq('id', requestId)
    .select()
    .single();

  if (updateError || !updated) {
    return { success: false, error: 'Erreur lors de la relance' };
  }

  return { success: true, data: updated as ReviewRequest };
}

/**
 * Récupère une review request par son token public (pour page publique)
 */
export async function getReviewRequestByToken(token: string): Promise<{
  success: boolean;
  data?: {
    request: ReviewRequest;
    invoice: any;
    client: any;
  };
  error?: string;
}> {
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from('review_requests')
    .select(
      `
      *,
      invoice:invoices(id, numero, status),
      client:clients(id, nom, type)
    `
    )
    .eq('public_token', token)
    .single();

  if (requestError || !request) {
    return { success: false, error: 'Demande d\'avis introuvable' };
  }

  // Vérifier que la facture est toujours au statut sent
  const invoiceData = Array.isArray(request.invoice) ? request.invoice[0] : request.invoice;
  if (invoiceData?.status !== 'sent') {
    return {
      success: false,
      error: 'Cette demande n\'est plus valide (facture non envoyée)',
    };
  }

  return {
    success: true,
    data: {
      request: request as ReviewRequest,
      invoice: invoiceData,
      client: Array.isArray(request.client) ? request.client[0] : request.client,
    },
  };
}
