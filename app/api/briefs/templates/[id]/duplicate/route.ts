import { NextRequest, NextResponse } from 'next/server';
import { duplicateTemplate } from '@/lib/briefs/templates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/briefs/templates/[id]/duplicate - Duplicate a template
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await duplicateTemplate(id, body.name);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
