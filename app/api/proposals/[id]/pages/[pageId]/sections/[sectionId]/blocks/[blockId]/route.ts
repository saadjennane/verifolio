import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

interface RouteParams {
  params: Promise<{ id: string; pageId: string; sectionId: string; blockId: string }>;
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
 * Vérifie que le bloc appartient à l'utilisateur
 */
async function verifyBlockAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
  pageId: string,
  sectionId: string,
  blockId: string,
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

  if (!section) return false;

  // Vérifier que le bloc existe
  const { data: block } = await supabase
    .from('proposal_blocks')
    .select('id')
    .eq('id', blockId)
    .eq('section_id', sectionId)
    .single();

  return !!block;
}

/**
 * PATCH /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks/[blockId]
 * Met à jour un bloc
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId, sectionId, blockId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const hasAccess = await verifyBlockAccess(supabase, proposalId, pageId, sectionId, blockId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Bloc non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Mise à jour du type
    if (body.type !== undefined) {
      if (!VALID_BLOCK_TYPES.includes(body.type as BlockType)) {
        return NextResponse.json(
          { error: `Type de bloc invalide. Types autorisés: ${VALID_BLOCK_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.type = body.type;
    }

    // Mise à jour du contenu
    if (body.content !== undefined) {
      updates.content = body.content;
    }

    // Mise à jour du sort_order
    if (body.sort_order !== undefined) {
      updates.sort_order = parseInt(body.sort_order, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('proposal_blocks')
      .update(updates)
      .eq('id', blockId)
      .select()
      .single();

    if (error) {
      console.error('PATCH block error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks/[blockId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks/[blockId]
 * Supprime un bloc
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: proposalId, pageId, sectionId, blockId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const hasAccess = await verifyBlockAccess(supabase, proposalId, pageId, sectionId, blockId, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Bloc non trouvé' }, { status: 404 });
    }

    const { error } = await supabase
      .from('proposal_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('DELETE block error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/proposals/[id]/pages/[pageId]/sections/[sectionId]/blocks/[blockId] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
