import { NextResponse } from 'next/server';
import { getTask, updateTask, deleteTask } from '@/lib/tasks';

/**
 * GET /api/tasks/:id
 * Récupère une tâche par ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await getTask(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ task: result.data });
  } catch (error) {
    console.error('Error getting task:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la tâche' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/:id
 * Met à jour une tâche
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Validation: entity_type et entity_id doivent être fournis ensemble
    if ((body.entity_type !== undefined && body.entity_id === undefined) ||
        (body.entity_type === undefined && body.entity_id !== undefined)) {
      // Si l'un est défini mais pas l'autre, on valide que c'est cohérent
      if ((body.entity_type && !body.entity_id) || (!body.entity_type && body.entity_id)) {
        return NextResponse.json(
          { error: 'entity_type et entity_id doivent être fournis ensemble ou tous les deux null' },
          { status: 400 }
        );
      }
    }

    const result = await updateTask(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la tâche' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/:id
 * Supprime une tâche (uniquement manuelles)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await deleteTask(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la tâche' },
      { status: 500 }
    );
  }
}
