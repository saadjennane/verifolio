import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
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
              // Server Component context - ignore
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Vérifier si l'utilisateur a déjà une company
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      // Créer une company pour les nouveaux utilisateurs OAuth
      if (!existingCompany) {
        const userName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split('@')[0] ||
          'Mon entreprise';

        await supabase.from('companies').insert({
          user_id: data.user.id,
          nom: userName,
        });
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Erreur OAuth - rediriger vers login avec message d'erreur
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}
