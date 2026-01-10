import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * GET /api/settings/activities
 * Liste les activités de l'utilisateur avec les infos du job profile
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        id,
        job_profile_id,
        label_override,
        is_default,
        created_at,
        job_profile:job_profiles(id, label, category)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('GET activities error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/settings/activities error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/settings/activities
 * Ajoute une nouvelle activité (max 10)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { job_profile_id, label_override } = body;

    if (!job_profile_id) {
      return NextResponse.json(
        { error: 'job_profile_id est requis' },
        { status: 400 }
      );
    }

    // Vérifier le nombre d'activités existantes
    const { count } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count !== null && count >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 activités autorisées' },
        { status: 400 }
      );
    }

    // Vérifier que le job_profile existe
    const { data: profile } = await supabase
      .from('job_profiles')
      .select('id')
      .eq('id', job_profile_id)
      .eq('is_active', true)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil métier non trouvé' },
        { status: 404 }
      );
    }

    // Insérer l'activité (le trigger gère is_default pour la première)
    const { data, error } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        job_profile_id,
        label_override: label_override || null,
      })
      .select(`
        id,
        job_profile_id,
        label_override,
        is_default,
        created_at,
        job_profile:job_profiles(id, label, category)
      `)
      .single();

    if (error) {
      // Gérer le cas du doublon
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Cette activité est déjà ajoutée' },
          { status: 400 }
        );
      }
      console.error('POST activities error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/settings/activities error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
