import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProposal, updateProposal, deleteProposal } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/:id
 * Get a proposal with its relations (client, template, recipients)
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const proposal = await getProposal(supabase, user.id, id);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ data: proposal });
  } catch (error) {
    console.error('GET /api/proposals/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/proposals/:id
 * Update a proposal (title, status, theme_override)
 * Body: { title?, status?, theme_override? }
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    const result = await updateProposal(supabase, user.id, id, {
      title: body.title,
      status: body.status,
      theme_override: body.theme_override,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PUT /api/proposals/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/proposals/:id
 * Partial update a proposal
 * Body: { title?, theme_override? }
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    const result = await updateProposal(supabase, user.id, id, {
      title: body.title,
      theme_override: body.theme_override,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PATCH /api/proposals/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/:id
 * Delete a proposal
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const result = await deleteProposal(supabase, user.id, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/proposals/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
