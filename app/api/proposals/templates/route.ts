import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listProposalTemplates, createProposalTemplate } from '@/lib/proposals';

/**
 * GET /api/proposals/templates
 * List all proposal templates for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const templates = await listProposalTemplates(supabase, user.id);

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('GET /api/proposals/templates error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/proposals/templates
 * Create a new proposal template
 * Body: { name, description?, theme?, is_default? }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'name est requis' },
        { status: 400 }
      );
    }

    const result = await createProposalTemplate(supabase, user.id, {
      name: body.name,
      description: body.description,
      theme: body.theme,
      is_default: body.is_default,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals/templates error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
