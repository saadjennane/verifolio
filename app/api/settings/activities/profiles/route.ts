import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * GET /api/settings/activities/profiles
 * Liste tous les job profiles disponibles pour sélection
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('job_profiles')
      .select('id, label, category')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      console.error('GET profiles error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/settings/activities/profiles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
