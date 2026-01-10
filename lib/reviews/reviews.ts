import { createClient } from '@/lib/supabase/server';
import type { Review, CreateReviewPayload, ReliabilityLevel } from './types';

/**
 * Calcule le score de fiabilité d'une review (0-100)
 * Règles v1 simplifiées:
 * - Base: 40 points si confirm_collaboration = true
 * - Identité: +20 si consent_display_identity = true
 * - Ratings: +40 si au moins 3 ratings renseignés
 * - Commentaire long: +10 si > 100 caractères
 */
function calculateReliabilityScore(review: CreateReviewPayload): number {
  let score = 0;

  // Confirmation de collaboration (obligatoire mais on compte quand même)
  if (review.confirm_collaboration) {
    score += 40;
  }

  // Consentement affichage identité
  if (review.consent_display_identity) {
    score += 20;
  }

  // Nombre de ratings renseignés
  const ratingsCount = [
    review.rating_responsiveness,
    review.rating_quality,
    review.rating_requirements,
    review.rating_communication,
    review.rating_recommendation,
  ].filter((r) => r !== undefined && r !== null).length;

  if (ratingsCount >= 3) {
    score += 40;
  }

  // Longueur du commentaire
  if (review.comment.length > 100) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Détermine le niveau de fiabilité basé sur le score
 */
function getReliabilityLevel(score: number): ReliabilityLevel {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Calcule le rating overall moyen si non fourni
 */
function calculateOverallRating(review: CreateReviewPayload): number | null {
  if (review.rating_overall !== undefined && review.rating_overall !== null) {
    return review.rating_overall;
  }

  const ratings = [
    review.rating_responsiveness,
    review.rating_quality,
    review.rating_requirements,
    review.rating_communication,
    review.rating_recommendation,
  ].filter((r) => r !== undefined && r !== null) as number[];

  if (ratings.length === 0) return null;

  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round(sum / ratings.length);
}

/**
 * Crée une review à partir d'un token public
 * RÈGLES MÉTIER:
 * - Token doit être valide
 * - Invoice doit être 'sent'
 * - confirm_collaboration DOIT être true
 * - 1 seule review par email par request
 */
export async function createReviewFromPublicToken(
  token: string,
  payload: CreateReviewPayload
): Promise<{ success: boolean; data?: Review; error?: string }> {
  const supabase = await createClient();

  // Vérifier que confirm_collaboration est true
  if (!payload.confirm_collaboration) {
    return {
      success: false,
      error: 'Vous devez confirmer avoir collaboré avec ce prestataire',
    };
  }

  // Récupérer la review request via le token
  const { data: request, error: requestError } = await supabase
    .from('review_requests')
    .select(
      `
      *,
      invoice:invoices(id, status)
    `
    )
    .eq('public_token', token)
    .single();

  if (requestError || !request) {
    return { success: false, error: 'Lien invalide ou expiré' };
  }

  // Vérifier que la facture est toujours au statut 'sent'
  const invoiceData = Array.isArray(request.invoice) ? request.invoice[0] : request.invoice;
  if (!invoiceData || invoiceData.status !== 'sent') {
    return {
      success: false,
      error: 'Cette demande n\'est plus valide',
    };
  }

  // Vérifier qu'il n'y a pas déjà une review de cet email pour cette request
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('review_request_id', request.id)
    .eq('reviewer_email', payload.reviewer_email)
    .maybeSingle();

  if (existingReview) {
    return {
      success: false,
      error: 'Vous avez déjà soumis un avis pour cette demande',
    };
  }

  // Calculer le score de fiabilité
  const reliabilityScore = calculateReliabilityScore(payload);
  const reliabilityLevel = getReliabilityLevel(reliabilityScore);
  const overallRating = calculateOverallRating(payload);

  // Créer la review
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      user_id: request.user_id,
      review_request_id: request.id,
      invoice_id: request.invoice_id,
      client_id: request.client_id,
      reviewer_name: payload.reviewer_name || null,
      reviewer_role: payload.reviewer_role || null,
      reviewer_email: payload.reviewer_email,
      reviewer_company: payload.reviewer_company || null,
      confirm_collaboration: payload.confirm_collaboration,
      consent_display_identity: payload.consent_display_identity,
      rating_overall: overallRating,
      rating_responsiveness: payload.rating_responsiveness || null,
      rating_quality: payload.rating_quality || null,
      rating_requirements: payload.rating_requirements || null,
      rating_communication: payload.rating_communication || null,
      rating_recommendation: payload.rating_recommendation || null,
      comment: payload.comment,
      reliability_score: reliabilityScore,
      reliability_level: reliabilityLevel,
      is_published: false,
    })
    .select()
    .single();

  if (reviewError || !review) {
    return { success: false, error: 'Erreur lors de la création de l\'avis' };
  }

  // Mettre à jour le statut de la request à 'responded'
  await supabase
    .from('review_requests')
    .update({ status: 'responded' })
    .eq('id', request.id);

  // Mettre à jour le recipient correspondant
  await supabase
    .from('review_request_recipients')
    .update({
      status: 'responded',
      responded_at: new Date().toISOString(),
    })
    .eq('review_request_id', request.id)
    .eq('email', payload.reviewer_email);

  return { success: true, data: review as Review };
}

/**
 * Publie ou dépublie une review
 */
export async function publishReview(
  reviewId: string,
  isPublished: boolean
): Promise<{ success: boolean; data?: Review; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .update({ is_published: isPublished })
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !review) {
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  return { success: true, data: review as Review };
}

/**
 * Liste les reviews publiées de l'utilisateur
 */
export async function listPublishedReviews(filter?: {
  client_id?: string;
  min_reliability?: ReliabilityLevel;
}): Promise<{ success: boolean; data?: Review[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  let query = supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id);
  }

  if (filter?.min_reliability) {
    const levels: ReliabilityLevel[] = ['low', 'medium', 'high'];
    const minIndex = levels.indexOf(filter.min_reliability);
    const allowedLevels = levels.slice(minIndex);
    query = query.in('reliability_level', allowedLevels);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Review[] };
}

/**
 * Liste toutes les reviews de l'utilisateur (publiées ou non)
 */
export async function listAllReviews(filter?: {
  is_published?: boolean;
  client_id?: string;
}): Promise<{ success: boolean; data?: Review[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  let query = supabase
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (filter?.is_published !== undefined) {
    query = query.eq('is_published', filter.is_published);
  }

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Review[] };
}

/**
 * Récupère une review par son ID
 */
export async function getReview(reviewId: string): Promise<{
  success: boolean;
  data?: Review;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return { success: false, error: 'Avis introuvable' };
  }

  return { success: true, data: data as Review };
}
