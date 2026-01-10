import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptProposalByToken } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/public/proposals/:token/accept
 * Accept a proposal (public access)
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = await createClient();

    const result = await acceptProposalByToken(supabase, token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('POST /api/public/proposals/:token/accept error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
