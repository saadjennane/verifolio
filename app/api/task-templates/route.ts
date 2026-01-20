import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createTaskTemplate,
  listTaskTemplates,
  type CreateTaskTemplatePayload,
  type TemplateTargetEntityType,
} from '@/lib/tasks/templates';

/**
 * GET /api/task-templates - List task templates
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const targetEntityType = searchParams.get('target_entity_type') as TemplateTargetEntityType | null;
  const isActive = searchParams.get('is_active');

  const filters: {
    target_entity_type?: TemplateTargetEntityType;
    is_active?: boolean;
  } = {};

  if (targetEntityType) {
    filters.target_entity_type = targetEntityType;
  }

  if (isActive !== null) {
    filters.is_active = isActive === 'true';
  }

  const data = await listTaskTemplates(supabase, user.id, filters);

  return NextResponse.json({ data });
}

/**
 * POST /api/task-templates - Create a new task template
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();

  const payload: CreateTaskTemplatePayload = {
    name: body.name,
    description: body.description,
    target_entity_type: body.target_entity_type,
    items: body.items,
  };

  if (!payload.name) {
    return NextResponse.json(
      { error: 'name requis' },
      { status: 400 }
    );
  }

  const result = await createTaskTemplate(supabase, user.id, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
