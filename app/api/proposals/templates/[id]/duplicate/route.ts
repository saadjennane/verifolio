import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { duplicateProposalTemplate } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/proposals/templates/:id/duplicate
 * Duplicate a template (including system templates)
 * Body: { name?: string }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const result = await duplicateProposalTemplate(
      supabase,
      user.id,
      id,
      body.name
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('POST /api/proposals/templates/:id/duplicate error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
