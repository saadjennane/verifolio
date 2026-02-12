import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listEvents, createEvent } from '@/lib/calendar/google-calendar';
import { enrichEvents, linkEvent } from '@/lib/calendar/calendar-links';
import type { CreateCalendarEventPayload } from '@/lib/calendar/types';

// GET /api/calendar/events - List calendar events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax');
    const maxResults = searchParams.get('maxResults');
    const calendarId = searchParams.get('calendarId') || 'primary';

    const result = await listEvents({
      calendarId,
      timeMin,
      timeMax: timeMax || undefined,
      maxResults: maxResults ? parseInt(maxResults, 10) : 50,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Impossible de récupérer les événements. Vérifiez la connexion Google Calendar.' },
        { status: 400 }
      );
    }

    // Enrich events with Verifolio data
    const enrichedEvents = await enrichEvents(result.items || []);

    return NextResponse.json({
      events: enrichedEvents,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    console.error('Error in GET /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/events - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body: CreateCalendarEventPayload = await request.json();

    if (!body.summary || !body.start || !body.end) {
      return NextResponse.json(
        { error: 'Titre, date de début et date de fin requis' },
        { status: 400 }
      );
    }

    // Create event in Google Calendar
    const googleEvent = await createEvent({
      summary: body.summary,
      description: body.description,
      location: body.location,
      start: body.start,
      end: body.end,
      attendees: body.attendees,
    });

    if (!googleEvent) {
      return NextResponse.json(
        { error: 'Impossible de créer l\'événement dans Google Calendar' },
        { status: 400 }
      );
    }

    // Create link in Verifolio if any entity is linked
    const hasLinks = body.mission_id || body.deal_id || body.client_id || body.supplier_id || body.contact_id;

    if (hasLinks) {
      await linkEvent({
        google_event_id: googleEvent.id,
        google_calendar_id: 'primary',
        mission_id: body.mission_id,
        deal_id: body.deal_id,
        client_id: body.client_id,
        supplier_id: body.supplier_id,
        contact_id: body.contact_id,
      });
    }

    // Return enriched event
    const [enrichedEvent] = await enrichEvents([googleEvent]);

    return NextResponse.json({ event: enrichedEvent }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/calendar/events:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
