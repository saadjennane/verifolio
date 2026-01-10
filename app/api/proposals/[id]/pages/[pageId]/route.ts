import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string; pageId: string }>;
}

/**
 * PATCH /api/proposals/[id]/pages/[pageId]
 * Met à jour une page (titre, sort_order)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que la proposition appartient à l'utilisateur
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .eq('owner_user_id', userId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    // Vérifier que la page existe
    const { data: page } = await supabase
      .from('proposal_pages')
      .select('id')
      .eq('id', pageId)
      .eq('proposal_id', proposalId)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Page non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      updates.title = body.title?.trim() || 'Page sans titre';
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = parseInt(body.sort_order, 10);
    }

    if (body.content !== undefined) {
      updates.content = body.content;
    }

    if (body.is_visible !== undefined) {
      updates.is_visible = body.is_visible;
    }

    if (body.is_cover !== undefined) {
      updates.is_cover = body.is_cover;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('proposal_pages')
      .update(updates)
      .eq('id', pageId)
      .select()
      .single();

    if (error) {
      console.error('PATCH page error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/proposals/[id]/pages/[pageId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/[id]/pages/[pageId]
 * Supprime une page
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que la proposition appartient à l'utilisateur
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .eq('owner_user_id', userId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: 'Proposition non trouvée' }, { status: 404 });
    }

    // Vérifier que la page existe
    const { data: page } = await supabase
      .from('proposal_pages')
      .select('id, is_cover')
      .eq('id', pageId)
      .eq('proposal_id', proposalId)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Page non trouvée' }, { status: 404 });
    }

    // Empêcher la suppression de la page cover
    if (page.is_cover) {
      return NextResponse.json(
        { error: 'Impossible de supprimer la page de couverture' },
        { status: 400 }
      );
    }

    // Vérifier qu'il reste au moins une page
    const { count } = await supabase
      .from('proposal_pages')
      .select('*', { count: 'exact', head: true })
      .eq('proposal_id', proposalId);

    if (count !== null && count <= 1) {
      return NextResponse.json(
        { error: 'Impossible de supprimer la dernière page' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('proposal_pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      console.error('DELETE page error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/proposals/[id]/pages/[pageId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
