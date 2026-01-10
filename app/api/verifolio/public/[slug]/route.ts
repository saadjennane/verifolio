import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPublicProfile } from '@/lib/verifolio';

interface Params {
  params: Promise<{ slug: string }>;
}

// GET /api/verifolio/public/[slug] - Get public profile
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();

  const profile = await getPublicProfile(supabase, slug);

  if (!profile) {
    return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}
