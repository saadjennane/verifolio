import { NextRequest, NextResponse } from 'next/server';
import { setBriefStatus, getBrief } from '@/lib/briefs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/briefs/[id]/send - Send a brief (change status to SENT)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Get the brief first to check if it has questions
  const briefResult = await getBrief(id);

  if (!briefResult.success || !briefResult.data) {
    return NextResponse.json({ error: briefResult.error }, { status: 404 });
  }

  const brief = briefResult.data;

  // Check if brief is in DRAFT status
  if (brief.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Le brief a deja ete envoye' },
      { status: 400 }
    );
  }

  // Check if brief has questions
  const dataQuestions = brief.questions?.filter(
    (q) => !['title', 'description', 'separator'].includes(q.type)
  );

  if (!dataQuestions || dataQuestions.length === 0) {
    return NextResponse.json(
      { error: 'Le brief doit contenir au moins une question' },
      { status: 400 }
    );
  }

  // Update status to SENT
  const result = await setBriefStatus(id, 'SENT');

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    data: result.data,
    public_url: `/b/${brief.public_token}`,
  });
}
