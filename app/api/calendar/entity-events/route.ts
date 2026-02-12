import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLinksForEntity } from '@/lib/calendar/calendar-links';
import { getEvent } from '@/lib/calendar/google-calendar';
import type { CalendarEntityType, EnrichedCalendarEvent } from '@/lib/calendar/types';

// GET /api/calendar/entity-events - Get events linked to an entity
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type') as CalendarEntityType | null;
    const entityId = searchParams.get('entity_id');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type et entity_id requis' },
        { status: 400 }
      );
    }

    const validTypes: CalendarEntityType[] = ['mission', 'deal', 'client', 'supplier', 'contact'];
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: 'entity_type invalide' },
        { status: 400 }
      );
    }

    // Get all links for this entity
    const links = await getLinksForEntity(entityType, entityId);

    if (links.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Fetch Google events for each link
    const events: EnrichedCalendarEvent[] = [];
    for (const link of links) {
      const googleEvent = await getEvent(link.google_event_id, link.google_calendar_id);
      if (googleEvent) {
        events.push({
          ...googleEvent,
          verifolioLink: link,
          linkedEntities: {},
        });
      }
    }

    // Sort by start date
    events.sort((a, b) => {
      const aStart = a.start?.dateTime || a.start?.date || '';
      const bStart = b.start?.dateTime || b.start?.date || '';
      return aStart.localeCompare(bStart);
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error in GET /api/calendar/entity-events:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
