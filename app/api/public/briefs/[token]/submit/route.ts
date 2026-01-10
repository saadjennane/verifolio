import { NextRequest, NextResponse } from 'next/server';
import { submitBriefResponses } from '@/lib/briefs/questions';
import type { SubmitBriefPayload } from '@/lib/briefs/types';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/public/briefs/[token]/submit - Submit responses to a brief
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;
  const body = await request.json();

  const payload: SubmitBriefPayload = {
    responses: body.responses || [],
  };

  if (!payload.responses || payload.responses.length === 0) {
    return NextResponse.json(
      { error: 'Aucune reponse fournie' },
      { status: 400 }
    );
  }

  const result = await submitBriefResponses(token, payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
