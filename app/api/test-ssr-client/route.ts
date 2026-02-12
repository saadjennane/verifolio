import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // Test 1: Can we get cookies?
  try {
    const start = Date.now();
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    results.cookiesTest = {
      time: Date.now() - start,
      count: allCookies.length,
      names: allCookies.map(c => c.name),
    };
  } catch (err) {
    results.cookiesTest = {
      error: err instanceof Error ? err.message : 'Unknown',
    };
  }

  // Test 2: Create Supabase client without making a request
  try {
    const start = Date.now();
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored in Server Components
            }
          },
        },
      }
    );
    results.clientCreation = {
      time: Date.now() - start,
      created: !!supabase,
    };

    // Test 3: Simple query
    const queryStart = Date.now();
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    results.simpleQuery = {
      time: Date.now() - queryStart,
      success: !error,
      error: error?.message,
      hasData: !!data,
    };

    // Test 4: Auth getUser
    const authStart = Date.now();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    results.authGetUser = {
      time: Date.now() - authStart,
      success: !authError,
      error: authError?.message,
      hasUser: !!userData?.user,
    };

  } catch (err) {
    results.clientTest = {
      error: err instanceof Error ? err.message : 'Unknown',
      stack: err instanceof Error ? err.stack?.substring(0, 500) : undefined,
    };
  }

  return NextResponse.json(results);
}
