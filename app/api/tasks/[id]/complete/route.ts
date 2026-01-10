import { NextResponse } from 'next/server';
import { completeTask } from '@/lib/tasks';

/**
 * POST /api/tasks/:id/complete
 * Marque une tâche comme terminée
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await completeTask(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la complétion de la tâche' },
      { status: 500 }
    );
  }
}
