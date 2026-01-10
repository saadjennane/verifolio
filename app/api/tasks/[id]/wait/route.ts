import { NextResponse } from 'next/server';
import { updateTask } from '@/lib/tasks/tasks';

/**
 * POST /api/tasks/[id]/wait
 * Mettre une tâche en attente avec raison optionnelle
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Parse body pour récupérer wait_reason optionnel
    const body = await request.json().catch(() => ({}));
    const { wait_reason } = body;

    const result = await updateTask(id, {
      status: 'en_attente',
      wait_reason: wait_reason || undefined
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error setting task to waiting:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
