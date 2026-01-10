import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]/pages
 * Liste toutes les pages d'une proposition (nouvelle structure sans sections)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
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

    // Récupérer les pages avec le nouveau format (content direct)
    const { data: pages, error } = await supabase
      .from('proposal_pages')
      .select(`
        id,
        title,
        sort_order,
        content,
        is_visible,
        is_cover,
        created_at
      `)
      .eq('proposal_id', proposalId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET pages error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trier: cover first, then by sort_order
    const sortedPages = (pages || []).sort((a, b) => {
      if (a.is_cover) return -1;
      if (b.is_cover) return 1;
      return a.sort_order - b.sort_order;
    });

    return NextResponse.json({ data: sortedPages });
  } catch (error) {
    console.error('GET /api/proposals/[id]/pages error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/[id]/pages
 * Crée une nouvelle page (nouvelle structure avec content direct)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId } = await params;
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

    const body = await request.json();
    const {
      title = 'Nouvelle page',
      content = { type: 'doc', content: [{ type: 'paragraph' }] },
      is_cover = false,
      is_visible = true,
      sort_order,
    } = body;

    // Calculer le sort_order si non fourni
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined) {
      const { data: lastPage } = await supabase
        .from('proposal_pages')
        .select('sort_order')
        .eq('proposal_id', proposalId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      finalSortOrder = (lastPage?.sort_order ?? -1) + 1;
    }

    // Créer la page avec content direct
    const { data: page, error } = await supabase
      .from('proposal_pages')
      .insert({
        proposal_id: proposalId,
        title,
        sort_order: finalSortOrder,
        content,
        is_cover,
        is_visible,
      })
      .select()
      .single();

    if (error) {
      console.error('POST page error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: page }, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals/[id]/pages error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
