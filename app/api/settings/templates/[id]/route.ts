import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/settings';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/settings/templates/:id
 * Get a template with its blocks
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the template belongs to the user
    const { data: templateCheck } = await supabase
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!templateCheck) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    const template = await getTemplate(supabase, id, true);

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error('GET /api/settings/templates/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/templates/:id
 * Update a template
 * Body: { name?, version? }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the template belongs to the user
    const { data: templateCheck } = await supabase
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!templateCheck) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    const result = await updateTemplate(supabase, id, {
      name: body.name,
      version: body.version,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PUT /api/settings/templates/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/templates/:id
 * Delete a template
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the template belongs to the user
    const { data: templateCheck } = await supabase
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!templateCheck) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    const result = await deleteTemplate(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/settings/templates/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
