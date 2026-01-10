import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listTemplates, createTemplate } from '@/lib/settings';
import type { DocType } from '@/lib/types/settings';

/**
 * GET /api/settings/templates?docType=quote|invoice
 * List templates for the current user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('docType') as DocType | null;

    // Validate docType if provided
    if (docType && !['quote', 'invoice'].includes(docType)) {
      return NextResponse.json(
        { error: 'docType invalide (quote|invoice)' },
        { status: 400 }
      );
    }

    const templates = await listTemplates(supabase, user.id, docType || undefined);

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('GET /api/settings/templates error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/settings/templates
 * Create a new template
 * Body: { doc_type, name, is_default? }
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
    if (!body.doc_type || !body.name) {
      return NextResponse.json(
        { error: 'doc_type et name sont requis' },
        { status: 400 }
      );
    }

    // Validate doc_type
    if (!['quote', 'invoice'].includes(body.doc_type)) {
      return NextResponse.json(
        { error: 'doc_type invalide (quote|invoice)' },
        { status: 400 }
      );
    }

    const result = await createTemplate(
      supabase,
      user.id,
      body.doc_type,
      body.name,
      body.is_default ?? false
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/settings/templates error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
