import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTemplateBlocksByZone, upsertTemplateBlock } from '@/lib/settings';
import type { TemplateBlockPayload } from '@/lib/types/settings';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/settings/templates/:id/blocks
 * Get all blocks for a template, grouped by zone
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

    const blocks = await getTemplateBlocksByZone(supabase, id);

    return NextResponse.json({ data: blocks });
  } catch (error) {
    console.error('GET /api/settings/templates/:id/blocks error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/settings/templates/:id/blocks
 * Create or update a block
 * Body: { id?, zone, block_type, field_id?, label_override?, is_visible?, sort_order?, config? }
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
    if (!body.zone || !body.block_type) {
      return NextResponse.json(
        { error: 'zone et block_type sont requis' },
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

    // Validate block_type
    const validBlockTypes = [
      'company_logo', 'company_contact', 'company_field',
      'client_contact', 'client_field', 'document_field',
      'legal_text', 'notes', 'items_table', 'totals_table'
    ];
    if (!validBlockTypes.includes(body.block_type)) {
      return NextResponse.json(
        { error: `block_type invalide` },
        { status: 400 }
      );
    }

    // Validate field_id requirement for field blocks
    const fieldBlockTypes = ['company_field', 'client_field', 'document_field'];
    if (fieldBlockTypes.includes(body.block_type) && !body.field_id) {
      return NextResponse.json(
        { error: 'field_id requis pour ce type de block' },
        { status: 400 }
      );
    }

    // If updating, verify the block belongs to this template
    if (body.id) {
      const { data: blockCheck } = await supabase
        .from('template_blocks')
        .select('id')
        .eq('id', body.id)
        .eq('template_id', templateId)
        .single();

      if (!blockCheck) {
        return NextResponse.json({ error: 'Block non trouvé' }, { status: 404 });
      }
    }

    const payload: TemplateBlockPayload = {
      id: body.id,
      zone: body.zone,
      block_type: body.block_type,
      field_id: body.field_id,
      label_override: body.label_override,
      is_visible: body.is_visible,
      sort_order: body.sort_order,
      config: body.config,
    };

    const result = await upsertTemplateBlock(supabase, templateId, payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { data: result.data },
      { status: body.id ? 200 : 201 }
    );
  } catch (error) {
    console.error('POST /api/settings/templates/:id/blocks error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
