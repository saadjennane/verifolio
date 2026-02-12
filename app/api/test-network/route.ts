import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    envCheck: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...',
    },
  };

  // Test 1: Ping httpbin (external service)
  try {
    const start = Date.now();
    const res = await fetch('https://httpbin.org/get', {
      signal: AbortSignal.timeout(5000),
    });
    results.httpbin = {
      status: res.status,
      time: Date.now() - start,
      ok: res.ok,
    };
  } catch (err) {
    results.httpbin = {
      error: err instanceof Error ? err.message : 'Unknown',
    };
  }

  // Test 2: DNS resolution test via jsonplaceholder
  try {
    const start = Date.now();
    const res = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
      signal: AbortSignal.timeout(5000),
    });
    results.jsonplaceholder = {
      status: res.status,
      time: Date.now() - start,
      ok: res.ok,
    };
  } catch (err) {
    results.jsonplaceholder = {
      error: err instanceof Error ? err.message : 'Unknown',
    };
  }

  // Test 3: Supabase health endpoint (no auth required)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const start = Date.now();
      // Try the REST API health endpoint
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        signal: AbortSignal.timeout(10000),
      });
      results.supabaseRest = {
        status: res.status,
        time: Date.now() - start,
        ok: res.ok,
      };
    } catch (err) {
      results.supabaseRest = {
        error: err instanceof Error ? err.message : 'Unknown',
        errorName: err instanceof Error ? err.name : 'Unknown',
      };
    }

    // Test 4: Supabase Auth endpoint
    try {
      const start = Date.now();
      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        signal: AbortSignal.timeout(10000),
      });
      results.supabaseAuth = {
        status: res.status,
        time: Date.now() - start,
        ok: res.ok,
      };
    } catch (err) {
      results.supabaseAuth = {
        error: err instanceof Error ? err.message : 'Unknown',
        errorName: err instanceof Error ? err.name : 'Unknown',
      };
    }
  }

  return NextResponse.json(results);
}
