// Types pour le système Deals

export type DealStatus = 'new' | 'draft' | 'sent' | 'won' | 'lost' | 'archived';

export type DealDocumentType = 'quote' | 'proposal';

export interface Deal {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: DealStatus;
  estimated_amount: number | null;
  final_amount: number | null;
  currency: string;
  received_at: string | null;
  sent_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  archived_at: string | null;
  mission_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealContact {
  id: string;
  deal_id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface DealDocument {
  id: string;
  deal_id: string;
  document_type: DealDocumentType;
  quote_id: string | null;
  proposal_id: string | null;
  created_at: string;
  // Relations jointes
  quote?: {
    id: string;
    numero: string;
    status: string;
  } | null;
  proposal?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export interface DealTag {
  id: string;
  deal_id: string;
  tag: string;
  color: string;
  created_at: string;
}

export interface DealBadge {
  id: string;
  deal_id: string;
  badge: string;
  variant: string;
  created_at: string;
}

// DTOs pour création/update

export interface CreateDealPayload {
  client_id: string;
  title: string;
  description?: string;
  estimated_amount?: number;
  currency?: string;
  received_at?: string;
  contacts?: string[]; // IDs des contacts
  tags?: string[];
  badges?: string[];
}

export interface UpdateDealPayload {
  title?: string;
  description?: string;
  estimated_amount?: number;
  final_amount?: number;
  status?: DealStatus;
}

export interface ListDealsFilter {
  status?: DealStatus;
  client_id?: string;
}

// Types avec données jointes

export interface DealListItem extends Deal {
  client?: {
    id: string;
    nom: string;
  } | null;
  tags?: DealTag[];
  badges?: DealBadge[];
}

export interface DealWithRelations extends Deal {
  client?: {
    id: string;
    nom: string;
  } | null;
  contacts?: Array<DealContact & {
    contact?: {
      id: string;
      nom: string;
    } | null;
  }>;
  documents?: DealDocument[];
  tags?: DealTag[];
  badges?: DealBadge[];
  mission?: {
    id: string;
    title: string;
    status: string;
  } | null;
}
