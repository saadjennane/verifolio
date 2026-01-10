import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addTemplateQuestion } from '@/lib/briefs/questions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/briefs/templates/[id]/questions
 * List all questions for a template
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: templateId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 });
    }

    // Verify template ownership and get questions
    const { data: template, error } = await supabase
      .from('brief_templates')
      .select(`
        id,
        questions:brief_template_questions(*)
      `)
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    // Sort questions by position
    const questions = (template.questions || []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching template questions:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/briefs/templates/[id]/questions
 * Add a new question to a template
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: templateId } = await context.params;
    const body = await request.json();

    const { type, label, position, is_required, config } = body;

    if (!type || !label) {
      return NextResponse.json(
        { success: false, error: 'type et label sont requis' },
        { status: 400 }
      );
    }

    const result = await addTemplateQuestion(templateId, {
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
    console.error('Error adding template question:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
