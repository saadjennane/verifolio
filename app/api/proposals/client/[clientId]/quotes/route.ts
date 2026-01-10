import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/proposals/client/:clientId/quotes
 * List all quotes for a client (for linking to proposal)
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { clientId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify client ownership
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Get quotes for this client
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('id, numero, date_emission, total_ttc, status')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('date_emission', { ascending: false });

    if (error) {
      console.error('GET /api/proposals/client/:clientId/quotes error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ data: quotes || [] });
  } catch (error) {
    console.error('GET /api/proposals/client/:clientId/quotes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
