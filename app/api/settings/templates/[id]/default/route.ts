import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setTemplateDefault } from '@/lib/settings';
import type { DocType } from '@/lib/types/settings';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/settings/templates/:id/default
 * Set a template as the default for its doc type
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Get the template to verify ownership and get doc_type
    const { data: template } = await supabase
      .from('templates')
      .select('id, doc_type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    const result = await setTemplateDefault(
      supabase,
      user.id,
      template.doc_type as DocType,
      id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/settings/templates/:id/default error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
