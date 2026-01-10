'use client';

import { Badge } from '@/components/ui/Badge';
import type { TaskOwnerScope } from '@/lib/tasks/types';

interface TaskContextProps {
  task: {
    entity_type: string | null;
    owner_scope?: TaskOwnerScope;
    owner?: { id: string; nom: string; type: 'client' | 'supplier' } | null;
    deal?: { id: string; title: string; client_id: string } | null;
    mission?: { id: string; title: string; client_id: string; deal_id: string | null } | null;
    client?: { id: string; nom: string } | null;
    contact?: { id: string; prenom: string; nom: string; client_id: string | null } | null;
  };
}

/**
 * Affiche le contexte hiérarchique d'une tâche
 * Respecte la règle: l'utilisateur a lié UNE chose, on affiche le contexte complet
 */
export function TaskContext({ task }: TaskContextProps) {
  // Badge "Dépend de" pour owner_scope
  const ownerBadge = (() => {
    if (!task.owner_scope || task.owner_scope === 'me') return null;
    if (task.owner_scope === 'client' && task.owner) {
      return (
        <Badge variant="yellow" className="text-xs">
          CLIENT · {task.owner.nom}
        </Badge>
      );
    }
    if (task.owner_scope === 'supplier' && task.owner) {
      return (
        <Badge variant="blue" className="text-xs">
          FOURNISSEUR · {task.owner.nom}
        </Badge>
      );
    }
    return null;
  })();

  // Si pas d'entity_type mais on a un owner, afficher juste le badge owner
  if (!task.entity_type && ownerBadge) {
    return (
      <div className="flex gap-1 flex-wrap items-center text-xs text-gray-600">
        {ownerBadge}
      </div>
    );
  }

  if (!task.entity_type) {
    return ownerBadge;
  }

  // Contexte pour une tâche liée à une Mission
  if (task.entity_type === 'mission' && task.mission) {
    return (
      <div className="flex gap-1 flex-wrap items-center text-xs text-gray-600">
        {ownerBadge}
        <Badge variant="blue">Mission: {task.mission.title}</Badge>
        {task.client && (
          <Badge variant="gray">Client: {task.client.nom}</Badge>
        )}
        {task.deal && (
          <Badge variant="gray">Deal: {task.deal.title}</Badge>
        )}
      </div>
    );
  }

  // Contexte pour une tâche liée à un Deal
  if (task.entity_type === 'deal' && task.deal) {
    return (
      <div className="flex gap-1 flex-wrap items-center text-xs text-gray-600">
        {ownerBadge}
        <Badge variant="blue">Deal: {task.deal.title}</Badge>
        {task.client && (
          <Badge variant="gray">Client: {task.client.nom}</Badge>
        )}
      </div>
    );
  }

  // Contexte pour une tâche liée à un Client
  if (task.entity_type === 'client' && task.client) {
    return (
      <div className="flex gap-1 flex-wrap items-center text-xs text-gray-600">
        {ownerBadge}
        <Badge variant="blue">Client: {task.client.nom}</Badge>
      </div>
    );
  }

  // Contexte pour une tâche liée à un Contact
  if (task.entity_type === 'contact' && task.contact) {
    return (
      <div className="flex gap-1 flex-wrap items-center text-xs text-gray-600">
        {ownerBadge}
        <Badge variant="blue">
          Contact: {task.contact.prenom} {task.contact.nom}
        </Badge>
        {task.client && (
          <Badge variant="gray">Client: {task.client.nom}</Badge>
        )}
      </div>
    );
  }

  // Fallback - afficher juste le type
  if (task.entity_type) {
    return (
      <div className="flex gap-1 flex-wrap items-center text-xs text-gray-600">
        {ownerBadge}
        <Badge variant="gray">{task.entity_type}</Badge>
      </div>
    );
  }

  return ownerBadge;
}
