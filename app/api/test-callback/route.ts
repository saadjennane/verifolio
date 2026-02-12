import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  results.hasCode = !!code;
  results.codePreview = code ? code.substring(0, 20) + '...' : null;

  // Test 1: Create Supabase client
  let supabase;
  try {
    const start = Date.now();
    const cookieStore = await cookies();

    supabase = createServerClient(
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
              // Server Component context - ignore
            }
          },
        },
      }
    );
    results.clientCreation = {
      time: Date.now() - start,
      success: true,
    };
  } catch (err) {
    results.clientCreation = {
      error: err instanceof Error ? err.message : 'Unknown',
    };
    return NextResponse.json(results);
  }

  // Test 2: Exchange code for session (only if code provided)
  if (code) {
    try {
      const start = Date.now();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      results.exchangeCode = {
        time: Date.now() - start,
        success: !error,
        error: error?.message,
        hasUser: !!data?.user,
        userId: data?.user?.id?.substring(0, 8) + '...',
      };

      if (data?.user) {
        // Test 3: Check if user has company
        const companyStart = Date.now();
        const { data: existingCompany, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        results.companyCheck = {
          time: Date.now() - companyStart,
          success: !companyError || companyError.code === 'PGRST116', // PGRST116 = not found
          error: companyError?.message,
          hasCompany: !!existingCompany,
        };
      }
    } catch (err) {
      results.exchangeCode = {
        error: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack?.substring(0, 300) : undefined,
      };
    }
  } else {
    // Test without code - just check current session
    try {
      const start = Date.now();
      const { data, error } = await supabase.auth.getUser();
      results.getCurrentUser = {
        time: Date.now() - start,
        success: !error,
        error: error?.message,
        hasUser: !!data?.user,
      };
    } catch (err) {
      results.getCurrentUser = {
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  return NextResponse.json(results);
}
