// ============================================================================
// Calendar Entity Types
// ============================================================================

export type CalendarEntityType =
  | 'mission'
  | 'deal'
  | 'client'
  | 'supplier'
  | 'contact';

// ============================================================================
// Google Calendar API Types
// ============================================================================

export interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GoogleEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
  self?: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: GoogleEventAttendee[];
  htmlLink?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  created?: string;
  updated?: string;
  recurringEventId?: string;
  colorId?: string;
}

export interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

// ============================================================================
// Verifolio Calendar Link
// ============================================================================

export interface CalendarEventLink {
  id: string;
  user_id: string;
  google_event_id: string;
  google_calendar_id: string;
  event_title: string | null;
  event_start: string | null;
  event_end: string | null;
  mission_id: string | null;
  deal_id: string | null;
  client_id: string | null;
  supplier_id: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Enriched Calendar Event
// ============================================================================

export interface LinkedEntityInfo {
  id: string;
  name: string;
  type: CalendarEntityType;
}

export interface EnrichedCalendarEvent extends GoogleCalendarEvent {
  verifolioLink?: CalendarEventLink;
  linkedEntities: {
    mission?: { id: string; title: string } | null;
    deal?: { id: string; nom: string } | null;
    client?: { id: string; nom: string } | null;
    supplier?: { id: string; nom: string } | null;
    contact?: { id: string; nom: string; prenom: string } | null;
  };
}

// ============================================================================
// API Payloads
// ============================================================================

export interface CreateCalendarEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  attendees?: Array<{ email: string; displayName?: string }>;
  // Entity links
  mission_id?: string;
  deal_id?: string;
  client_id?: string;
  supplier_id?: string;
  contact_id?: string;
}

export interface UpdateCalendarEventPayload {
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface LinkEventPayload {
  google_event_id: string;
  google_calendar_id?: string;
  mission_id?: string | null;
  deal_id?: string | null;
  client_id?: string | null;
  supplier_id?: string | null;
  contact_id?: string | null;
}

// ============================================================================
// Pre-fill Context
// ============================================================================

export interface EventPrefillContext {
  fromEntity?: {
    type: CalendarEntityType;
    id: string;
  };
  suggestedLinks: {
    mission_id?: string;
    deal_id?: string;
    client_id?: string;
    supplier_id?: string;
    contact_id?: string;
  };
  suggestedTitle?: string;
  suggestedAttendees?: Array<{ email: string; name?: string }>;
}

// ============================================================================
// UI Labels
// ============================================================================

export const CALENDAR_ENTITY_TYPE_LABELS: Record<CalendarEntityType, string> = {
  mission: 'Mission',
  deal: 'Deal',
  client: 'Client',
  supplier: 'Fournisseur',
  contact: 'Contact',
};
