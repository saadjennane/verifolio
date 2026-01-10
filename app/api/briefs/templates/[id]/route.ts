import { NextRequest, NextResponse } from 'next/server';
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/briefs/templates';
import {
  addTemplateQuestion,
  updateTemplateQuestion,
  deleteTemplateQuestion,
  reorderTemplateQuestions,
} from '@/lib/briefs/questions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/briefs/templates/[id] - Get a template with questions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const result = await getTemplate(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * PATCH /api/briefs/templates/[id] - Update a template
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const result = await updateTemplate(id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * DELETE /api/briefs/templates/[id] - Delete a template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const result = await deleteTemplate(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

/**
 * POST /api/briefs/templates/[id] - Add a question to template
 * (Alternative endpoint for adding questions)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await request.json();

  if (action === 'reorder') {
    // Reorder questions
    if (!body.question_ids || !Array.isArray(body.question_ids)) {
      return NextResponse.json(
        { error: 'question_ids requis' },
        { status: 400 }
      );
    }

    const result = await reorderTemplateQuestions(id, body.question_ids);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // Default: add question
  if (!body.type || !body.label) {
    return NextResponse.json(
      { error: 'type et label requis' },
      { status: 400 }
    );
  }

  const result = await addTemplateQuestion(id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}

/**
 * PUT /api/briefs/templates/[id]?questionId=xxx - Update a template question
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');

  if (!questionId) {
    return NextResponse.json(
      { error: 'questionId requis' },
      { status: 400 }
    );
  }

  const body = await request.json();

  if (body._delete) {
    // Delete the question
    const result = await deleteTemplateQuestion(questionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // Update the question
  const result = await updateTemplateQuestion(questionId, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}
