import { NextRequest, NextResponse } from 'next/server';
import { createTemplateFromBrief } from '@/lib/briefs/templates';

/**
 * POST /api/briefs/templates/from-brief
 * Create a new template from an existing brief's questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { briefId, name, description, isDefault } = body;

    if (!briefId || !name) {
      return NextResponse.json(
        { success: false, error: 'briefId et name sont requis' },
        { status: 400 }
      );
    }

    const result = await createTemplateFromBrief(
      briefId,
      name,
      description,
      isDefault
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating template from brief:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
