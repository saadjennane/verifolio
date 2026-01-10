import { NextResponse } from 'next/server';
import { listActivityLogs } from '@/lib/activity';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await listActivityLogs(limit, offset);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      data: result.data,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/activity error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
