import { createClient } from '@/lib/supabase/server';
import type {
  AISuggestion,
  AISuggestionWithEntity,
  CreateSuggestionPayload,
  UpdateSuggestionPayload,
  ListSuggestionsFilter,
  SuggestionStatus,
} from './types';

/**
 * Crée une nouvelle suggestion IA
 */
export async function createSuggestion(
  payload: CreateSuggestionPayload
): Promise<{ success: boolean; data?: AISuggestion; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: suggestion, error } = await supabase
      .from('ai_suggestions')
      .insert({
        user_id: user.id,
        suggestion_type: payload.suggestion_type,
        priority: payload.priority,
        title: payload.title,
        description: payload.description,
        entity_type: payload.entity_type || null,
        entity_id: payload.entity_id || null,
        suggested_action: payload.suggested_action || null,
        context: payload.context || null,
      })
      .select()
      .single();

    if (error || !suggestion) {
      console.error('createSuggestion error:', error);
      return { success: false, error: 'Erreur lors de la création de la suggestion' };
    }

    return { success: true, data: suggestion as AISuggestion };
  } catch (error) {
    console.error('createSuggestion error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Liste les suggestions IA avec filtres
 */
export async function listSuggestions(
  filter?: ListSuggestionsFilter
): Promise<{ success: boolean; data?: AISuggestionWithEntity[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.suggestion_type) {
      query = query.eq('suggestion_type', filter.suggestion_type);
    }

    if (filter?.priority) {
      query = query.eq('priority', filter.priority);
    }

    if (filter?.entity_type) {
      query = query.eq('entity_type', filter.entity_type);
    }

    if (filter?.entity_id) {
      query = query.eq('entity_id', filter.entity_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listSuggestions error:', error);
      return { success: false, error: 'Erreur lors de la récupération des suggestions' };
    }

    // Enrichir avec les titres des entités
    const suggestions = data as AISuggestionWithEntity[];
    for (const suggestion of suggestions) {
      if (suggestion.entity_type && suggestion.entity_id) {
        const entityTitle = await getEntityTitle(
          supabase,
          suggestion.entity_type,
          suggestion.entity_id
        );
        suggestion.entity_title = entityTitle;
      }
    }

    return { success: true, data: suggestions };
  } catch (error) {
    console.error('listSuggestions error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Récupère une suggestion par ID
 */
export async function getSuggestion(
  suggestionId: string
): Promise<{ success: boolean; data?: AISuggestionWithEntity; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: suggestion, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .single();

    if (error || !suggestion) {
      return { success: false, error: 'Suggestion introuvable' };
    }

    const result = suggestion as AISuggestionWithEntity;

    // Enrichir avec le titre de l'entité
    if (result.entity_type && result.entity_id) {
      const entityTitle = await getEntityTitle(supabase, result.entity_type, result.entity_id);
      result.entity_title = entityTitle;
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('getSuggestion error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Met à jour une suggestion (changement de statut)
 */
export async function updateSuggestion(
  suggestionId: string,
  payload: UpdateSuggestionPayload
): Promise<{ success: boolean; data?: AISuggestion; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const updateData: any = {};

    if (payload.status) {
      updateData.status = payload.status;

      // Mettre à jour les timestamps selon le statut
      if (payload.status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (payload.status === 'dismissed') {
        updateData.dismissed_at = new Date().toISOString();
      } else if (payload.status === 'executed') {
        updateData.executed_at = new Date().toISOString();
      }
    }

    const { data: suggestion, error } = await supabase
      .from('ai_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !suggestion) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    return { success: true, data: suggestion as AISuggestion };
  } catch (error) {
    console.error('updateSuggestion error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Accepte une suggestion
 */
export async function acceptSuggestion(
  suggestionId: string
): Promise<{ success: boolean; data?: AISuggestion; error?: string }> {
  return updateSuggestion(suggestionId, { status: 'accepted' });
}

/**
 * Rejette une suggestion
 */
export async function dismissSuggestion(
  suggestionId: string
): Promise<{ success: boolean; data?: AISuggestion; error?: string }> {
  return updateSuggestion(suggestionId, { status: 'dismissed' });
}

/**
 * Marque une suggestion comme exécutée
 */
export async function markSuggestionExecuted(
  suggestionId: string
): Promise<{ success: boolean; data?: AISuggestion; error?: string }> {
  return updateSuggestion(suggestionId, { status: 'executed' });
}

/**
 * Compte les suggestions actives par priorité
 */
export async function getSuggestionsStats(): Promise<{
  success: boolean;
  data?: {
    total: number;
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: suggestions, error } = await supabase
      .from('ai_suggestions')
      .select('priority')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('getSuggestionsStats error:', error);
      return { success: false, error: 'Erreur lors du calcul des stats' };
    }

    const stats = {
      total: suggestions?.length || 0,
      urgent: suggestions?.filter((s) => s.priority === 'urgent').length || 0,
      high: suggestions?.filter((s) => s.priority === 'high').length || 0,
      medium: suggestions?.filter((s) => s.priority === 'medium').length || 0,
      low: suggestions?.filter((s) => s.priority === 'low').length || 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('getSuggestionsStats error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Déclenche la détection de nouvelles suggestions
 * (appelle les fonctions PostgreSQL de détection)
 */
export async function detectNewSuggestions(): Promise<{
  success: boolean;
  data?: { detected: number };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Appeler les fonctions de détection
    await supabase.rpc('detect_invoice_suggestions');
    await supabase.rpc('detect_invoice_reminder_suggestions');
    await supabase.rpc('detect_urgent_deal_suggestions');
    await supabase.rpc('detect_review_request_suggestions');

    return { success: true, data: { detected: 0 } }; // TODO: compter réellement
  } catch (error) {
    console.error('detectNewSuggestions error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

// Helper interne pour récupérer le titre d'une entité
async function getEntityTitle(
  supabase: any,
  entityType: string,
  entityId: string
): Promise<string | undefined> {
  try {
    switch (entityType) {
      case 'deal': {
        const { data } = await supabase.from('deals').select('title').eq('id', entityId).single();
        return data?.title;
      }
      case 'mission': {
        const { data } = await supabase
          .from('missions')
          .select('title')
          .eq('id', entityId)
          .single();
        return data?.title;
      }
      case 'invoice': {
        const { data } = await supabase
          .from('invoices')
          .select('numero')
          .eq('id', entityId)
          .single();
        return data?.numero;
      }
      case 'client': {
        const { data } = await supabase.from('clients').select('nom').eq('id', entityId).single();
        return data?.nom;
      }
      default:
        return undefined;
    }
  } catch (error) {
    console.error('getEntityTitle error:', error);
    return undefined;
  }
}
