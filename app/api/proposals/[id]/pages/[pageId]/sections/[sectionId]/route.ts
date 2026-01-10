import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string; pageId: string; sectionId: string }>;
}

/**
 * Vérifie que la section appartient à l'utilisateur
 */
async function verifySectionAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
  pageId: string,
  sectionId: string,
  userId: string
) {
  // Vérifier que la proposition appartient à l'utilisateur
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .eq('owner_user_id', userId)
    .single();

  if (!proposal) return false;

  // Vérifier que la page existe
  const { data: page } = await supabase
    .from('proposal_pages')
    .select('id')
    .eq('id', pageId)
    .eq('proposal_id', proposalId)
    .single();

  if (!page) return false;

  // Vérifier que la section existe
  const { data: section } = await supabase
    .from('proposal_page_sections')
    .select('id')
    .eq('id', sectionId)
    .eq('page_id', pageId)
    .single();

  return !!section;
}

/**
 * PATCH /api/proposals/[id]/pages/[pageId]/sections/[sectionId]
 * Met à jour une section
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId, sectionId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const hasAccess = await verifySectionAccess(supabase, proposalId, pageId, sectionId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Section non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      updates.title = body.title?.trim() || 'Section';
    }

    if (body.is_highlighted !== undefined) {
      updates.is_highlighted = !!body.is_highlighted;
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = parseInt(body.sort_order, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('proposal_page_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()
      .single();

    if (error) {
      console.error('PATCH section error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/proposals/[id]/pages/[pageId]/sections/[sectionId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/[id]/pages/[pageId]/sections/[sectionId]
 * Supprime une section
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId, sectionId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const hasAccess = await verifySectionAccess(supabase, proposalId, pageId, sectionId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Section non trouvée' }, { status: 404 });
    }

    // Vérifier qu'il reste au moins une section dans la page
    const { count } = await supabase
      .from('proposal_page_sections')
      .select('*', { count: 'exact', head: true })
      .eq('page_id', pageId);

    if (count !== null && count <= 1) {
      return NextResponse.json(
        { error: 'Impossible de supprimer la dernière section' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('proposal_page_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      console.error('DELETE section error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/proposals/[id]/pages/[pageId]/sections/[sectionId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
