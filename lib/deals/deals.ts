import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { logActivity } from '@/lib/activity';
import type {
  Deal,
  DealWithRelations,
  CreateDealPayload,
  UpdateDealPayload,
  ListDealsFilter,
  DealStatus,
} from './types';

/**
 * Crée un nouveau deal
 */
export async function createDeal(
  payload: CreateDealPayload
): Promise<{ success: boolean; data?: Deal; error?: string }> {
  const supabase = await createClient();

  const userId = await getUserId(supabase);
  if (!userId) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que le client existe
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', payload.client_id)
    .eq('user_id', userId)
    .single();

  if (clientError || !client) {
    return { success: false, error: 'Client introuvable' };
  }

  // Créer le deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert({
      user_id: userId,
      client_id: payload.client_id,
      title: payload.title,
      description: payload.description || null,
      estimated_amount: payload.estimated_amount || null,
      currency: payload.currency || 'EUR',
      received_at: payload.received_at || new Date().toISOString(),
      status: 'new',
    })
    .select()
    .single();

  if (dealError || !deal) {
    return { success: false, error: 'Erreur lors de la création du deal' };
  }

  // Auto-lier tous les contacts du client au deal
  // Récupérer les contacts du client avec leurs propriétés
  const { data: clientContacts } = await supabase
    .from('client_contacts')
    .select('contact_id, is_primary')
    .eq('client_id', payload.client_id);

  if (clientContacts && clientContacts.length > 0) {
    // Utiliser les contacts explicites si fournis, sinon tous les contacts du client
    const contactIdsToLink = payload.contacts && payload.contacts.length > 0
      ? payload.contacts
      : clientContacts.map(cc => cc.contact_id);

    // Trouver le contact principal du client
    const primaryContact = clientContacts.find(cc => cc.is_primary);

    const contacts = contactIdsToLink.map((contact_id, index) => ({
      deal_id: deal.id,
      contact_id,
      // Le premier contact est primary, ou le contact marqué primary chez le client
      is_primary: primaryContact
        ? contact_id === primaryContact.contact_id
        : index === 0,
    }));

    const { error: contactsError } = await supabase
      .from('deal_contacts')
      .insert(contacts);

    if (contactsError) {
      console.error('Error adding contacts:', contactsError);
    }
  } else if (payload.contacts && payload.contacts.length > 0) {
    // Si pas de contacts client mais des contacts fournis explicitement
    const contacts = payload.contacts.map((contact_id, index) => ({
      deal_id: deal.id,
      contact_id,
      is_primary: index === 0,
    }));

    const { error: contactsError } = await supabase
      .from('deal_contacts')
      .insert(contacts);

    if (contactsError) {
      console.error('Error adding contacts:', contactsError);
    }
  }

  // Ajouter les tags si fournis
  if (payload.tags && payload.tags.length > 0) {
    const tags = payload.tags.map((tag) => ({
      deal_id: deal.id,
      tag,
    }));

    const { error: tagsError } = await supabase.from('deal_tags').insert(tags);

    if (tagsError) {
      console.error('Error adding tags:', tagsError);
    }
  }

  // Ajouter les badges si fournis
  if (payload.badges && payload.badges.length > 0) {
    const badges = payload.badges.map((badge) => ({
      deal_id: deal.id,
      badge,
    }));

    const { error: badgesError } = await supabase.from('deal_badges').insert(badges);

    if (badgesError) {
      console.error('Error adding badges:', badgesError);
    }
  }

  // Log activity
  await logActivity({
    action: 'create',
    entity_type: 'deal',
    entity_id: deal.id,
    entity_title: deal.title,
  });

  return { success: true, data: deal as Deal };
}

/**
 * Liste les deals avec filtres optionnels
 */
export async function listDeals(
  filter?: ListDealsFilter
): Promise<{ success: boolean; data?: Deal[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  let query = supabase
    .from('deals')
    .select('*, client:clients(id, nom, type)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }

  if (filter?.client_id) {
    query = query.eq('client_id', filter.client_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Deal[] };
}

/**
 * Récupère un deal par son ID avec toutes ses relations
 */
export async function getDeal(dealId: string): Promise<{
  success: boolean;
  data?: DealWithRelations;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Récupérer le deal avec le client
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*, client:clients(id, nom)')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (dealError || !deal) {
    return { success: false, error: 'Deal introuvable' };
  }

  // Récupérer les contacts
  const { data: contacts } = await supabase
    .from('deal_contacts')
    .select('*, contact:contacts(*)')
    .eq('deal_id', dealId);

  // Récupérer les devis liés à ce deal (directement via deal_id dans quotes)
  const { data: quotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('deal_id', dealId)
    .is('deleted_at', null);

  // Récupérer les propositions liées à ce deal
  const { data: proposals } = await supabase
    .from('proposals')
    .select('*')
    .eq('deal_id', dealId)
    .is('deleted_at', null);

  // Construire la liste des documents au format attendu
  const documents = [
    ...(quotes || []).map(q => ({
      id: q.id,
      deal_id: dealId,
      document_type: 'quote' as const,
      quote_id: q.id,
      proposal_id: null,
      quote: q,
      proposal: null,
      created_at: q.created_at,
    })),
    ...(proposals || []).map(p => ({
      id: p.id,
      deal_id: dealId,
      document_type: 'proposal' as const,
      quote_id: null,
      proposal_id: p.id,
      quote: null,
      proposal: p,
      created_at: p.created_at,
    })),
  ];

  // Récupérer les tags
  const { data: tags } = await supabase
    .from('deal_tags')
    .select('*')
    .eq('deal_id', dealId);

  // Récupérer les badges
  const { data: badges } = await supabase
    .from('deal_badges')
    .select('*')
    .eq('deal_id', dealId);

  // Récupérer la mission liée (si elle existe)
  let mission = null;
  if (deal.mission_id) {
    const { data: missionData } = await supabase
      .from('missions')
      .select('id, title, status')
      .eq('id', deal.mission_id)
      .single();
    mission = missionData;
  }

  // Fusionner tout dans un seul objet DealWithRelations
  const dealWithRelations: DealWithRelations = {
    ...(deal as Deal),
    client: deal.client || null,
    contacts: contacts || [],
    documents: documents || [],
    tags: tags || [],
    badges: badges || [],
    mission: mission || null,
  };

  return {
    success: true,
    data: dealWithRelations,
  };
}

/**
 * Met à jour un deal
 */
export async function updateDeal(
  dealId: string,
  payload: UpdateDealPayload
): Promise<{ success: boolean; data?: Deal; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('deals')
    .update(payload)
    .eq('id', dealId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }

  // Log activity
  await logActivity({
    action: 'update',
    entity_type: 'deal',
    entity_id: data.id,
    entity_title: data.title,
  });

  return { success: true, data: data as Deal };
}

/**
 * Change le statut d'un deal
 * Règle: Si modification après envoi (SENT), retour automatique en DRAFT
 * Règle: Si WON, création automatique d'une Mission
 */
export async function updateDealStatus(
  dealId: string,
  newStatus: DealStatus
): Promise<{ success: boolean; data?: Deal; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Récupérer le deal actuel
  const { data: currentDeal, error: fetchError } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !currentDeal) {
    return { success: false, error: 'Deal introuvable' };
  }

  // Note: Toutes les transitions de statut sont permises
  // La vérification des documents est gérée côté client avec un warning
  // La création de mission est gérée côté client avec confirmation

  // Sinon, mise à jour normale du statut
  const { data, error } = await supabase
    .from('deals')
    .update({ status: newStatus })
    .eq('id', dealId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'Erreur lors du changement de statut' };
  }

  return { success: true, data: data as Deal };
}

/**
 * Retour en DRAFT depuis SENT (modification demandée)
 * Ajoute automatiquement le badge REVIEW
 */
export async function backToDraft(dealId: string): Promise<{
  success: boolean;
  data?: Deal;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }

  // Vérifier que le deal est en SENT
  const { data: currentDeal } = await supabase
    .from('deals')
    .select('status')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  if (!currentDeal) {
    return { success: false, error: 'Deal introuvable' };
  }

  // Passer en DRAFT
  const result = await updateDealStatus(dealId, 'draft');

  if (!result.success) {
    return result;
  }

  // Ajouter le badge REVIEW (automatique)
  if (currentDeal.status === 'sent') {
    const { addReviewBadgeToDeal } = await import('@/lib/badges');
    await addReviewBadgeToDeal(dealId);
  }

  return result;
}

/**
 * Supprime un deal (soft delete - va dans la corbeille)
 */
export async function deleteDeal(dealId: string): Promise<{
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

  // Récupérer le deal pour le titre avant suppression
  const { data: deal } = await supabase
    .from('deals')
    .select('title')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single();

  // Soft delete - set deleted_at instead of actual delete
  const { error } = await supabase
    .from('deals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dealId)
    .eq('user_id', user.id)
    .is('deleted_at', null); // Only delete if not already deleted

  if (error) {
    return { success: false, error: 'Erreur lors de la suppression' };
  }

  // Log activity
  if (deal) {
    await logActivity({
      action: 'delete',
      entity_type: 'deal',
      entity_id: dealId,
      entity_title: deal.title,
    });
  }

  return { success: true };
}
