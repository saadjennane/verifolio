import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getProfile,
  listReviewSelections,
  addReviewSelection,
  reorderReviewSelections,
  getAvailableReviews,
} from '@/lib/verifolio';
import type { CreateReviewSelectionInput } from '@/lib/verifolio';

// GET /api/verifolio/reviews - List review selections
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  // Check if we want available reviews (for selection UI)
  const { searchParams } = new URL(request.url);
  if (searchParams.get('available') === 'true') {
    const available = await getAvailableReviews(supabase, user.id);
    return NextResponse.json({ reviews: available });
  }

  const selections = await listReviewSelections(supabase, profile.id);

  return NextResponse.json({ selections });
}

// POST /api/verifolio/reviews - Add review to selection
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

  let body: CreateReviewSelectionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!body.review_id) {
    return NextResponse.json({ error: 'review_id requis' }, { status: 400 });
  }

  const result = await addReviewSelection(supabase, profile.id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ selection: result.data }, { status: 201 });
}

// PUT /api/verifolio/reviews - Reorder review selections
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

  const result = await reorderReviewSelections(supabase, profile.id, body.orderedIds);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
