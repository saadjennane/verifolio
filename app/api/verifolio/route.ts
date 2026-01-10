import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getProfile,
  createProfile,
  updateProfile,
} from '@/lib/verifolio';
import type { CreateVerifolioProfileInput, UpdateVerifolioProfileInput } from '@/lib/verifolio';

// GET /api/verifolio - Get current user's profile
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);

  return NextResponse.json({ profile });
}

// POST /api/verifolio - Create profile
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: CreateVerifolioProfileInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!body.display_name) {
    return NextResponse.json({ error: 'display_name requis' }, { status: 400 });
  }

  const result = await createProfile(supabase, user.id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ profile: result.data }, { status: 201 });
}

// PATCH /api/verifolio - Update profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: UpdateVerifolioProfileInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const result = await updateProfile(supabase, user.id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ profile: result.data });
}
