import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/treasury/movements
 * List treasury movements with filters
 * Query params: from_date, to_date, direction, movement_type, payment_method, counterpart_id, search
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    let query = supabase
      .from('treasury_movements')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const direction = searchParams.get('direction');
    const movementType = searchParams.get('movement_type');
    const paymentMethod = searchParams.get('payment_method');
    const counterpartId = searchParams.get('counterpart_id');
    const search = searchParams.get('search');

    if (fromDate) {
      query = query.gte('date', fromDate);
    }
    if (toDate) {
      query = query.lte('date', toDate);
    }
    if (direction) {
      query = query.eq('direction', direction);
    }
    if (movementType) {
      query = query.eq('movement_type', movementType);
    }
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }
    if (counterpartId) {
      query = query.eq('counterpart_id', counterpartId);
    }
    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,notes.ilike.%${search}%,counterpart_name.ilike.%${search}%,document_numero.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/treasury/movements error:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/treasury/movements error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
