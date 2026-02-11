// Types pour le système de tâches

export type TaskStatus = 'open' | 'en_attente' | 'done';

export type TaskEntityType = 'deal' | 'mission' | 'client' | 'contact' | 'invoice';

// Dépendance opérationnelle: de qui dépend la tâche
export type TaskOwnerScope = 'me' | 'client' | 'supplier';

export interface TaskBadge {
  id: string;
  task_id: string;
  badge: string;
  variant: 'gray' | 'blue' | 'green' | 'yellow' | 'red';
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  entity_type: TaskEntityType | null;
  entity_id: string | null;
  is_system: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  wait_reason: string | null;
  // Dépendance (owner)
  owner_scope: TaskOwnerScope;
  owner_entity_id: string | null;
  // Catégorie pour regroupement visuel
  category: string;
  subgroup: string | null;
  // Relations enrichies
  badges?: TaskBadge[];
  deal?: { id: string; title: string; client_id: string } | null;
  mission?: { id: string; title: string; client_id: string; deal_id: string | null } | null;
  client?: { id: string; nom: string } | null;
  contact?: { id: string; prenom: string; nom: string; client_id: string | null } | null;
  // Owner enrichi
  owner?: { id: string; nom: string; type: 'client' | 'supplier' } | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  due_date?: string;
  entity_type?: TaskEntityType;
  entity_id?: string;
  wait_reason?: string;
  owner_scope?: TaskOwnerScope;
  owner_entity_id?: string;
  category?: string;
  subgroup?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  due_date?: string | null;
  status?: TaskStatus;
  wait_reason?: string | null;
  entity_type?: TaskEntityType | null;
  entity_id?: string | null;
  owner_scope?: TaskOwnerScope;
  owner_entity_id?: string | null;
  category?: string;
  subgroup?: string | null;
}

export interface ListTasksFilter {
  status?: TaskStatus;
  entity_type?: TaskEntityType;
  entity_id?: string;
  is_system?: boolean;
  overdue?: boolean;
  owner_scope?: TaskOwnerScope;
  owner_entity_id?: string;
  category?: string;
  subgroup?: string;
}

// Types pour mission_suppliers
export interface MissionSupplier {
  id: string;
  user_id: string;
  mission_id: string;
  supplier_id: string;
  notes: string | null;
  created_at: string;
  // Relations enrichies
  supplier?: { id: string; nom: string } | null;
}

export interface CreateMissionSupplierPayload {
  mission_id: string;
  supplier_id: string;
  notes?: string;
}
