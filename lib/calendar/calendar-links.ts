import { createClient } from '@/lib/supabase/server';
import type {
  CalendarEventLink,
  EnrichedCalendarEvent,
  GoogleCalendarEvent,
  LinkEventPayload,
  EventPrefillContext,
  CalendarEntityType,
} from './types';

// ============================================================================
// Link Management
// ============================================================================

/**
 * Create or update a link between a Google event and Verifolio entities
 */
export async function linkEvent(payload: LinkEventPayload): Promise<CalendarEventLink | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const linkData = {
    user_id: user.id,
    google_event_id: payload.google_event_id,
    google_calendar_id: payload.google_calendar_id || 'primary',
    mission_id: payload.mission_id ?? null,
    deal_id: payload.deal_id ?? null,
    client_id: payload.client_id ?? null,
    supplier_id: payload.supplier_id ?? null,
    contact_id: payload.contact_id ?? null,
  };

  const { data, error } = await supabase
    .from('calendar_event_links')
    .upsert(linkData, { onConflict: 'user_id,google_event_id' })
    .select()
    .single();

  if (error) {
    console.error('Error linking event:', error);
    return null;
  }

  return data;
}

/**
 * Get link for a specific Google event
 */
export async function getLinkByGoogleEvent(googleEventId: string): Promise<CalendarEventLink | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('calendar_event_links')
    .select('*')
    .eq('user_id', user.id)
    .eq('google_event_id', googleEventId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get all links for events in a date range
 */
export async function getLinksForDateRange(
  startDate: string,
  endDate: string
): Promise<CalendarEventLink[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('calendar_event_links')
    .select('*')
    .eq('user_id', user.id)
    .gte('event_start', startDate)
    .lte('event_start', endDate);

  if (error) {
    console.error('Error fetching links:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all links for a specific entity
 */
export async function getLinksForEntity(
  entityType: CalendarEntityType,
  entityId: string
): Promise<CalendarEventLink[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const columnMap: Record<CalendarEntityType, string> = {
    mission: 'mission_id',
    deal: 'deal_id',
    client: 'client_id',
    supplier: 'supplier_id',
    contact: 'contact_id',
  };

  const column = columnMap[entityType];

  const { data, error } = await supabase
    .from('calendar_event_links')
    .select('*')
    .eq('user_id', user.id)
    .eq(column, entityId);

  if (error) {
    console.error('Error fetching entity links:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a link
 */
export async function deleteLink(googleEventId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from('calendar_event_links')
    .delete()
    .eq('user_id', user.id)
    .eq('google_event_id', googleEventId);

  return !error;
}

/**
 * Update cached event metadata (title, start, end)
 */
export async function updateCachedEventMetadata(
  googleEventId: string,
  event: GoogleCalendarEvent
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const eventStart = event.start?.dateTime || event.start?.date || null;
  const eventEnd = event.end?.dateTime || event.end?.date || null;

  await supabase
    .from('calendar_event_links')
    .update({
      event_title: event.summary || null,
      event_start: eventStart,
      event_end: eventEnd,
    })
    .eq('user_id', user.id)
    .eq('google_event_id', googleEventId);
}

// ============================================================================
// Event Enrichment
// ============================================================================

/**
 * Enrich Google Calendar events with Verifolio entity data
 */
export async function enrichEvents(
  events: GoogleCalendarEvent[]
): Promise<EnrichedCalendarEvent[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || events.length === 0) {
    return events.map(e => ({ ...e, linkedEntities: {} }));
  }

  // Get all event IDs
  const eventIds = events.map(e => e.id);

  // Fetch all links for these events
  const { data: links } = await supabase
    .from('calendar_event_links')
    .select('*')
    .eq('user_id', user.id)
    .in('google_event_id', eventIds);

  // Create a map for quick lookup
  const linksMap = new Map<string, CalendarEventLink>();
  if (links) {
    for (const link of links) {
      linksMap.set(link.google_event_id, link);
    }
  }

  // Collect all entity IDs to fetch
  const missionIds = new Set<string>();
  const dealIds = new Set<string>();
  const clientIds = new Set<string>();
  const contactIds = new Set<string>();

  for (const link of links || []) {
    if (link.mission_id) missionIds.add(link.mission_id);
    if (link.deal_id) dealIds.add(link.deal_id);
    if (link.client_id) clientIds.add(link.client_id);
    if (link.supplier_id) clientIds.add(link.supplier_id); // Suppliers are in clients table
    if (link.contact_id) contactIds.add(link.contact_id);
  }

  // Fetch all entities in parallel
  const [missions, deals, clients, contacts] = await Promise.all([
    missionIds.size > 0
      ? supabase.from('missions').select('id, title').in('id', Array.from(missionIds))
      : { data: [] },
    dealIds.size > 0
      ? supabase.from('deals').select('id, nom').in('id', Array.from(dealIds))
      : { data: [] },
    clientIds.size > 0
      ? supabase.from('clients').select('id, nom').in('id', Array.from(clientIds))
      : { data: [] },
    contactIds.size > 0
      ? supabase.from('client_contacts').select('id, nom, prenom').in('id', Array.from(contactIds))
      : { data: [] },
  ]);

  // Create entity maps
  const missionMap = new Map(missions.data?.map(m => [m.id, m]) || []);
  const dealMap = new Map(deals.data?.map(d => [d.id, d]) || []);
  const clientMap = new Map(clients.data?.map(c => [c.id, c]) || []);
  const contactMap = new Map(contacts.data?.map(c => [c.id, c]) || []);

  // Enrich events
  return events.map(event => {
    const link = linksMap.get(event.id);

    const linkedEntities: EnrichedCalendarEvent['linkedEntities'] = {};

    if (link) {
      if (link.mission_id) {
        const mission = missionMap.get(link.mission_id);
        if (mission) linkedEntities.mission = mission;
      }
      if (link.deal_id) {
        const deal = dealMap.get(link.deal_id);
        if (deal) linkedEntities.deal = deal;
      }
      if (link.client_id) {
        const client = clientMap.get(link.client_id);
        if (client) linkedEntities.client = client;
      }
      if (link.supplier_id) {
        const supplier = clientMap.get(link.supplier_id);
        if (supplier) linkedEntities.supplier = supplier;
      }
      if (link.contact_id) {
        const contact = contactMap.get(link.contact_id);
        if (contact) linkedEntities.contact = contact;
      }
    }

    return {
      ...event,
      verifolioLink: link || undefined,
      linkedEntities,
    };
  });
}

// ============================================================================
// Pre-fill Logic
// ============================================================================

/**
 * Generate pre-fill context for creating an event from an entity
 */
export async function getPrefillContext(
  entityType: CalendarEntityType,
  entityId: string
): Promise<EventPrefillContext> {
  const supabase = await createClient();
  const context: EventPrefillContext = {
    fromEntity: { type: entityType, id: entityId },
    suggestedLinks: {},
    suggestedAttendees: [],
  };

  // Always link to the source entity
  switch (entityType) {
    case 'mission':
      context.suggestedLinks.mission_id = entityId;
      break;
    case 'deal':
      context.suggestedLinks.deal_id = entityId;
      break;
    case 'client':
      context.suggestedLinks.client_id = entityId;
      break;
    case 'supplier':
      context.suggestedLinks.supplier_id = entityId;
      break;
    case 'contact':
      context.suggestedLinks.contact_id = entityId;
      break;
  }

  // Smart pre-fill based on entity type
  if (entityType === 'mission') {
    // Mission -> auto-link client, suggest contacts
    const { data: mission } = await supabase
      .from('missions')
      .select('id, title, client_id, deal_id')
      .eq('id', entityId)
      .single();

    if (mission) {
      context.suggestedTitle = `Réunion - ${mission.title}`;

      if (mission.client_id) {
        context.suggestedLinks.client_id = mission.client_id;
      }
      if (mission.deal_id) {
        context.suggestedLinks.deal_id = mission.deal_id;
      }

      // Get mission contacts for suggested attendees
      const { data: missionContacts } = await supabase
        .from('mission_contacts')
        .select('contact_id, client_contacts(id, nom, prenom, email)')
        .eq('mission_id', entityId);

      if (missionContacts) {
        for (const mc of missionContacts) {
          const contact = mc.client_contacts as unknown as { id: string; nom: string; prenom: string; email: string | null } | null;
          if (contact?.email) {
            context.suggestedAttendees?.push({
              email: contact.email,
              name: `${contact.prenom} ${contact.nom}`.trim(),
            });
          }
        }
      }
    }
  }

  if (entityType === 'deal') {
    // Deal -> auto-link client if exists
    const { data: deal } = await supabase
      .from('deals')
      .select('id, nom, client_id')
      .eq('id', entityId)
      .single();

    if (deal) {
      context.suggestedTitle = `Réunion - ${deal.nom}`;

      if (deal.client_id) {
        context.suggestedLinks.client_id = deal.client_id;
      }

      // Get deal contacts
      const { data: dealContacts } = await supabase
        .from('deal_contacts')
        .select('contact_id, client_contacts(id, nom, prenom, email)')
        .eq('deal_id', entityId);

      if (dealContacts) {
        for (const dc of dealContacts) {
          const contact = dc.client_contacts as unknown as { id: string; nom: string; prenom: string; email: string | null } | null;
          if (contact?.email) {
            context.suggestedAttendees?.push({
              email: contact.email,
              name: `${contact.prenom} ${contact.nom}`.trim(),
            });
          }
        }
      }
    }
  }

  if (entityType === 'client') {
    // Client -> get primary contacts
    const { data: client } = await supabase
      .from('clients')
      .select('id, nom, email')
      .eq('id', entityId)
      .single();

    if (client) {
      context.suggestedTitle = `Réunion - ${client.nom}`;

      if (client.email) {
        context.suggestedAttendees?.push({
          email: client.email,
          name: client.nom,
        });
      }

      // Get client contacts
      const { data: contacts } = await supabase
        .from('client_contacts')
        .select('id, nom, prenom, email')
        .eq('client_id', entityId)
        .eq('est_principal', true);

      if (contacts) {
        for (const contact of contacts) {
          if (contact.email) {
            context.suggestedAttendees?.push({
              email: contact.email,
              name: `${contact.prenom} ${contact.nom}`.trim(),
            });
          }
        }
      }
    }
  }

  if (entityType === 'contact') {
    // Contact -> get email, suggest linking to their client
    const { data: contact } = await supabase
      .from('client_contacts')
      .select('id, nom, prenom, email, client_id')
      .eq('id', entityId)
      .single();

    if (contact) {
      context.suggestedTitle = `Réunion avec ${contact.prenom} ${contact.nom}`;
      context.suggestedLinks.contact_id = contact.id;

      if (contact.email) {
        context.suggestedAttendees?.push({
          email: contact.email,
          name: `${contact.prenom} ${contact.nom}`.trim(),
        });
      }

      if (contact.client_id) {
        context.suggestedLinks.client_id = contact.client_id;
      }
    }
  }

  return context;
}

// ============================================================================
// Export index file
// ============================================================================

export * from './types';
