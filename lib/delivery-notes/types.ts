// Delivery Note Types (Client - Outgoing)

export type DeliveryNoteStatus = 'brouillon' | 'envoye' | 'signe';

export interface DeliveryNote {
  id: string;
  user_id: string;
  mission_id: string;
  client_id: string;
  numero: string;
  date_emission: string;
  status: DeliveryNoteStatus;
  notes: string | null;
  pdf_url: string | null;
  version_number: number;
  parent_delivery_note_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DeliveryNoteLineItem {
  id: string;
  delivery_note_id: string;
  description: string;
  quantite: number;
  unite: string;
  ordre: number;
  created_at: string;
}

export interface DeliveryNoteWithRelations extends DeliveryNote {
  client: {
    id: string;
    nom: string;
  } | null;
  mission: {
    id: string;
    title: string;
  } | null;
  line_items: DeliveryNoteLineItem[];
}

export interface DeliveryNoteListItem extends DeliveryNote {
  client: {
    id: string;
    nom: string;
  } | null;
  mission: {
    id: string;
    title: string;
  } | null;
}

export interface CreateDeliveryNotePayload {
  mission_id: string;
  client_id: string;
  date_emission?: string;
  notes?: string;
  line_items?: CreateDeliveryNoteLineItemPayload[];
}

export interface CreateDeliveryNoteLineItemPayload {
  description: string;
  quantite?: number;
  unite?: string;
  ordre?: number;
}

export interface UpdateDeliveryNotePayload {
  date_emission?: string;
  status?: DeliveryNoteStatus;
  notes?: string;
}

// Status labels and variants for UI
export const DELIVERY_NOTE_STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  signe: 'Signé',
};

export const DELIVERY_NOTE_STATUS_VARIANTS: Record<DeliveryNoteStatus, 'gray' | 'blue' | 'green'> = {
  brouillon: 'gray',
  envoye: 'blue',
  signe: 'green',
};
