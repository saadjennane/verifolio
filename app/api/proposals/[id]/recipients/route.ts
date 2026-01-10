import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listProposalRecipients, setProposalRecipients } from '@/lib/proposals';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/:id/recipients
 * List all recipients for a proposal
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const recipients = await listProposalRecipients(supabase, user.id, id);

    return NextResponse.json({ data: recipients });
  } catch (error) {
    console.error('GET /api/proposals/:id/recipients error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/proposals/:id/recipients
 * Set the recipients for a proposal (replaces existing list)
 * Body: { contactIds: string[] }
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required field
    if (!Array.isArray(body.contactIds)) {
      return NextResponse.json(
        { error: 'contactIds doit être un tableau' },
        { status: 400 }
      );
    }

    const result = await setProposalRecipients(supabase, user.id, id, body.contactIds);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return the updated list
    const recipients = await listProposalRecipients(supabase, user.id, id);

    return NextResponse.json({ data: recipients });
  } catch (error) {
    console.error('PUT /api/proposals/:id/recipients error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
