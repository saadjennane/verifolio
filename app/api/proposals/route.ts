import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listProposals, createProposal, createProposalFromStructure } from '@/lib/proposals';
import type { ProposalStatus } from '@/lib/types/proposals';

const VALID_STATUSES: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REFUSED'];

/**
 * GET /api/proposals
 * List all proposals for the current user
 * Query params: clientId?, status?, dealId?
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || undefined;
    const dealId = searchParams.get('dealId') || undefined;
    const status = searchParams.get('status') as ProposalStatus | null;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'status invalide (DRAFT|SENT|ACCEPTED|REFUSED)' },
        { status: 400 }
      );
    }

    const proposals = await listProposals(supabase, user.id, {
      client_id: clientId,
      deal_id: dealId,
      status: status || undefined,
    });

    return NextResponse.json({ data: proposals });
  } catch (error) {
    console.error('GET /api/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/proposals
 * Create a new proposal
 *
 * Mode 1 (legacy): { deal_id, client_id, template_id, title? }
 * Mode 2 (structure): { structure_template_id, design_preset_id?, title?, deal_id?, client_id? }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Mode 2: Création depuis un template de structure
    if (body.structure_template_id) {
      const result = await createProposalFromStructure(supabase, user.id, {
        structure_template_id: body.structure_template_id,
        design_preset_id: body.design_preset_id,
        title: body.title,
        deal_id: body.deal_id,
        client_id: body.client_id,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ data: result.data }, { status: 201 });
    }

    // Mode 1 (legacy): Création depuis un design template
    // Validate required fields
    if (!body.deal_id) {
      return NextResponse.json(
        { error: 'deal_id est requis' },
        { status: 400 }
      );
    }

    if (!body.client_id) {
      return NextResponse.json(
        { error: 'client_id est requis' },
        { status: 400 }
      );
    }

    if (!body.template_id) {
      return NextResponse.json(
        { error: 'template_id est requis' },
        { status: 400 }
      );
    }

    const result = await createProposal(supabase, user.id, {
      deal_id: body.deal_id,
      client_id: body.client_id,
      template_id: body.template_id,
      title: body.title,
      theme_override: body.theme_override,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
