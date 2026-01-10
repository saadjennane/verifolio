import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listProposalComments, addProposalCommentUser } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/:id/comments
 * List all comments for a proposal
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const comments = await listProposalComments(supabase, user.id, id);

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('GET /api/proposals/:id/comments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/:id/comments
 * Add a user comment to a proposal
 * Body: { sectionId?: string, body: string }
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
    if (!body.body || typeof body.body !== 'string' || body.body.trim() === '') {
      return NextResponse.json(
        { error: 'body est requis et ne peut pas être vide' },
        { status: 400 }
      );
    }

    const result = await addProposalCommentUser(
      supabase,
      user.id,
      id,
      body.sectionId || null,
      body.body.trim()
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.comment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals/:id/comments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
