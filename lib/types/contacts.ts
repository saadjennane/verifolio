// ============================================================================
// Contacts Types
// ============================================================================

export type ContactContext = 'FACTURATION' | 'COMMERCIAL' | 'OPERATIONNEL' | 'DIRECTION';
export type PreferredChannel = 'email' | 'phone';

export type Civilite = 'M.' | 'Mme' | 'Mlle';

export interface Contact {
  id: string;
  user_id: string;
  nom: string;
  prenom: string | null;
  civilite: Civilite | null;
  email: string | null;
  telephone: string | null;
  birthday: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  contact_id: string;
  role: string | null;
  handles_billing: boolean;
  handles_commercial: boolean;
  handles_ops: boolean;
  handles_management: boolean;
  is_primary: boolean;
  preferred_channel: PreferredChannel | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContactWithDetails extends ClientContact {
  contact: Contact;
}

export interface ContactWithClients extends Contact {
  client_links: ClientContact[];
}

// Input types for creation/update
export interface ContactInput {
  nom: string;
  prenom?: string;
  civilite?: Civilite;
  email?: string;
  telephone?: string;
  birthday?: string;
  notes?: string;
}

export interface ClientContactInput {
  client_id: string;
  contact_id: string;
  role?: string;
  handles_billing?: boolean;
  handles_commercial?: boolean;
  handles_ops?: boolean;
  handles_management?: boolean;
  is_primary?: boolean;
  preferred_channel?: PreferredChannel;
}

export interface ClientContactUpdateInput {
  role?: string;
  handles_billing?: boolean;
  handles_commercial?: boolean;
  handles_ops?: boolean;
  handles_management?: boolean;
  is_primary?: boolean;
  preferred_channel?: PreferredChannel;
}

// Result type for get_contact_for_context
export interface ContactForContextResult {
  found: boolean;
  contact: Contact | null;
  client_contact: ClientContact | null;
  match_type: 'exact' | 'primary_fallback' | null;
  suggestion?: string;
}
