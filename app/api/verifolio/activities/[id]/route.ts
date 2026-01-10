import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getActivity,
  updateActivity,
  deleteActivity,
} from '@/lib/verifolio';
import type { UpdateVerifolioActivityInput } from '@/lib/verifolio';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/verifolio/activities/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const activity = await getActivity(supabase, id);
  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
  }

  // Check ownership
  if (activity.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  return NextResponse.json({ activity });
}

// PATCH /api/verifolio/activities/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Check ownership
  const activity = await getActivity(supabase, id);
  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
  }
  if (activity.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  let body: UpdateVerifolioActivityInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const result = await updateActivity(supabase, id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ activity: result.data });
}

// DELETE /api/verifolio/activities/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Check ownership
  const activity = await getActivity(supabase, id);
  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
  }
  if (activity.user_id !== user.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const result = await deleteActivity(supabase, id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
