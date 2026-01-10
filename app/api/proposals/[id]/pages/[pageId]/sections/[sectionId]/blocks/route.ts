import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string; pageId: string; sectionId: string }>;
}

// Types de blocs autorisés
const VALID_BLOCK_TYPES = [
  'text',
  'text_two_columns',
  'image',
  'video',
  'image_text_left',
  'image_text_right',
  'table',
  'separator',
] as const;

type BlockType = typeof VALID_BLOCK_TYPES[number];

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
 * GET /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks
 * Liste les blocs d'une section
 */
export async function GET(request: Request, { params }: RouteParams) {
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

    const { data: blocks, error } = await supabase
      .from('proposal_blocks')
      .select('id, type, content, sort_order')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('GET blocks error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: blocks });
  } catch (error) {
    console.error('GET /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks
 * Crée un nouveau bloc
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    const { type, content = {} } = body;

    // Valider le type de bloc
    if (!type || !VALID_BLOCK_TYPES.includes(type as BlockType)) {
      return NextResponse.json(
        { error: `Type de bloc invalide. Types autorisés: ${VALID_BLOCK_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculer le sort_order
    const { data: lastBlock } = await supabase
      .from('proposal_blocks')
      .select('sort_order')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastBlock?.sort_order ?? -1) + 1;

    // Contenu par défaut selon le type
    const defaultContent = getDefaultContent(type as BlockType);

    const { data: block, error } = await supabase
      .from('proposal_blocks')
      .insert({
        section_id: sectionId,
        type,
        content: { ...defaultContent, ...content },
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('POST block error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: block }, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * Retourne le contenu par défaut pour un type de bloc
 */
function getDefaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'text':
      return { html: '<p></p>' };
    case 'text_two_columns':
      return { left: '<p></p>', right: '<p></p>' };
    case 'image':
      return { url: '', alt: '' };
    case 'video':
      return { url: '', provider: 'youtube' };
    case 'image_text_left':
      return { image: { url: '', alt: '' }, text: '<p></p>' };
    case 'image_text_right':
      return { text: '<p></p>', image: { url: '', alt: '' } };
    case 'table':
      return { rows: [['']] };
    case 'separator':
      return {};
    default:
      return {};
  }
}
