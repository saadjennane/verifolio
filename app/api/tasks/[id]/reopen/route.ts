import { NextResponse } from 'next/server';
import { reopenTask } from '@/lib/tasks';

/**
 * POST /api/tasks/:id/reopen
 * Rouvre une tâche terminée
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await reopenTask(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data });
  } catch (error) {
    console.error('Error reopening task:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réouverture de la tâche' },
      { status: 500 }
    );
  }
}
