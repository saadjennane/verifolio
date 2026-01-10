import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listClientContactsForProposal } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ clientId: string }>;
}

/**
 * GET /api/proposals/client/:clientId/contacts
 * List all contacts linked to a client (for recipient selection)
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { clientId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const contacts = await listClientContactsForProposal(supabase, user.id, clientId);

    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error('GET /api/proposals/client/:clientId/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
