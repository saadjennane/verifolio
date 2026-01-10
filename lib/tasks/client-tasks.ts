import { createClient } from '@/lib/supabase/client';
import type { Task } from './types';

/**
 * Enrichir les tasks avec leurs relations hiérarchiques (version client)
 * Résout automatiquement le contexte selon l'entité liée
 */
export async function enrichTasksWithRelations(tasks: Task[]): Promise<Task[]> {
  const supabase = createClient();

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
