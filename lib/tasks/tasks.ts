import { createClient } from '@/lib/supabase/server';
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  ListTasksFilter,
  TaskStatus,
  MissionSupplier,
  CreateMissionSupplierPayload,
} from './types';

/**
 * Créer une tâche manuelle
 */
export async function createTask(
  payload: CreateTaskPayload
): Promise<{ success: true; data: Task } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Validation: wait_reason ne peut être défini que si status = 'en_attente'
    // Par défaut, une nouvelle task est 'open', donc on ignore wait_reason à la création
    // sauf si explicitement défini comme 'en_attente'
    const insertData: any = {
      user_id: user.id,
      title: payload.title,
      description: payload.description,
      due_date: payload.due_date,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      is_system: false, // Les tasks manuelles ne sont jamais système
      owner_scope: payload.owner_scope || 'me',
      owner_entity_id: payload.owner_entity_id || null,
    };

    // Si wait_reason est fourni mais qu'on ne crée pas en statut en_attente, on l'ignore
    if (payload.wait_reason) {
      insertData.wait_reason = payload.wait_reason;
    }

    // Validation: owner_entity_id requis si owner_scope != 'me'
    if (insertData.owner_scope !== 'me' && !insertData.owner_entity_id) {
      return { success: false, error: 'owner_entity_id requis pour client/supplier' };
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (error || !task) {
      console.error('Error creating task:', error);
      return { success: false, error: 'Erreur lors de la création de la tâche' };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('createTask error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Lister les tâches avec filtres
 */
export async function listTasks(
  filter?: ListTasksFilter
): Promise<{ success: true; data: Task[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    let query = supabase
      .from('tasks')
      .select(`
        *,
        badges:task_badges(*)
      `)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    if (filter?.entity_type) {
      query = query.eq('entity_type', filter.entity_type);
    }

    if (filter?.entity_id) {
      query = query.eq('entity_id', filter.entity_id);
    }

    if (filter?.is_system !== undefined) {
      query = query.eq('is_system', filter.is_system);
    }

    if (filter?.owner_scope) {
      query = query.eq('owner_scope', filter.owner_scope);
    }

    if (filter?.owner_entity_id) {
      query = query.eq('owner_entity_id', filter.owner_entity_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listTasks error:', error);
      return { success: false, error: 'Erreur lors de la récupération des tâches' };
    }

    let tasks = data as Task[];

    // Filtrer les tâches en retard si demandé
    if (filter?.overdue) {
      const today = new Date().toISOString().split('T')[0];
      tasks = tasks.filter((t) => t.due_date && t.due_date < today && t.status === 'open');
    }

    // Enrichir avec les relations hiérarchiques
    tasks = await enrichTasksWithRelations(tasks);

    return { success: true, data: tasks };
  } catch (error) {
    console.error('listTasks error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Récupérer une tâche par ID
 */
export async function getTask(
  taskId: string
): Promise<{ success: true; data: Task } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (error || !task) {
      return { success: false, error: 'Tâche introuvable' };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('getTask error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Mettre à jour une tâche
 */
export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload
): Promise<{ success: true; data: Task } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Validation: wait_reason ne peut être mis à jour que si status = 'en_attente'
    // Si status change vers autre chose que 'en_attente', on conserve wait_reason en base (historique)
    // mais on ne permet pas de le modifier
    const updateData: any = { ...payload };

    // Si on update wait_reason mais que status n'est pas en_attente, on vérifie
    if (payload.wait_reason !== undefined && payload.status && payload.status !== 'en_attente') {
      // On ignore wait_reason si on change le statut vers autre chose
      delete updateData.wait_reason;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !task) {
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error('updateTask error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Marquer une tâche comme terminée
 */
export async function completeTask(
  taskId: string
): Promise<{ success: true; data: Task } | { success: false; error: string }> {
  return updateTask(taskId, { status: 'done' });
}

/**
 * Rouvrir une tâche
 */
export async function reopenTask(
  taskId: string
): Promise<{ success: true; data: Task } | { success: false; error: string }> {
  return updateTask(taskId, { status: 'open' });
}

/**
 * Supprimer une tâche (uniquement les tâches manuelles)
 */
export async function deleteTask(
  taskId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que c'est une tâche manuelle
    const { data: task } = await supabase
      .from('tasks')
      .select('is_system')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (!task) {
      return { success: false, error: 'Tâche introuvable' };
    }

    if (task.is_system) {
      return { success: false, error: 'Impossible de supprimer une tâche système' };
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    return { success: true };
  } catch (error) {
    console.error('deleteTask error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Obtenir le nombre de tâches ouvertes
 */
export async function getOpenTasksCount(): Promise<{
  success: boolean;
  data?: { total: number; overdue: number; system: number };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: openTasks } = await supabase
      .from('tasks')
      .select('due_date, is_system')
      .eq('user_id', user.id)
      .eq('status', 'open');

    if (!openTasks) {
      return { success: true, data: { total: 0, overdue: 0, system: 0 } };
    }

    const today = new Date().toISOString().split('T')[0];
    const overdue = openTasks.filter((t) => t.due_date && t.due_date < today).length;
    const system = openTasks.filter((t) => t.is_system).length;

    return {
      success: true,
      data: {
        total: openTasks.length,
        overdue,
        system,
      },
    };
  } catch (error) {
    console.error('getOpenTasksCount error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Ajouter un badge à une tâche
 */
export async function addTaskBadge(
  taskId: string,
  badge: string,
  variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red' = 'gray'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la task appartient à l'utilisateur
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (!task) {
      return { success: false, error: 'Tâche introuvable' };
    }

    const { error } = await supabase
      .from('task_badges')
      .insert({ task_id: taskId, badge, variant });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('addTaskBadge error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Retirer un badge d'une tâche
 */
export async function removeTaskBadge(
  taskId: string,
  badge: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que la task appartient à l'utilisateur
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (!task) {
      return { success: false, error: 'Tâche introuvable' };
    }

    const { error } = await supabase
      .from('task_badges')
      .delete()
      .eq('task_id', taskId)
      .eq('badge', badge);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('removeTaskBadge error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Enrichir les tasks avec leurs relations hiérarchiques
 * Résout automatiquement le contexte selon l'entité liée
 */
export async function enrichTasksWithRelations(tasks: Task[]): Promise<Task[]> {
  const supabase = await createClient();

  // Collecter les IDs par type d'entité
  const dealIds = tasks.filter(t => t.entity_type === 'deal' && t.entity_id).map(t => t.entity_id!);
  const missionIds = tasks.filter(t => t.entity_type === 'mission' && t.entity_id).map(t => t.entity_id!);
  const clientIds = tasks.filter(t => t.entity_type === 'client' && t.entity_id).map(t => t.entity_id!);
  const contactIds = tasks.filter(t => t.entity_type === 'contact' && t.entity_id).map(t => t.entity_id!);

  // Collecter les owner_entity_id pour client et supplier
  const ownerClientIds = tasks
    .filter(t => t.owner_scope === 'client' && t.owner_entity_id)
    .map(t => t.owner_entity_id!);
  const ownerSupplierIds = tasks
    .filter(t => t.owner_scope === 'supplier' && t.owner_entity_id)
    .map(t => t.owner_entity_id!);

  // Combiner les IDs de clients (entity + owner)
  const allOwnerClientIds = [...new Set([...ownerClientIds])];
  const allOwnerSupplierIds = [...new Set([...ownerSupplierIds])];

  // Charger toutes les entités en parallèle
  const [dealsData, missionsData, clientsData, contactsData, ownerClientsData, ownerSuppliersData] = await Promise.all([
    dealIds.length > 0
      ? supabase.from('deals').select('id, title, client_id').in('id', dealIds)
      : Promise.resolve({ data: [] }),
    missionIds.length > 0
      ? supabase.from('missions').select('id, title, client_id, deal_id').in('id', missionIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? supabase.from('clients').select('id, nom').in('id', clientIds)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase.from('contacts').select('id, prenom, nom, client_id').in('id', contactIds)
      : Promise.resolve({ data: [] }),
    allOwnerClientIds.length > 0
      ? supabase.from('clients').select('id, nom').in('id', allOwnerClientIds)
      : Promise.resolve({ data: [] }),
    allOwnerSupplierIds.length > 0
      ? supabase.from('clients').select('id, nom').in('id', allOwnerSupplierIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Créer des maps pour un accès rapide
  const dealsMap = new Map((dealsData.data || []).map(d => [d.id, d]));
  const missionsMap = new Map((missionsData.data || []).map(m => [m.id, m]));
  const clientsMap = new Map((clientsData.data || []).map(c => [c.id, c]));
  const contactsMap = new Map((contactsData.data || []).map(c => [c.id, c]));
  const ownerClientsMap = new Map((ownerClientsData.data || []).map(c => [c.id, c]));
  const ownerSuppliersMap = new Map((ownerSuppliersData.data || []).map(c => [c.id, c]));

  // Collecter tous les client_ids manquants (depuis deals, missions, contacts)
  const allClientIds = new Set<string>();
  dealsData.data?.forEach(d => d.client_id && allClientIds.add(d.client_id));
  missionsData.data?.forEach(m => m.client_id && allClientIds.add(m.client_id));
  contactsData.data?.forEach(c => c.client_id && allClientIds.add(c.client_id));

  // Charger les clients manquants
  const missingClientIds = Array.from(allClientIds).filter(id => !clientsMap.has(id));
  if (missingClientIds.length > 0) {
    const { data: missingClients } = await supabase
      .from('clients')
      .select('id, nom')
      .in('id', missingClientIds);

    missingClients?.forEach(c => clientsMap.set(c.id, c));
  }

  // Enrichir chaque task
  return tasks.map(task => {
    const enriched = { ...task };

    switch (task.entity_type) {
      case 'deal':
        if (task.entity_id) {
          const deal = dealsMap.get(task.entity_id);
          if (deal) {
            enriched.deal = deal;
            if (deal.client_id) {
              enriched.client = clientsMap.get(deal.client_id) || null;
            }
          }
        }
        break;

      case 'mission':
        if (task.entity_id) {
          const mission = missionsMap.get(task.entity_id);
          if (mission) {
            enriched.mission = mission;
            if (mission.client_id) {
              enriched.client = clientsMap.get(mission.client_id) || null;
            }
            if (mission.deal_id) {
              enriched.deal = dealsMap.get(mission.deal_id) || null;
            }
          }
        }
        break;

      case 'client':
        if (task.entity_id) {
          enriched.client = clientsMap.get(task.entity_id) || null;
        }
        break;

      case 'contact':
        if (task.entity_id) {
          const contact = contactsMap.get(task.entity_id);
          if (contact) {
            enriched.contact = contact;
            if (contact.client_id) {
              enriched.client = clientsMap.get(contact.client_id) || null;
            }
          }
        }
        break;
    }

    // Enrichir avec l'entité owner (client ou supplier)
    if (task.owner_scope === 'client' && task.owner_entity_id) {
      const ownerClient = ownerClientsMap.get(task.owner_entity_id);
      if (ownerClient) {
        enriched.owner = { id: ownerClient.id, nom: ownerClient.nom, type: 'client' };
      }
    } else if (task.owner_scope === 'supplier' && task.owner_entity_id) {
      const ownerSupplier = ownerSuppliersMap.get(task.owner_entity_id);
      if (ownerSupplier) {
        enriched.owner = { id: ownerSupplier.id, nom: ownerSupplier.nom, type: 'supplier' };
      }
    }

    return enriched;
  });
}

/**
 * Lister les fournisseurs d'une mission
 */
export async function listMissionSuppliers(
  missionId: string
): Promise<{ success: true; data: MissionSupplier[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('mission_suppliers')
      .select(`
        *,
        supplier:clients!supplier_id(id, nom)
      `)
      .eq('mission_id', missionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('listMissionSuppliers error:', error);
      return { success: false, error: 'Erreur lors de la récupération des fournisseurs' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('listMissionSuppliers error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Ajouter un fournisseur à une mission
 */
export async function addMissionSupplier(
  payload: CreateMissionSupplierPayload
): Promise<{ success: true; data: MissionSupplier } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data, error } = await supabase
      .from('mission_suppliers')
      .insert({
        user_id: user.id,
        mission_id: payload.mission_id,
        supplier_id: payload.supplier_id,
        notes: payload.notes || null,
      })
      .select(`
        *,
        supplier:clients!supplier_id(id, nom)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ce fournisseur est déjà lié à cette mission' };
      }
      console.error('addMissionSupplier error:', error);
      return { success: false, error: 'Erreur lors de l\'ajout du fournisseur' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('addMissionSupplier error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}

/**
 * Retirer un fournisseur d'une mission
 */
export async function removeMissionSupplier(
  missionSupplierId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { error } = await supabase
      .from('mission_suppliers')
      .delete()
      .eq('id', missionSupplierId)
      .eq('user_id', user.id);

    if (error) {
      console.error('removeMissionSupplier error:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    return { success: true };
  } catch (error) {
    console.error('removeMissionSupplier error:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
