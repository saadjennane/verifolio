import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addProposalCommentClient, listProposalCommentsByToken } from '@/lib/proposals';

// Simple in-memory rate limiting (resets on server restart)
// In production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 comments per minute per token

function checkRateLimit(token: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(token);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(token, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/public/proposals/:token/comments
 * List all comments for a proposal (public access)
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = await createClient();

    const comments = await listProposalCommentsByToken(supabase, token);

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('GET /api/public/proposals/:token/comments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/public/proposals/:token/comments
 * Add a client comment to a proposal (public access)
 * Body: { sectionId?: string, authorName?: string, body: string }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    // Rate limiting
    if (!checkRateLimit(token)) {
      return NextResponse.json(
        { error: 'Trop de commentaires. Veuillez patienter.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate required field
    if (!body.body || typeof body.body !== 'string') {
      return NextResponse.json(
        { error: 'Le commentaire est requis' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const result = await addProposalCommentClient(
      supabase,
      token,
      body.sectionId || null,
      body.authorName || null,
      body.body
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.comment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/public/proposals/:token/comments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
