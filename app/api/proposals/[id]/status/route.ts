import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setProposalStatus } from '@/lib/proposals';
import type { ProposalStatus } from '@/lib/types/proposals';

const VALID_STATUSES: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REFUSED'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/proposals/:id/status
 * Update the status of a proposal
 * Body: { status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required field
    if (!body.status) {
      return NextResponse.json(
        { error: 'status est requis' },
        { status: 400 }
      );
    }

    // Validate status value
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'status invalide (DRAFT|SENT|ACCEPTED|REFUSED)' },
        { status: 400 }
      );
    }

    const result = await setProposalStatus(supabase, user.id, id, body.status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('POST /api/proposals/:id/status error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
