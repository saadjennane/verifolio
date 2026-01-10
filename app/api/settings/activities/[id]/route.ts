import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/settings/activities/[id]
 * Supprime une activité
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Supprimer (RLS vérifie que c'est bien l'activité du user)
    const { error } = await supabase
      .from('user_activities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('DELETE activity error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/settings/activities/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/activities/[id]
 * Met à jour une activité (label_override ou is_default)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { label_override, is_default } = body;

    // Si on veut mettre cette activité par défaut
    if (is_default === true) {
      // D'abord, enlever le default de toutes les activités du user
      await supabase
        .from('user_activities')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Puis mettre celle-ci par défaut
      const { data, error } = await supabase
        .from('user_activities')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', userId)
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
        console.error('PATCH activity set default error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    // Sinon, mise à jour du label_override
    if (label_override !== undefined) {
      const { data, error } = await supabase
        .from('user_activities')
        .update({ label_override: label_override || null })
        .eq('id', id)
        .eq('user_id', userId)
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
        console.error('PATCH activity update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/settings/activities/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
