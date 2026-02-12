import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const startTime = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Test 1: Check env vars are present
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      status: 'error',
      error: 'Missing env vars',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    });
  }

  try {
    // Test 2: Raw fetch to Supabase REST API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${supabaseUrl}/rest/v1/companies?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const fetchTime = Date.now() - startTime;
    const text = await response.text();

    return NextResponse.json({
      status: response.ok ? 'ok' : 'error',
      httpStatus: response.status,
      fetchTime,
      supabaseUrl,
      responsePreview: text.substring(0, 200),
    });
  } catch (err: unknown) {
    const errorTime = Date.now() - startTime;
    return NextResponse.json({
      status: 'exception',
      error: err instanceof Error ? err.message : 'Unknown error',
      errorName: err instanceof Error ? err.name : 'Unknown',
      errorTime,
      supabaseUrl,
    }, { status: 500 });
  }
}
