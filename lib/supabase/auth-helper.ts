import { createClient } from './server';

/**
 * Helper pour récupérer le userId de façon fiable.
 * Requiert une authentification réelle dans tous les environnements.
 */
export async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
