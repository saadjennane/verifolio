import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/[id]
 * Get a single supplier
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: supplier, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_supplier', true)
      .single();

    if (error || !supplier) {
      return NextResponse.json({ error: 'Fournisseur introuvable' }, { status: 404 });
    }

    return NextResponse.json({ data: supplier });
  } catch (error) {
    console.error('GET /api/suppliers/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/suppliers/[id]
 * Update a supplier
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    const { data: supplier, error } = await supabase
      .from('clients')
      .update({
        nom: body.nom,
        type: body.type,
        email: body.email,
        telephone: body.telephone,
        adresse: body.adresse,
        siret: body.siret,
        tva_intracom: body.tva_intracom,
        vat_enabled: body.vat_enabled,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_supplier', true)
      .select()
      .single();

    if (error || !supplier) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 400 });
    }

    await logActivity({
      action: 'update',
      entity_type: 'supplier',
      entity_id: supplier.id,
      entity_title: supplier.nom,
    });

    return NextResponse.json({ data: supplier });
  } catch (error) {
    console.error('PATCH /api/suppliers/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers/[id]
 * Soft delete a supplier
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get supplier name for activity log
    const { data: supplier } = await supabase
      .from('clients')
      .select('nom')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_supplier', true)
      .single();

    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_supplier', true)
      .is('deleted_at', null);

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 400 });
    }

    if (supplier) {
      await logActivity({
        action: 'delete',
        entity_type: 'supplier',
        entity_id: id,
        entity_title: supplier.nom,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/suppliers/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
