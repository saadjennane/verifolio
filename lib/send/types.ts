/**
 * Types pour le module Send
 * Gestion unifiee des envois de documents par email
 */

// Types de ressources pouvant etre envoyees
export type ResourceType = 'brief' | 'proposal' | 'quote' | 'invoice' | 'review_request';

// Types d'evenements trackables
export type EventType =
  | 'email_sent'      // Email envoye avec succes
  | 'link_clicked'    // Lien clique (redirect tracking)
  | 'viewer_opened'   // Page viewer ouverte (premiere visite)
  | 'pdf_downloaded'  // PDF telecharge
  | 'submitted'       // Formulaire soumis (brief, review)
  | 'accepted'        // Proposition acceptee
  | 'refused';        // Proposition refusee

// Lien public vers une ressource
export interface PublicLink {
  id: string;
  user_id: string;
  resource_type: ResourceType;
  resource_id: string;
  token: string;
  is_revoked: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

// Evenement de tracking
export interface TrackingEvent {
  id: string;
  user_id: string;
  resource_type: ResourceType;
  resource_id: string;
  public_link_id: string | null;
  event_type: EventType;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Request pour envoyer un document
export interface SendRequest {
  resource_type: ResourceType;
  resource_id: string;
  to_emails: string[];
  subject?: string;
  body?: string;
  attach_pdf?: boolean;
  contact_ids?: string[];
}

// Resultat d'un envoi
export interface SendResult {
  success: boolean;
  message_id?: string;
  public_link_token?: string;
  recipient_count: number;
  error?: string;
}

// Variables pour les templates email
export interface EmailTemplateVariables {
  // Identifiants
  client_name?: string;
  deal_title?: string;
  mission_title?: string;
  quote_number?: string;
  invoice_number?: string;

  // Expediteur
  company_name: string;
  user_display_name: string;

  // Lien public
  public_link_url: string;

  // Message personnalise
  custom_message?: string;
}

// Configuration par type de document
export interface DocumentSendConfig {
  resource_type: ResourceType;
  viewer_path: string;           // /p, /b, /q, /i, /r
  default_attach_pdf: boolean;   // PDF joint par defaut
  supports_pdf: boolean;         // Peut-on joindre un PDF
  status_after_send?: string;    // Nouveau statut apres envoi
}

// Mapping des configurations par type
export const DOCUMENT_SEND_CONFIGS: Record<ResourceType, DocumentSendConfig> = {
  brief: {
    resource_type: 'brief',
    viewer_path: '/b',
    default_attach_pdf: false,
    supports_pdf: false,
    status_after_send: 'SENT',
  },
  proposal: {
    resource_type: 'proposal',
    viewer_path: '/p',
    default_attach_pdf: false,
    supports_pdf: true,
    status_after_send: 'SENT',
  },
  quote: {
    resource_type: 'quote',
    viewer_path: '/q',
    default_attach_pdf: false,  // OFF par defaut
    supports_pdf: true,
    status_after_send: 'envoye',
  },
  invoice: {
    resource_type: 'invoice',
    viewer_path: '/i',
    default_attach_pdf: true,   // ON par defaut
    supports_pdf: true,
    status_after_send: 'envoyee',
  },
  review_request: {
    resource_type: 'review_request',
    viewer_path: '/r',
    default_attach_pdf: false,
    supports_pdf: false,
    status_after_send: 'sent',
  },
};

// Historique d'envoi (depuis outbound_messages)
export interface SendHistoryItem {
  id: string;
  sent_at: string | null;
  recipient_emails: string[];
  recipient_count: number;
  status: 'pending' | 'sent' | 'failed';
  subject: string | null;
  message: string | null;
  error_message: string | null;
}

// Analytics pour une ressource
export interface ResourceAnalytics {
  total_sends: number;
  total_opens: number;
  unique_opens: number;
  pdf_downloads: number;
  last_sent_at: string | null;
  last_viewed_at: string | null;
}
