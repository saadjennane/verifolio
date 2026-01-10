import { NextRequest, NextResponse } from 'next/server';
import { setBriefStatus } from '@/lib/briefs';
import type { BriefStatus } from '@/lib/briefs/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/briefs/[id]/status - Update brief status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const status = body.status as BriefStatus;

  if (!status || !['DRAFT', 'SENT', 'RESPONDED'].includes(status)) {
    return NextResponse.json(
      { error: 'Statut invalide' },
      { status: 400 }
    );
  }

  const result = await setBriefStatus(id, status);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}
