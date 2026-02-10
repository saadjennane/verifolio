import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/payments/unassociated?type=client|supplier
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
        .from('unassociated_supplier_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return NextResponse.json({ data });
    } else {
      let query = supabase
        .from('unassociated_client_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('Error fetching unassociated payments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paiements' },
      { status: 500 }
    );
  }
}
