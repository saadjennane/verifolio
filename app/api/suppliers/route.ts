import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';

/**
 * GET /api/suppliers
 * List all suppliers (clients with is_supplier=true)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: suppliers, error } = await supabase
      .from('clients')
      .select('id, nom, type, email, telephone, adresse, siret, tva_intracom, vat_enabled')
      .eq('user_id', user.id)
      .eq('is_supplier', true)
      .is('deleted_at', null)
      .order('nom', { ascending: true });

    if (error) {
      console.error('GET /api/suppliers error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ data: suppliers || [] });
  } catch (error) {
    console.error('GET /api/suppliers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/suppliers
 * Create a new supplier
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.nom) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    const { data: supplier, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        nom: body.nom,
        type: body.type || 'entreprise',
        email: body.email || null,
        telephone: body.telephone || null,
        adresse: body.adresse || null,
        siret: body.siret || null,
        tva_intracom: body.tva_intracom || null,
        vat_enabled: body.vat_enabled ?? true,
        is_supplier: true,
      })
      .select()
      .single();

    if (error || !supplier) {
      console.error('POST /api/suppliers error:', error);
      return NextResponse.json({ error: error?.message || 'Erreur lors de la création' }, { status: 500 });
    }

    await logActivity({
      action: 'create',
      entity_type: 'supplier',
      entity_id: supplier.id,
      entity_title: supplier.nom,
    });

    return NextResponse.json({ data: supplier }, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
