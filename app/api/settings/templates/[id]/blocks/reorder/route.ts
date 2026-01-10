import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reorderTemplateBlocks } from '@/lib/settings';
import type { TemplateZone } from '@/lib/types/settings';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/settings/templates/:id/blocks/reorder
 * Reorder blocks within a zone
 * Body: { zone, block_ids: string[] }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: templateId } = await params;
    const body = await request.json();

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

    // Validate required fields
    if (!body.zone || !body.block_ids || !Array.isArray(body.block_ids)) {
      return NextResponse.json(
        { error: 'zone et block_ids (array) sont requis' },
        { status: 400 }
      );
    }

    // Validate zone
    const validZones = ['header', 'doc_info', 'client', 'items', 'totals', 'footer'];
    if (!validZones.includes(body.zone)) {
      return NextResponse.json(
        { error: `zone invalide (${validZones.join('|')})` },
        { status: 400 }
      );
    }

    const result = await reorderTemplateBlocks(
      supabase,
      templateId,
      body.zone as TemplateZone,
      body.block_ids
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/settings/templates/:id/blocks/reorder error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
