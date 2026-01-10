import { NextResponse } from 'next/server';
import { addDealTag, removeDealTag } from '@/lib/deals';

/**
 * POST /api/deals/:id/tags
 * Ajoute un tag à un deal
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { tag, color } = body;

    if (!tag) {
      return NextResponse.json(
        { error: 'Le tag est requis' },
        { status: 400 }
      );
    }

    const result = await addDealTag(id, tag, color);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ tag: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error adding tag:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du tag' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deals/:id/tags
 * Retire un tag d'un deal
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const tag = url.searchParams.get('tag');

    if (!tag) {
      return NextResponse.json(
        { error: 'Le tag est requis' },
        { status: 400 }
      );
    }

    const result = await removeDealTag(id, tag);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing tag:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du tag' },
      { status: 500 }
    );
  }
}
