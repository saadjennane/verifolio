import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[auth/callback] Start');
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  console.log('[auth/callback] code:', code ? 'present' : 'missing', 'origin:', origin);

  if (code) {
    const cookieStore = await cookies();
    console.log('[auth/callback] Cookies obtained:', Date.now() - startTime, 'ms');

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
              // Server Component context - ignore
            }
          },
        },
      }
    );
    console.log('[auth/callback] Supabase client created:', Date.now() - startTime, 'ms');

    const exchangeStart = Date.now();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log('[auth/callback] exchangeCodeForSession:', Date.now() - exchangeStart, 'ms', error ? `error: ${error.message}` : 'success');

    if (!error && data.user) {
      console.log('[auth/callback] User authenticated:', data.user.id.substring(0, 8));

      // Vérifier si l'utilisateur a déjà une company
      const companyStart = Date.now();
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', data.user.id)
        .single();
      console.log('[auth/callback] Company check:', Date.now() - companyStart, 'ms', existingCompany ? 'exists' : 'not found');

      // Créer une company pour les nouveaux utilisateurs OAuth
      if (!existingCompany) {
        const userName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Mon entreprise';

        const insertStart = Date.now();
        await supabase.from('companies').insert({
          user_id: data.user.id,
          nom: userName,
        });
        console.log('[auth/callback] Company created:', Date.now() - insertStart, 'ms');
      }

      console.log('[auth/callback] Total time:', Date.now() - startTime, 'ms - redirecting to /');
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Erreur OAuth - rediriger vers login avec message d'erreur
  console.log('[auth/callback] Failed - redirecting to login. Total time:', Date.now() - startTime, 'ms');
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
