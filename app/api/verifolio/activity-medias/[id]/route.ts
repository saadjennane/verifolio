import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/verifolio';
import type { UpdateVerifolioActivityMediaInput } from '@/lib/verifolio/types';

// PATCH /api/verifolio/activity-medias/[id] - Update media
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

  let body: UpdateVerifolioActivityMediaInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  // Verify media belongs to user's profile (via activity)
  const { data: existingMedia } = await supabase
    .from('verifolio_activity_medias')
    .select('id, activity_id')
    .eq('id', id)
    .single();

  if (!existingMedia) {
    return NextResponse.json({ error: 'Média non trouvé' }, { status: 404 });
  }

  const { data: activity } = await supabase
    .from('verifolio_activities')
    .select('id')
    .eq('id', existingMedia.activity_id)
    .eq('profile_id', profile.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (body.media_type !== undefined) updateData.media_type = body.media_type;
  if (body.url !== undefined) updateData.url = body.url;
  if (body.caption !== undefined) updateData.caption = body.caption;
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
  }

  const { data: media, error } = await supabase
    .from('verifolio_activity_medias')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du média' }, { status: 500 });
  }

  return NextResponse.json({ media });
}

// DELETE /api/verifolio/activity-medias/[id] - Delete media
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

  // Verify media belongs to user's profile (via activity)
  const { data: existingMedia } = await supabase
    .from('verifolio_activity_medias')
    .select('id, activity_id')
    .eq('id', id)
    .single();

  if (!existingMedia) {
    return NextResponse.json({ error: 'Média non trouvé' }, { status: 404 });
  }

  const { data: activity } = await supabase
    .from('verifolio_activities')
    .select('id')
    .eq('id', existingMedia.activity_id)
    .eq('profile_id', profile.id)
    .single();

  if (!activity) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  const { error } = await supabase
    .from('verifolio_activity_medias')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du média' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
