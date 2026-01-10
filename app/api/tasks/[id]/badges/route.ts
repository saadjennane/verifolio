import { NextResponse } from 'next/server';
import { addTaskBadge, removeTaskBadge } from '@/lib/tasks/tasks';

/**
 * POST /api/tasks/[id]/badges
 * Ajouter un badge à une tâche
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { badge, variant } = await request.json();

    if (!badge) {
      return NextResponse.json({ error: 'Badge name required' }, { status: 400 });
    }

    const result = await addTaskBadge(id, badge, variant);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding task badge:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id]/badges?badge=BADGE_NAME
 * Retirer un badge d'une tâche
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const badge = searchParams.get('badge');

  if (!badge) {
    return NextResponse.json({ error: 'Badge name required' }, { status: 400 });
  }

  try {
    const result = await removeTaskBadge(id, badge);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing task badge:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
