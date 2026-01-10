import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setProposalVariables } from '@/lib/proposals/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/proposals/:id/variables
 * Replace all variables for a proposal
 * Body: { variables: [{ key: string, value: string }] }
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id: proposalId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    if (!Array.isArray(body.variables)) {
      return NextResponse.json(
        { error: 'variables doit être un tableau' },
        { status: 400 }
      );
    }

    const result = await setProposalVariables(
      supabase,
      user.id,
      proposalId,
      body.variables
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PUT /api/proposals/:id/variables error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
