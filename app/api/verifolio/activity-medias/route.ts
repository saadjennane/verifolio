import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/verifolio';
import type { CreateVerifolioActivityMediaInput } from '@/lib/verifolio/types';

// GET /api/verifolio/activity-medias?activity_id=xxx - List medias for an activity
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const activityId = request.nextUrl.searchParams.get('activity_id');
  if (!activityId) {
    return NextResponse.json({ error: 'activity_id requis' }, { status: 400 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  // Verify activity belongs to user's profile
  const { data: activity } = await supabase
    .from('verifolio_activities')
    .select('id')
    .eq('id', activityId)
    .eq('profile_id', profile.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
  }

  const { data: medias, error } = await supabase
    .from('verifolio_activity_medias')
    .select('*')
    .eq('activity_id', activityId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching medias:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des médias' }, { status: 500 });
  }

  return NextResponse.json({ medias: medias || [] });
}

// POST /api/verifolio/activity-medias - Create media
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  let body: CreateVerifolioActivityMediaInput & { activity_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!body.activity_id || !body.media_type || !body.url) {
    return NextResponse.json({ error: 'activity_id, media_type et url requis' }, { status: 400 });
  }

  // Verify activity belongs to user's profile
  const { data: activity } = await supabase
    .from('verifolio_activities')
    .select('id')
    .eq('id', body.activity_id)
    .eq('profile_id', profile.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
  }

  // Get next sort_order
  const { data: maxOrderResult } = await supabase
    .from('verifolio_activity_medias')
    .select('sort_order')
    .eq('activity_id', body.activity_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = maxOrderResult && maxOrderResult.length > 0
    ? maxOrderResult[0].sort_order + 1
    : 0;

  const { data: media, error } = await supabase
    .from('verifolio_activity_medias')
    .insert({
      activity_id: body.activity_id,
      media_type: body.media_type,
      url: body.url,
      caption: body.caption || null,
      sort_order: body.sort_order ?? nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating media:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du média' }, { status: 500 });
  }

  return NextResponse.json({ media }, { status: 201 });
}

// PUT /api/verifolio/activity-medias - Reorder medias
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  let body: { activity_id: string; orderedIds: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!body.activity_id || !Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: 'activity_id et orderedIds requis' }, { status: 400 });
  }

  // Verify activity belongs to user's profile
  const { data: activity } = await supabase
    .from('verifolio_activities')
    .select('id')
    .eq('id', body.activity_id)
    .eq('profile_id', profile.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
  }

  // Update sort_order for each media
  const updates = body.orderedIds.map((id, index) =>
    supabase
      .from('verifolio_activity_medias')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('activity_id', body.activity_id)
  );

  try {
    await Promise.all(updates);
  } catch (error) {
    console.error('Error reordering medias:', error);
    return NextResponse.json({ error: 'Erreur lors du réordonnancement' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
