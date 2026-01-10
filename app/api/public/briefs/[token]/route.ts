import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getBriefByToken } from '@/lib/briefs';
import { logEventIfFirst } from '@/lib/tracking/events';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/public/briefs/[token] - Get a brief by public token (no auth required)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const brief = await getBriefByToken(token);

  if (!brief) {
    return NextResponse.json(
      { error: 'Brief introuvable' },
      { status: 404 }
    );
  }

  // Only return briefs that are SENT or RESPONDED
  if (brief.status === 'DRAFT') {
    return NextResponse.json(
      { error: 'Brief non disponible' },
      { status: 404 }
    );
  }

  // Tracker la première visite
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip');
  const userAgent = headersList.get('user-agent');

  await logEventIfFirst({
    userId: brief.user_id,
    resourceType: 'brief',
    resourceId: brief.id,
    eventType: 'viewer_opened',
    metadata: { token },
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  });

  // Remove sensitive fields
  const publicBrief = {
    id: brief.id,
    title: brief.title,
    status: brief.status,
    client: brief.client,
    deal: { title: brief.deal.title },
    questions: brief.questions.map((q) => ({
      id: q.id,
      type: q.type,
      label: q.label,
      position: q.position,
      is_required: q.is_required,
      config: q.config,
      response: q.response,
    })),
    responded_at: brief.responded_at,
  };

  return NextResponse.json({ data: publicBrief });
}
