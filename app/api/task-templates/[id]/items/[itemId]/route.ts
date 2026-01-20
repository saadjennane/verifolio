import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateTaskTemplateItem,
  deleteTaskTemplateItem,
} from '@/lib/tasks/templates';

/**
 * PUT /api/task-templates/:id/items/:itemId - Update a template item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: templateId, itemId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Vérifier que le template appartient à l'utilisateur
  const { data: template } = await supabase
    .from('task_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
  }

  // Vérifier que l'item appartient au template
  const { data: item } = await supabase
    .from('task_template_items')
    .select('id')
    .eq('id', itemId)
    .eq('template_id', templateId)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Item non trouvé' }, { status: 404 });
  }

  const body = await request.json();

  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title;
  if (body.description !== undefined) payload.description = body.description;
  if (body.day_offset !== undefined) payload.day_offset = body.day_offset;
  if (body.sort_order !== undefined) payload.sort_order = body.sort_order;
  if (body.owner_scope !== undefined) payload.owner_scope = body.owner_scope;

  const result = await updateTaskTemplateItem(supabase, itemId, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * DELETE /api/task-templates/:id/items/:itemId - Delete a template item
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: templateId, itemId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Vérifier que le template appartient à l'utilisateur
  const { data: template } = await supabase
    .from('task_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
  }

  // Vérifier que l'item appartient au template
  const { data: item } = await supabase
    .from('task_template_items')
    .select('id')
    .eq('id', itemId)
    .eq('template_id', templateId)
    .single();

  if (!item) {
    return NextResponse.json({ error: 'Item non trouvé' }, { status: 404 });
  }

  const result = await deleteTaskTemplateItem(supabase, itemId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
