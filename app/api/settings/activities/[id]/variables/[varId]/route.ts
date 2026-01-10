import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string; varId: string }>;
}

/**
 * PATCH /api/settings/activities/[id]/variables/[varId]
 * Met à jour une variable
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: activityId, varId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que la variable appartient au user via l'activité
    const { data: variable } = await supabase
      .from('user_activity_variables')
      .select('*, activity:user_activities!inner(user_id)')
      .eq('id', varId)
      .eq('activity_id', activityId)
      .single();

    if (!variable || (variable.activity as { user_id: string }).user_id !== userId) {
      return NextResponse.json({ error: 'Variable non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Mise à jour du label
    if (body.label !== undefined) {
      if (!body.label?.trim()) {
        return NextResponse.json({ error: 'Le label ne peut pas être vide' }, { status: 400 });
      }
      updates.label = body.label.trim();
    }

    // Mise à jour du type
    if (body.type !== undefined) {
      const validTypes = ['text', 'number', 'date_or_period'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: 'Type invalide. Valeurs acceptées : text, number, date_or_period' },
          { status: 400 }
        );
      }
      updates.type = body.type;
    }

    // Mise à jour de is_active
    if (body.is_active !== undefined) {
      updates.is_active = !!body.is_active;
    }

    // Mise à jour du sort_order
    if (body.sort_order !== undefined) {
      updates.sort_order = parseInt(body.sort_order, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_activity_variables')
      .update(updates)
      .eq('id', varId)
      .select()
      .single();

    if (error) {
      console.error('PATCH variable error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/settings/activities/[id]/variables/[varId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/activities/[id]/variables/[varId]
 * Supprime une variable
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: activityId, varId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que la variable appartient au user
    const { data: variable } = await supabase
      .from('user_activity_variables')
      .select('*, activity:user_activities!inner(user_id)')
      .eq('id', varId)
      .eq('activity_id', activityId)
      .single();

    if (!variable || (variable.activity as { user_id: string }).user_id !== userId) {
      return NextResponse.json({ error: 'Variable non trouvée' }, { status: 404 });
    }

    const { error } = await supabase
      .from('user_activity_variables')
      .delete()
      .eq('id', varId);

    if (error) {
      console.error('DELETE variable error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/settings/activities/[id]/variables/[varId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
