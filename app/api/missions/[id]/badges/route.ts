import { NextResponse } from 'next/server';
import { addMissionBadge, removeMissionBadge } from '@/lib/missions';

/**
 * POST /api/missions/:id/badges
 * Ajoute un badge à une mission
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { badge, variant } = body;

    if (!badge) {
      return NextResponse.json(
        { error: 'Le badge est requis' },
        { status: 400 }
      );
    }

    const result = await addMissionBadge(id, badge, variant);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ badge: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error adding badge:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du badge' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/missions/:id/badges
 * Retire un badge d'une mission
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const badge = url.searchParams.get('badge');

    if (!badge) {
      return NextResponse.json(
        { error: 'Le badge est requis' },
        { status: 400 }
      );
    }

    const result = await removeMissionBadge(id, badge);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing badge:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du badge' },
      { status: 500 }
    );
  }
}
