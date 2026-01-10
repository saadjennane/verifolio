import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  addBriefQuestion,
  updateBriefQuestion,
  deleteBriefQuestion,
  reorderBriefQuestions,
} from '@/lib/briefs/questions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/briefs/[id]/questions - Get questions for a brief
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: briefId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  // Verify brief ownership
  const { data: brief } = await supabase
    .from('briefs')
    .select('id')
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!brief) {
    return NextResponse.json({ error: 'Brief introuvable' }, { status: 404 });
  }

  const { data: questions, error } = await supabase
    .from('brief_questions')
    .select('*')
    .eq('brief_id', briefId)
    .order('position');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: questions });
}

/**
 * POST /api/briefs/[id]/questions - Add a question to a brief
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: briefId } = await params;
  const body = await request.json();

  if (!body.type || !body.label) {
    return NextResponse.json(
      { error: 'type et label requis' },
      { status: 400 }
    );
  }

  const result = await addBriefQuestion(briefId, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}

/**
 * PUT /api/briefs/[id]/questions - Sync all questions (add/update/delete/reorder)
 * Accepts either:
 * - { question_ids: string[] } for reordering only
 * - { questions: BriefQuestion[] } for full sync
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: briefId } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  // Verify brief ownership and that it's a draft
  const { data: brief } = await supabase
    .from('briefs')
    .select('id, status')
    .eq('id', briefId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!brief) {
    return NextResponse.json({ error: 'Brief introuvable' }, { status: 404 });
  }

  if (brief.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Le brief ne peut plus etre modifie' },
      { status: 400 }
    );
  }

  // Handle reorder-only mode (legacy)
  if (body.question_ids && Array.isArray(body.question_ids)) {
    const result = await reorderBriefQuestions(briefId, body.question_ids);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  // Handle full sync mode
  if (body.questions && Array.isArray(body.questions)) {
    // Get existing questions
    const { data: existingQuestions } = await supabase
      .from('brief_questions')
      .select('id')
      .eq('brief_id', briefId);

    const existingIds = new Set((existingQuestions || []).map((q) => q.id));
    const newQuestions = body.questions as Array<{
      id: string;
      type: string;
      label: string;
      position: number;
      is_required: boolean;
      config: Record<string, unknown>;
    }>;

    // Determine which questions to add, update, or delete
    const toAdd: typeof newQuestions = [];
    const toUpdate: typeof newQuestions = [];
    const newIds = new Set<string>();

    for (const q of newQuestions) {
      // Temp IDs start with "temp-" - these are new questions
      if (q.id.startsWith('temp-')) {
        toAdd.push(q);
      } else {
        newIds.add(q.id);
        if (existingIds.has(q.id)) {
          toUpdate.push(q);
        }
      }
    }

    // Questions to delete: exist in DB but not in new list
    const toDeleteIds = [...existingIds].filter((id) => !newIds.has(id));

    // Delete removed questions
    if (toDeleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('brief_questions')
        .delete()
        .in('id', toDeleteIds);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }
    }

    // Add new questions
    const addedQuestions: Array<{ id: string; tempId: string }> = [];
    for (const q of toAdd) {
      const { data: added, error: addError } = await supabase
        .from('brief_questions')
        .insert({
          brief_id: briefId,
          type: q.type,
          label: q.label,
          position: q.position,
          is_required: q.is_required,
          config: q.config,
        })
        .select()
        .single();

      if (addError) {
        return NextResponse.json({ error: addError.message }, { status: 400 });
      }

      addedQuestions.push({ id: added.id, tempId: q.id });
    }

    // Update existing questions
    for (const q of toUpdate) {
      const { error: updateError } = await supabase
        .from('brief_questions')
        .update({
          type: q.type,
          label: q.label,
          position: q.position,
          is_required: q.is_required,
          config: q.config,
        })
        .eq('id', q.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    // Fetch all questions with new positions
    const { data: finalQuestions, error: fetchError } = await supabase
      .from('brief_questions')
      .select('*')
      .eq('brief_id', briefId)
      .order('position');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    return NextResponse.json({ data: finalQuestions });
  }

  return NextResponse.json(
    { error: 'question_ids ou questions requis' },
    { status: 400 }
  );
}

/**
 * PATCH /api/briefs/[id]/questions?questionId=xxx - Update a specific question
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');

  if (!questionId) {
    return NextResponse.json(
      { error: 'questionId requis' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const result = await updateBriefQuestion(questionId, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * DELETE /api/briefs/[id]/questions?questionId=xxx - Delete a specific question
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');

  if (!questionId) {
    return NextResponse.json(
      { error: 'questionId requis' },
      { status: 400 }
    );
  }

  const result = await deleteBriefQuestion(questionId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
