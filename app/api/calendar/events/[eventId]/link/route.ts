import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { linkEvent, getLinkByGoogleEvent, deleteLink, updateCachedEventMetadata } from '@/lib/calendar/calendar-links';
import { getEvent } from '@/lib/calendar/google-calendar';
import type { LinkEventPayload } from '@/lib/calendar/types';

// GET /api/calendar/events/[eventId]/link - Get link for an event
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
    const link = await getLinkByGoogleEvent(eventId);

    if (!link) {
      return NextResponse.json({ link: null });
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error in GET /api/calendar/events/[eventId]/link:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/calendar/events/[eventId]/link - Create or update link
export async function PUT(
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
    const body: Omit<LinkEventPayload, 'google_event_id'> = await request.json();

    const payload: LinkEventPayload = {
      google_event_id: eventId,
      google_calendar_id: body.google_calendar_id || 'primary',
      mission_id: body.mission_id,
      deal_id: body.deal_id,
      client_id: body.client_id,
      supplier_id: body.supplier_id,
      contact_id: body.contact_id,
    };

    const link = await linkEvent(payload);

    if (!link) {
      return NextResponse.json(
        { error: 'Impossible de créer le lien' },
        { status: 400 }
      );
    }

    // Also update cached metadata from Google
    const googleEvent = await getEvent(eventId, payload.google_calendar_id || 'primary');
    if (googleEvent) {
      await updateCachedEventMetadata(eventId, googleEvent);
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error in PUT /api/calendar/events/[eventId]/link:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/events/[eventId]/link - Remove link
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
    const deleted = await deleteLink(eventId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Impossible de supprimer le lien' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/calendar/events/[eventId]/link:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
