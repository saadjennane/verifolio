// Types pour le système Missions

export type MissionStatus =
  | 'in_progress'
  | 'delivered'
  | 'to_invoice'
  | 'invoiced'
  | 'paid'
  | 'closed'
  | 'cancelled';

export interface Mission {
  id: string;
  user_id: string;
  deal_id: string | null; // Peut être null pour missions créées manuellement
  client_id: string;
  title: string;
  description: string | null;
  mission_context: string | null;
  status: MissionStatus;
  started_at: string | null;
  delivered_at: string | null;
  to_invoice_at: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  visible_on_verifolio: boolean;
  estimated_amount: number | null;
  final_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface MissionContact {
  id: string;
  mission_id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface MissionInvoice {
  id: string;
  mission_id: string;
  invoice_id: string;
  created_at: string;
}

export interface MissionTag {
  id: string;
  mission_id: string;
  tag: string;
  color: string;
  created_at: string;
}

export interface MissionBadge {
  id: string;
  mission_id: string;
  badge: string;
  variant: string;
  created_at: string;
}

// DTOs pour création/update

export interface CreateMissionPayload {
  deal_id?: string; // Optionnel pour la création manuelle
  client_id: string;
  title: string;
  description?: string;
  estimated_amount?: number;
  started_at?: string; // Optionnel - date de début personnalisée
  contacts?: string[]; // IDs des contacts
  visible_on_verifolio?: boolean;
}

export interface UpdateMissionPayload {
  title?: string;
  description?: string;
  mission_context?: string;
  estimated_amount?: number;
  final_amount?: number;
  visible_on_verifolio?: boolean;
}

export interface ListMissionsFilter {
  status?: MissionStatus;
  client_id?: string;
  visible_on_verifolio?: boolean;
}

// Types avec données jointes

export interface MissionListItem extends Mission {
  client?: {
    id: string;
    nom: string;
  } | null;
  deal?: {
    id: string;
    title: string;
  } | null;
  tags?: MissionTag[];
  badges?: MissionBadge[];
}

export interface MissionWithRelations extends Mission {
  client?: {
    id: string;
    nom: string;
  } | null;
  deal?: {
    id: string;
    title: string;
  } | null;
  contacts?: Array<MissionContact & {
    contact?: {
      id: string;
      nom: string;
    } | null;
  }>;
  invoices?: Array<MissionInvoice & {
    invoice?: {
      id: string;
      numero: string;
      status: string;
      total_ttc: number;
      notes: string | null;
      deleted_at: string | null;
    } | null;
  }>;
  tags?: MissionTag[];
  badges?: MissionBadge[];
}
