import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProposalSection } from '@/lib/proposals/proposals';

interface RouteContext {
  params: Promise<{ id: string; sectionId: string }>;
}

/**
 * PATCH /api/proposals/:id/sections/:sectionId
 * Update a proposal section
 * Body: { title?, body?, position?, is_enabled? }
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: proposalId, sectionId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify the section belongs to the proposal
    const { data: section } = await supabase
      .from('proposal_sections')
      .select('id, proposal_id')
      .eq('id', sectionId)
      .eq('proposal_id', proposalId)
      .single();

    if (!section) {
      return NextResponse.json({ error: 'Section non trouvée' }, { status: 404 });
    }

    const body = await request.json();

    const result = await updateProposalSection(supabase, user.id, sectionId, {
      title: body.title,
      body: body.body,
      position: body.position,
      is_enabled: body.is_enabled,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/proposals/:id/sections/:sectionId error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
