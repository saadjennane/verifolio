import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrefillContext } from '@/lib/calendar/calendar-links';
import type { CalendarEntityType } from '@/lib/calendar/types';

// GET /api/calendar/prefill - Get pre-fill context for creating event from entity
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

    const context = await getPrefillContext(entityType, entityId);

    return NextResponse.json({ context });
  } catch (error) {
    console.error('Error in GET /api/calendar/prefill:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
