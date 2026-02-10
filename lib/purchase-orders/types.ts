// Purchase Order Types (Sent to Suppliers)

export type PurchaseOrderStatus = 'brouillon' | 'envoye' | 'confirme' | 'livre' | 'annule';

export interface PurchaseOrder {
  id: string;
  user_id: string;
  supplier_id: string;
  supplier_quote_id: string | null;
  numero: string;
  date_emission: string;
  date_livraison_prevue: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  vat_enabled: boolean;
  status: PurchaseOrderStatus;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PurchaseOrderLineItem {
  id: string;
  purchase_order_id: string;
  description: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number | null;
  taux_tva: number;
  ordre: number;
  created_at: string;
}

export interface PurchaseOrderWithRelations extends PurchaseOrder {
  supplier: {
    id: string;
    nom: string;
    email: string | null;
  } | null;
  supplier_quote: {
    id: string;
    reference: string | null;
  } | null;
  line_items: PurchaseOrderLineItem[];
}

export interface PurchaseOrderListItem extends PurchaseOrder {
  supplier: {
    id: string;
    nom: string;
  } | null;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: string;
  supplier_quote_id?: string;
  date_emission?: string;
  date_livraison_prevue?: string;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  vat_enabled?: boolean;
  notes?: string;
  line_items?: CreatePurchaseOrderLineItemPayload[];
}

export interface CreatePurchaseOrderLineItemPayload {
  description: string;
  quantite?: number;
  unite?: string;
  prix_unitaire_ht?: number;
  taux_tva?: number;
  ordre?: number;
}

export interface UpdatePurchaseOrderPayload {
  supplier_id?: string;
  supplier_quote_id?: string | null;
  date_emission?: string;
  date_livraison_prevue?: string | null;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  vat_enabled?: boolean;
  status?: PurchaseOrderStatus;
  notes?: string;
}

// Status labels and variants for UI
export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  confirme: 'Confirmé',
  livre: 'Livré',
  annule: 'Annulé',
};

export const PO_STATUS_VARIANTS: Record<PurchaseOrderStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  brouillon: 'gray',
  envoye: 'blue',
  confirme: 'yellow',
  livre: 'green',
  annule: 'red',
};
