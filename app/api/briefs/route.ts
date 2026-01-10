import { NextRequest, NextResponse } from 'next/server';
import { createBrief, listBriefs } from '@/lib/briefs';
import type { BriefListFilter, CreateBriefPayload } from '@/lib/briefs/types';

/**
 * GET /api/briefs - List briefs with optional filters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filter: BriefListFilter = {};

  const status = searchParams.get('status');
  if (status) {
    filter.status = status as BriefListFilter['status'];
  }

  const dealId = searchParams.get('deal_id');
  if (dealId) {
    filter.deal_id = dealId;
  }

  const clientId = searchParams.get('client_id');
  if (clientId) {
    filter.client_id = clientId;
  }

  const result = await listBriefs(filter);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * POST /api/briefs - Create a new brief
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const payload: CreateBriefPayload = {
    deal_id: body.deal_id,
    template_id: body.template_id,
    title: body.title,
  };

  if (!payload.deal_id || !payload.template_id) {
    return NextResponse.json(
      { error: 'deal_id et template_id requis' },
      { status: 400 }
    );
  }

  const result = await createBrief(payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
