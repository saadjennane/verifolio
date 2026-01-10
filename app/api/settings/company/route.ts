import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { getCompany, upsertCompany } from '@/lib/settings';

/**
 * GET /api/settings/company
 * Get the current user's company settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const company = await getCompany(supabase, userId);

    return NextResponse.json({ data: company });
  } catch (error) {
    console.error('GET /api/settings/company error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/company
 * Create or update the current user's company settings
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const result = await upsertCompany(supabase, userId, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PUT /api/settings/company error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
