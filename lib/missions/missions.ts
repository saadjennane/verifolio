import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import type {
  Mission,
  MissionListItem,
  MissionWithRelations,
  CreateMissionPayload,
  UpdateMissionPayload,
  ListMissionsFilter,
  MissionStatus,
} from './types';

/**
 * Créer une nouvelle mission (appelé automatiquement quand Deal → WON ou manuellement)
 */
export async function createMission(
  payload: CreateMissionPayload
): Promise<{ success: true; data: Mission } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier qu'il n'existe pas déjà une mission pour ce deal (uniquement si deal_id fourni)
    if (payload.deal_id) {
      const { data: existingMission } = await supabase
        .from('missions')
        .select('id')
        .eq('deal_id', payload.deal_id)
        .maybeSingle();

      if (existingMission) {
        return { success: false, error: 'Une mission existe déjà pour ce deal' };
      }
    }

    // Créer la mission
    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        user_id: user.id,
        deal_id: payload.deal_id || null,
        client_id: payload.client_id,
        title: payload.title,
        description: payload.description || null,
        estimated_amount: payload.estimated_amount || null,
        visible_on_verifolio: payload.visible_on_verifolio ?? true,
        status: 'in_progress',
        started_at: payload.started_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !mission) {
      console.error('Error creating mission:', error);
      console.error('Mission payload:', {
        user_id: user.id,
        deal_id: payload.deal_id,
        client_id: payload.client_id,
        title: payload.title,
        estimated_amount: payload.estimated_amount,
      });
      return { success: false, error: error?.message || 'Erreur lors de la création de la mission' };
    }

    // Lier les contacts si fournis
    if (payload.contacts && payload.contacts.length > 0) {
      const contactsToInsert = payload.contacts.map((contactId, index) => ({
        mission_id: mission.id,
        contact_id: contactId,
        is_primary: index === 0,
      }));

      const { error: contactsError } = await supabase
        .from('mission_contacts')
        .insert(contactsToInsert);

      if (contactsError) {
        console.error('Error linking contacts:', contactsError);
      }
    }

    // Copier les tags du deal vers la mission (uniquement si deal_id fourni)
    if (payload.deal_id) {
      const { data: dealTags } = await supabase
        .from('deal_tags')
        .select('tag, color')
        .eq('deal_id', payload.deal_id);

      if (dealTags && dealTags.length > 0) {
        const tagsToInsert = dealTags.map((dt) => ({
          mission_id: mission.id,
          tag: dt.tag,
          color: dt.color,
        }));

        const { error: tagsError } = await supabase
          .from('mission_tags')
          .insert(tagsToInsert);

        if (tagsError) {
          console.error('Error copying tags from deal to mission:', tagsError);
        }
      }
    }

    // Log activity
    await logActivity({
      action: 'create',
      entity_type: 'mission',
      entity_id: mission.id,
      entity_title: mission.title,
    });

    return { success: true, data: mission };
  } catch (error) {
    console.error('createMission error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Lister les missions avec filtres
 */
export async function listMissions(
  filter?: ListMissionsFilter
): Promise<{ success: true; data: MissionListItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('missions')
      .select(`
        *,
        client:clients(id, nom),
        deal:deals!missions_deal_id_fkey(id, title),
        tags:mission_tags(*),
        badges:mission_badges(*)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.client_id) {
      query = query.eq('client_id', filter.client_id);
    }

    if (filter?.visible_on_verifolio !== undefined) {
      query = query.eq('visible_on_verifolio', filter.visible_on_verifolio);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listMissions error:', error);
      return { success: false, error: 'Erreur lors de la récupération des missions' };
    }

    return { success: true, data: data as MissionListItem[] };
  } catch (error) {
    console.error('listMissions error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Récupérer une mission par ID avec toutes les relations
 */
export async function getMission(
  missionId: string
): Promise<{ success: true; data: MissionWithRelations } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: mission, error } = await supabase
      .from('missions')
      .select(`
        *,
        client:clients(id, nom),
        deal:deals!missions_deal_id_fkey(id, title),
        contacts:mission_contacts(*, contact:contacts(id, nom)),
        invoices:mission_invoices(*, invoice:invoices(id, numero, status, total_ttc, notes, deleted_at)),
        tags:mission_tags(*),
        badges:mission_badges(*)
      `)
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (error || !mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    return { success: true, data: mission as MissionWithRelations };
  } catch (error) {
    console.error('getMission error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Mettre à jour une mission
 */
export async function updateMission(
  missionId: string,
  payload: UpdateMissionPayload
): Promise<{ success: true; data: Mission } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: mission, error } = await supabase
      .from('missions')
      .update(payload)
      .eq('id', missionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !mission) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    // Log activity
    await logActivity({
      action: 'update',
      entity_type: 'mission',
      entity_id: mission.id,
      entity_title: mission.title,
    });

    return { success: true, data: mission };
  } catch (error) {
    console.error('updateMission error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Changer le statut d'une mission avec validation
 */
export async function updateMissionStatus(
  missionId: string,
  newStatus: MissionStatus
): Promise<{ success: true; data: Mission } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer la mission actuelle
    const { data: currentMission, error: fetchError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentMission) {
      return { success: false, error: 'Mission introuvable' };
    }

    // Validations de transition
    if (newStatus === 'delivered' && currentMission.status !== 'in_progress') {
      return {
        success: false,
        error: 'Une mission ne peut être livrée que depuis le statut IN_PROGRESS',
      };
    }

    if (newStatus === 'cancelled' && !['in_progress', 'delivered', 'to_invoice'].includes(currentMission.status)) {
      return {
        success: false,
        error: 'Une mission ne peut être annulée qu\'avant facturation',
      };
    }

    // Mettre à jour le statut
    const { data: mission, error } = await supabase
      .from('missions')
      .update({ status: newStatus })
      .eq('id', missionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !mission) {
      return { success: false, error: 'Erreur lors du changement de statut' };
    }

    return { success: true, data: mission };
  } catch (error) {
    console.error('updateMissionStatus error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Supprimer une mission
 */
export async function deleteMission(
  missionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer la mission pour le titre avant suppression
    const { data: mission } = await supabase
      .from('missions')
      .select('title')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    // Soft delete - set deleted_at instead of actual delete
    const { error } = await supabase
      .from('missions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', missionId)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    // Log activity
    if (mission) {
      await logActivity({
        action: 'delete',
        entity_type: 'mission',
        entity_id: missionId,
        entity_title: mission.title,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('deleteMission error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Lier une facture à une mission
 */
export async function linkInvoiceToMission(
  missionId: string,
  invoiceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    const { error } = await supabase
      .from('mission_invoices')
      .insert({
        mission_id: missionId,
        invoice_id: invoiceId,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Cette facture est déjà liée à cette mission' };
      }
      return { success: false, error: 'Erreur lors du lien de la facture' };
    }

    return { success: true };
  } catch (error) {
    console.error('linkInvoiceToMission error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Délier une facture d'une mission
 */
export async function unlinkInvoiceFromMission(
  missionId: string,
  invoiceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (!mission) {
      return { success: false, error: 'Mission introuvable' };
    }

    const { error } = await supabase
      .from('mission_invoices')
      .delete()
      .eq('mission_id', missionId)
      .eq('invoice_id', invoiceId);

    if (error) {
      return { success: false, error: 'Erreur lors du délien de la facture' };
    }

    return { success: true };
  } catch (error) {
    console.error('unlinkInvoiceFromMission error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
