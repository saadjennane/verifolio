import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  type UpdateTaskTemplatePayload,
} from '@/lib/tasks/templates';

/**
 * GET /api/task-templates/:id - Get a task template with items
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const data = await getTaskTemplate(supabase, user.id, id);

  if (!data) {
    return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * PUT /api/task-templates/:id - Update a task template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();

  const payload: UpdateTaskTemplatePayload = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.description !== undefined) payload.description = body.description;
  if (body.target_entity_type !== undefined) payload.target_entity_type = body.target_entity_type;
  if (body.is_active !== undefined) payload.is_active = body.is_active;

  const result = await updateTaskTemplate(supabase, user.id, id, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * DELETE /api/task-templates/:id - Delete a task template
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const result = await deleteTaskTemplate(supabase, user.id, id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
