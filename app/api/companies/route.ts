import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Fetch all clients (both clients and suppliers)
    const { data, error } = await supabase
      .from('clients')
      .select('id, nom, type, email, telephone, is_client, is_supplier, vat_enabled, logo_url')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('nom', { ascending: true });

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ensure is_client defaults to true for backward compatibility
    const companies = (data || []).map(c => ({
      ...c,
      is_client: c.is_client ?? true,
      is_supplier: c.is_supplier ?? false,
    }));

    return NextResponse.json({ data: companies });
  } catch (error) {
    console.error('Error in GET /api/companies:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
