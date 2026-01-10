import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProposalFromDeal, listProposals } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/deals/:id/proposals
 * List proposals for a deal
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const proposals = await listProposals(supabase, user.id, { deal_id: dealId });

    return NextResponse.json({ data: proposals });
  } catch (error) {
    console.error('GET /api/deals/:id/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/deals/:id/proposals
 * Create a new proposal from a deal
 * Body: { template_id: string, title?: string }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.template_id) {
      return NextResponse.json(
        { error: 'template_id est requis' },
        { status: 400 }
      );
    }

    const result = await createProposalFromDeal(
      supabase,
      user.id,
      dealId,
      body.template_id,
      body.title
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/deals/:id/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
