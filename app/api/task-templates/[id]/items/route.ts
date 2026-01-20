import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  addTaskTemplateItem,
  reorderTaskTemplateItems,
  type CreateTaskTemplateItemPayload,
} from '@/lib/tasks/templates';

/**
 * POST /api/task-templates/:id/items - Add an item to a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
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

  const body = await request.json();

  const payload: CreateTaskTemplateItemPayload = {
    title: body.title,
    description: body.description,
    day_offset: body.day_offset,
    sort_order: body.sort_order,
    owner_scope: body.owner_scope,
  };

  if (!payload.title) {
    return NextResponse.json(
      { error: 'title requis' },
      { status: 400 }
    );
  }

  const result = await addTaskTemplateItem(supabase, templateId, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}

/**
 * PUT /api/task-templates/:id/items - Reorder items
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
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

  const body = await request.json();

  if (!body.item_ids || !Array.isArray(body.item_ids)) {
    return NextResponse.json(
      { error: 'item_ids requis (tableau d\'IDs)' },
      { status: 400 }
    );
  }

  const result = await reorderTaskTemplateItems(supabase, templateId, body.item_ids);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
