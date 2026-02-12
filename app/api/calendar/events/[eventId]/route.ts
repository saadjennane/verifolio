import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEvent, updateEvent, deleteEvent as deleteGoogleEvent } from '@/lib/calendar/google-calendar';
import { enrichEvents, deleteLink } from '@/lib/calendar/calendar-links';
import type { UpdateCalendarEventPayload } from '@/lib/calendar/types';

// GET /api/calendar/events/[eventId] - Get a single event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId') || 'primary';

    const googleEvent = await getEvent(eventId, calendarId);

    if (!googleEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    // Enrich with Verifolio data
    const [enrichedEvent] = await enrichEvents([googleEvent]);

    return NextResponse.json({ event: enrichedEvent });
  } catch (error) {
    console.error('Error in GET /api/calendar/events/[eventId]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PATCH /api/calendar/events/[eventId] - Update an event
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { eventId } = await context.params;
    const body: UpdateCalendarEventPayload = await request.json();
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId') || 'primary';

    const updatedEvent = await updateEvent(eventId, body, calendarId);

    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Impossible de mettre à jour l\'événement' },
        { status: 400 }
      );
    }

    // Return enriched event
    const [enrichedEvent] = await enrichEvents([updatedEvent]);

    return NextResponse.json({ event: enrichedEvent });
  } catch (error) {
    console.error('Error in PATCH /api/calendar/events/[eventId]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/events/[eventId] - Delete an event
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId') || 'primary';

    const deleted = await deleteGoogleEvent(eventId, calendarId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Impossible de supprimer l\'événement' },
        { status: 400 }
      );
    }

    // Also delete the Verifolio link if it exists
    await deleteLink(eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/calendar/events/[eventId]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
