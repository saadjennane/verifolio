import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/verifolio';
import type { CreateVerifolioCTAInput, VerifolioCTA } from '@/lib/verifolio/types';

const MAX_CTAS = 8;

// GET /api/verifolio/ctas - List CTAs
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  const { data: ctas, error } = await supabase
    .from('verifolio_ctas')
    .select('*')
    .eq('profile_id', profile.id)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching CTAs:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des CTAs' }, { status: 500 });
  }

  return NextResponse.json({ ctas: ctas || [] });
}

// POST /api/verifolio/ctas - Create CTA
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

  // Check current CTA count
  const { count } = await supabase
    .from('verifolio_ctas')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profile.id);

  if (count !== null && count >= MAX_CTAS) {
    return NextResponse.json({ error: `Maximum ${MAX_CTAS} CTAs autorisés` }, { status: 400 });
  }

  let body: CreateVerifolioCTAInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!body.label || !body.url) {
    return NextResponse.json({ error: 'label et url requis' }, { status: 400 });
  }

  // Get next sort_order
  const { data: maxOrderResult } = await supabase
    .from('verifolio_ctas')
    .select('sort_order')
    .eq('profile_id', profile.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = maxOrderResult && maxOrderResult.length > 0
    ? maxOrderResult[0].sort_order + 1
    : 0;

  const { data: cta, error } = await supabase
    .from('verifolio_ctas')
    .insert({
      profile_id: profile.id,
      label: body.label,
      url: body.url,
      icon: body.icon || null,
      variant: body.variant || 'secondary',
      sort_order: body.sort_order ?? nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating CTA:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du CTA' }, { status: 500 });
  }

  return NextResponse.json({ cta }, { status: 201 });
}

// PUT /api/verifolio/ctas - Reorder CTAs
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

  let body: { orderedIds: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: 'orderedIds requis' }, { status: 400 });
  }

  // Update sort_order for each CTA
  const updates = body.orderedIds.map((id, index) =>
    supabase
      .from('verifolio_ctas')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('profile_id', profile.id)
  );

  try {
    await Promise.all(updates);
  } catch (error) {
    console.error('Error reordering CTAs:', error);
    return NextResponse.json({ error: 'Erreur lors du réordonnancement' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
