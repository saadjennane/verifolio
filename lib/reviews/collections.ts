import { createClient } from '@/lib/supabase/server';
import type {
  ReviewCollection,
  ReviewCollectionItem,
  CreateCollectionPayload,
  Review,
} from './types';

/**
 * Génère un token public unique pour une collection
 */
function generateCollectionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Crée une collection de témoignages
 */
export async function createReviewCollection(
  payload: CreateCollectionPayload
): Promise<{ success: boolean; data?: ReviewCollection; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const publicToken = generateCollectionToken();

  const { data: collection, error } = await supabase
    .from('review_collections')
    .insert({
      user_id: user.id,
      name: payload.name,
      description: payload.description || null,
      public_token: publicToken,
    })
    .select()
    .single();

  if (error || !collection) {
    return { success: false, error: 'Erreur lors de la création de la collection' };
  }

  return { success: true, data: collection as ReviewCollection };
}

/**
 * Liste les collections de l'utilisateur
 */
export async function listReviewCollections(): Promise<{
  success: boolean;
  data?: ReviewCollection[];
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
    .from('review_collections')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as ReviewCollection[] };
}

/**
 * Récupère une collection par son ID
 */
export async function getReviewCollection(collectionId: string): Promise<{
  success: boolean;
  data?: { collection: ReviewCollection; items: Review[] };
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Récupérer la collection
  const { data: collection, error: collectionError } = await supabase
    .from('review_collections')
    .select('*')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (collectionError || !collection) {
    return { success: false, error: 'Collection introuvable' };
  }

  // Récupérer les items avec les reviews
  const { data: items, error: itemsError } = await supabase
    .from('review_collection_items')
    .select(
      `
      *,
      review:reviews(*)
    `
    )
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    return { success: false, error: 'Erreur lors de la récupération des items' };
  }

  const reviews = (items || [])
    .map((item) => {
      const reviewData = Array.isArray(item.review) ? item.review[0] : item.review;
      return reviewData as Review;
    })
    .filter(Boolean);

  return {
    success: true,
    data: {
      collection: collection as ReviewCollection,
      items: reviews,
    },
  };
}

/**
 * Ajoute une review à une collection
 */
export async function addReviewToCollection(
  collectionId: string,
  reviewId: string,
  sortOrder?: number
): Promise<{ success: boolean; data?: ReviewCollectionItem; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que la collection appartient à l'utilisateur
  const { data: collection, error: collectionError } = await supabase
    .from('review_collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (collectionError || !collection) {
    return { success: false, error: 'Collection introuvable' };
  }

  // Vérifier que la review appartient à l'utilisateur et est publiée
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('id, is_published')
    .eq('id', reviewId)
    .eq('user_id', user.id)
    .single();

  if (reviewError || !review) {
    return { success: false, error: 'Avis introuvable' };
  }

  if (!review.is_published) {
    return {
      success: false,
      error: 'Seuls les avis publiés peuvent être ajoutés à une collection',
    };
  }

  // Si pas de sort_order fourni, prendre le max + 1
  let finalSortOrder = sortOrder ?? 0;
  if (sortOrder === undefined) {
    const { data: maxItem } = await supabase
      .from('review_collection_items')
      .select('sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxItem) {
      finalSortOrder = (maxItem.sort_order || 0) + 1;
    }
  }

  // Ajouter l'item
  const { data: item, error: itemError } = await supabase
    .from('review_collection_items')
    .insert({
      collection_id: collectionId,
      review_id: reviewId,
      sort_order: finalSortOrder,
    })
    .select()
    .single();

  if (itemError || !item) {
    return { success: false, error: 'Erreur lors de l\'ajout à la collection' };
  }

  return { success: true, data: item as ReviewCollectionItem };
}

/**
 * Retire une review d'une collection
 */
export async function removeReviewFromCollection(
  collectionId: string,
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que la collection appartient à l'utilisateur
  const { data: collection, error: collectionError } = await supabase
    .from('review_collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (collectionError || !collection) {
    return { success: false, error: 'Collection introuvable' };
  }

  // Supprimer l'item
  const { error } = await supabase
    .from('review_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('review_id', reviewId);

  if (error) {
    return { success: false, error: 'Erreur lors de la suppression' };
  }

  return { success: true };
}

/**
 * Réordonne les items d'une collection
 */
export async function reorderCollectionItems(
  collectionId: string,
  orderedReviewIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que la collection appartient à l'utilisateur
  const { data: collection, error: collectionError } = await supabase
    .from('review_collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .single();

  if (collectionError || !collection) {
    return { success: false, error: 'Collection introuvable' };
  }

  // Mettre à jour l'ordre de chaque item
  const updates = orderedReviewIds.map((reviewId, index) =>
    supabase
      .from('review_collection_items')
      .update({ sort_order: index })
      .eq('collection_id', collectionId)
      .eq('review_id', reviewId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    return { success: false, error: 'Erreur lors du réordonnancement' };
  }

  return { success: true };
}

/**
 * Récupère une collection par son token public (pour page publique)
 */
export async function getCollectionByToken(token: string): Promise<{
  success: boolean;
  data?: { collection: ReviewCollection; reviews: Review[] };
  error?: string;
}> {
  const supabase = await createClient();

  // Récupérer la collection
  const { data: collection, error: collectionError } = await supabase
    .from('review_collections')
    .select('*')
    .eq('public_token', token)
    .single();

  if (collectionError || !collection) {
    return { success: false, error: 'Collection introuvable' };
  }

  // Récupérer les items avec reviews PUBLIÉES uniquement
  const { data: items, error: itemsError } = await supabase
    .from('review_collection_items')
    .select(
      `
      *,
      review:reviews!inner(*)
    `
    )
    .eq('collection_id', collection.id)
    .eq('review.is_published', true)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    return { success: false, error: 'Erreur lors de la récupération des items' };
  }

  const reviews = (items || [])
    .map((item) => {
      const reviewData = Array.isArray(item.review) ? item.review[0] : item.review;
      return reviewData as Review;
    })
    .filter(Boolean);

  return {
    success: true,
    data: {
      collection: collection as ReviewCollection,
      reviews,
    },
  };
}

/**
 * Met à jour une collection
 */
export async function updateReviewCollection(
  collectionId: string,
  patch: { name?: string; description?: string }
): Promise<{ success: boolean; data?: ReviewCollection; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('review_collections')
    .update(patch)
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  return { success: true, data: data as ReviewCollection };
}

/**
 * Supprime une collection
 */
export async function deleteReviewCollection(collectionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { error } = await supabase
    .from('review_collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erreur lors de la suppression' };
  }

  return { success: true };
}
