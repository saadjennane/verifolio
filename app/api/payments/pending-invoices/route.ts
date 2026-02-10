import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/payments/pending-invoices?type=client|supplier&client_id=xxx&supplier_id=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'client';
  const clientId = searchParams.get('client_id');
  const supplierId = searchParams.get('supplier_id');

  try {
    if (type === 'supplier') {
      let query = supabase
        .from('pending_supplier_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('date_echeance', { ascending: true, nullsFirst: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return NextResponse.json({ data });
    } else {
      let query = supabase
        .from('pending_client_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('date_echeance', { ascending: true, nullsFirst: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('Error fetching pending invoices:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    );
  }
}
