import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refuseProposalByToken } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/public/proposals/:token/refuse
 * Refuse a proposal (public access)
 * Body: { reason?: string }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = await createClient();

    // Parse optional reason from body
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON - that's OK, reason is optional
    }

    const result = await refuseProposalByToken(supabase, token, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, status: result.status },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('POST /api/public/proposals/:token/refuse error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
