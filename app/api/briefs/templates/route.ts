import { NextRequest, NextResponse } from 'next/server';
import { createTemplate, listTemplates } from '@/lib/briefs/templates';
import type { CreateTemplatePayload } from '@/lib/briefs/types';

/**
 * GET /api/briefs/templates - List brief templates
 */
export async function GET() {
  const result = await listTemplates();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * POST /api/briefs/templates - Create a new template
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const payload: CreateTemplatePayload = {
    name: body.name,
    description: body.description,
    is_default: body.is_default,
  };

  if (!payload.name) {
    return NextResponse.json(
      { error: 'name requis' },
      { status: 400 }
    );
  }

  const result = await createTemplate(payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
