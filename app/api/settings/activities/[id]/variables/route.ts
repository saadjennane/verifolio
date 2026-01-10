import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Convertit un label en key snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

/**
 * GET /api/settings/activities/[id]/variables
 * Liste les variables d'une activité
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: activityId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'activité appartient au user
    const { data: activity } = await supabase
      .from('user_activities')
      .select('id')
      .eq('id', activityId)
      .eq('user_id', userId)
      .single();

    if (!activity) {
      return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('user_activity_variables')
      .select('*')
      .eq('activity_id', activityId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET variables error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/settings/activities/[id]/variables error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/settings/activities/[id]/variables
 * Ajoute une nouvelle variable à l'activité
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: activityId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'activité appartient au user
    const { data: activity } = await supabase
      .from('user_activities')
      .select('id')
      .eq('id', activityId)
      .eq('user_id', userId)
      .single();

    if (!activity) {
      return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { label, type } = body;

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Le label est requis' }, { status: 400 });
    }

    // Valider le type
    const validTypes = ['text', 'number', 'date_or_period'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Type invalide. Valeurs acceptées : text, number, date_or_period' },
        { status: 400 }
      );
    }

    // Vérifier le nombre de variables existantes
    const { count } = await supabase
      .from('user_activity_variables')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId);

    if (count !== null && count >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 variables par activité' },
        { status: 400 }
      );
    }

    // Générer la key depuis le label
    const baseKey = toSnakeCase(label.trim());
    let key = baseKey;
    let suffix = 1;

    // Vérifier l'unicité de la key
    while (true) {
      const { data: existing } = await supabase
        .from('user_activity_variables')
        .select('id')
        .eq('activity_id', activityId)
        .eq('key', key)
        .single();

      if (!existing) break;
      key = `${baseKey}_${suffix}`;
      suffix++;
    }

    // Calculer le sort_order (dernier + 1)
    const { data: lastVar } = await supabase
      .from('user_activity_variables')
      .select('sort_order')
      .eq('activity_id', activityId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastVar?.sort_order ?? -1) + 1;

    // Insérer la variable
    const { data, error } = await supabase
      .from('user_activity_variables')
      .insert({
        user_id: userId,
        activity_id: activityId,
        key,
        label: label.trim(),
        type,
        source: 'custom',
        is_active: true,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('POST variable error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/settings/activities/[id]/variables error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
