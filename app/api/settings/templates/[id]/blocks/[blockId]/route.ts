import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteTemplateBlock } from '@/lib/settings';

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

/**
 * DELETE /api/settings/templates/:id/blocks/:blockId
 * Delete a template block
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: templateId, blockId } = await params;

    // Verify the template belongs to the user
    const { data: templateCheck } = await supabase
      .from('templates')
      .select('id')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (!templateCheck) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    // Verify the block belongs to this template
    const { data: blockCheck } = await supabase
      .from('template_blocks')
      .select('id')
      .eq('id', blockId)
      .eq('template_id', templateId)
      .single();

    if (!blockCheck) {
      return NextResponse.json({ error: 'Block non trouvé' }, { status: 404 });
    }

    const result = await deleteTemplateBlock(supabase, blockId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/settings/templates/:id/blocks/:blockId error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
