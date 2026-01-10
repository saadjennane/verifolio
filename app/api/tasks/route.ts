import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/tasks';
import type { TaskStatus, TaskEntityType, TaskOwnerScope } from '@/lib/tasks';

/**
 * GET /api/tasks
 * Liste les tâches avec filtres
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TaskStatus | null;
    const entity_type = searchParams.get('entity_type') as TaskEntityType | null;
    const entity_id = searchParams.get('entity_id');
    const is_system = searchParams.get('is_system');
    const overdue = searchParams.get('overdue');
    const owner_scope = searchParams.get('owner_scope') as TaskOwnerScope | null;
    const owner_entity_id = searchParams.get('owner_entity_id');

    const filter: any = {};
    if (status) filter.status = status;
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;
    if (is_system !== null) filter.is_system = is_system === 'true';
    if (overdue !== null) filter.overdue = overdue === 'true';
    if (owner_scope) filter.owner_scope = owner_scope;
    if (owner_entity_id) filter.owner_entity_id = owner_entity_id;

    const result = await listTasks(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ tasks: result.data });
  } catch (error) {
    console.error('Error listing tasks:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Créer une nouvelle tâche manuelle
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await createTask(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la tâche' },
      { status: 500 }
    );
  }
}
