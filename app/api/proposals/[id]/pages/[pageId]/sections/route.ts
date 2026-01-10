import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string; pageId: string }>;
}

/**
 * Vérifie que la page appartient à l'utilisateur
 */
async function verifyPageAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
  pageId: string,
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

  return !!page;
}

/**
 * GET /api/proposals/[id]/pages/[pageId]/sections
 * Liste les sections d'une page avec leurs blocs
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const hasAccess = await verifyPageAccess(supabase, proposalId, pageId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Page non trouvée' }, { status: 404 });
    }

    const { data: sections, error } = await supabase
      .from('proposal_page_sections')
      .select(`
        id,
        title,
        is_highlighted,
        sort_order,
        blocks:proposal_blocks(
          id,
          type,
          content,
          sort_order
        )
      `)
      .eq('page_id', pageId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET sections error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trier les blocs côté client
    const sortedSections = sections?.map(section => ({
      ...section,
      blocks: section.blocks?.sort((a, b) => a.sort_order - b.sort_order)
    }));

    return NextResponse.json({ data: sortedSections });
  } catch (error) {
    console.error('GET /api/proposals/[id]/pages/[pageId]/sections error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/[id]/pages/[pageId]/sections
 * Crée une nouvelle section
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const hasAccess = await verifyPageAccess(supabase, proposalId, pageId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Page non trouvée' }, { status: 404 });
    }

    const body = await request.json();
    const { title = 'Nouvelle section', is_highlighted = false } = body;

    // Calculer le sort_order
    const { data: lastSection } = await supabase
      .from('proposal_page_sections')
      .select('sort_order')
      .eq('page_id', pageId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastSection?.sort_order ?? -1) + 1;

    // Créer la section
    const { data: section, error } = await supabase
      .from('proposal_page_sections')
      .insert({
        page_id: pageId,
        title,
        is_highlighted,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('POST section error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Créer un bloc texte par défaut
    await supabase
      .from('proposal_blocks')
      .insert({
        section_id: section.id,
        type: 'text',
        content: { html: '<p>Contenu de la section...</p>' },
        sort_order: 0,
      });

    return NextResponse.json({ data: section }, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals/[id]/pages/[pageId]/sections error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
