import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyTaskTemplate, type ApplyTemplatePayload } from '@/lib/tasks/templates';
import type { TaskEntityType } from '@/lib/tasks/types';

/**
 * POST /api/task-templates/:id/apply - Apply template to an entity
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

  const body = await request.json();

  // Validation
  if (!body.entity_type) {
    return NextResponse.json(
      { error: 'entity_type requis' },
      { status: 400 }
    );
  }

  if (!body.entity_id) {
    return NextResponse.json(
      { error: 'entity_id requis' },
      { status: 400 }
    );
  }

  const validEntityTypes: TaskEntityType[] = ['deal', 'mission', 'client', 'contact', 'invoice'];
  if (!validEntityTypes.includes(body.entity_type)) {
    return NextResponse.json(
      { error: `entity_type invalide. Valeurs acceptées: ${validEntityTypes.join(', ')}` },
      { status: 400 }
    );
  }

  const payload: ApplyTemplatePayload = {
    template_id: templateId,
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    reference_date: body.reference_date,
  };

  const result = await applyTaskTemplate(supabase, user.id, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
