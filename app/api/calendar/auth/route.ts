import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isCalendarConnected, disconnectCalendar, storeCalendarTokens } from '@/lib/calendar/google-calendar';

// GET /api/calendar/auth - Get connection status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const connected = await isCalendarConnected();

    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Error in GET /api/calendar/auth:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/auth - Store tokens (from OAuth callback)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.access_token) {
      return NextResponse.json(
        { error: 'access_token requis' },
        { status: 400 }
      );
    }

    const stored = await storeCalendarTokens({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: body.expires_at,
      scope: body.scope,
    });

    if (!stored) {
      return NextResponse.json(
        { error: 'Impossible de sauvegarder les tokens' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/calendar/auth:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/auth - Disconnect calendar
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const disconnected = await disconnectCalendar();

    if (!disconnected) {
      return NextResponse.json(
        { error: 'Impossible de déconnecter le calendrier' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/calendar/auth:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
