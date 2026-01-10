import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTemplateFromProposal } from '@/lib/proposals/templates';

/**
 * POST /api/proposals/templates/from-proposal
 * Create a new template from an existing proposal's sections
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifie' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { proposalId, name, description, isDefault } = body;

    if (!proposalId || !name) {
      return NextResponse.json(
        { success: false, error: 'proposalId et name sont requis' },
        { status: 400 }
      );
    }

    const result = await createTemplateFromProposal(
      supabase,
      user.id,
      proposalId,
      name,
      description,
      isDefault
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating template from proposal:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
