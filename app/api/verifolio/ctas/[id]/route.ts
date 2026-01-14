import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/verifolio';
import type { UpdateVerifolioCTAInput } from '@/lib/verifolio/types';

// PATCH /api/verifolio/ctas/[id] - Update CTA
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  let body: UpdateVerifolioCTAInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (body.label !== undefined) updateData.label = body.label;
  if (body.url !== undefined) updateData.url = body.url;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.variant !== undefined) updateData.variant = body.variant;
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
  }

  const { data: cta, error } = await supabase
    .from('verifolio_ctas')
    .update(updateData)
    .eq('id', id)
    .eq('profile_id', profile.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating CTA:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du CTA' }, { status: 500 });
  }

  if (!cta) {
    return NextResponse.json({ error: 'CTA non trouvé' }, { status: 404 });
  }

  return NextResponse.json({ cta });
}

// DELETE /api/verifolio/ctas/[id] - Delete CTA
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  const { error } = await supabase
    .from('verifolio_ctas')
    .delete()
    .eq('id', id)
    .eq('profile_id', profile.id);

  if (error) {
    console.error('Error deleting CTA:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du CTA' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
