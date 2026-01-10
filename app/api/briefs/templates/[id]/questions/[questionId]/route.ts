import { NextRequest, NextResponse } from 'next/server';
import { updateTemplateQuestion, deleteTemplateQuestion } from '@/lib/briefs/questions';

interface RouteContext {
  params: Promise<{ id: string; questionId: string }>;
}

/**
 * PATCH /api/briefs/templates/[id]/questions/[questionId]
 * Update a template question
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { questionId } = await context.params;
    const body = await request.json();

    const { type, label, position, is_required, config } = body;

    const result = await updateTemplateQuestion(questionId, {
      type,
      label,
      position,
      is_required,
      config,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating template question:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/briefs/templates/[id]/questions/[questionId]
 * Delete a template question
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { questionId } = await context.params;

    const result = await deleteTemplateQuestion(questionId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting template question:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
