import { NextRequest, NextResponse } from 'next/server';
import { getBrief, updateBrief, deleteBrief } from '@/lib/briefs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/briefs/[id] - Get a brief with details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const result = await getBrief(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * PATCH /api/briefs/[id] - Update a brief
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const result = await updateBrief(id, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.data });
}

/**
 * DELETE /api/briefs/[id] - Soft delete a brief
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const result = await deleteBrief(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
