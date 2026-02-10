import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/treasury/summary
 * Get treasury KPIs for a period
 * Query params: from_date, to_date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date') || null;
    const toDate = searchParams.get('to_date') || null;

    const { data, error } = await supabase.rpc('get_treasury_kpis', {
      p_user_id: userData.user.id,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error) {
      console.error('GET /api/treasury/summary error:', error);
      return NextResponse.json({ error: 'Erreur lors du calcul des KPIs' }, { status: 500 });
    }

    // RPC returns an array, take first element
    const kpis = data?.[0] || {
      total_encaisse: 0,
      total_decaisse: 0,
      solde_net: 0,
      a_encaisser: 0,
      a_payer: 0,
      en_retard_encaissement: 0,
      en_retard_paiement: 0,
      a_venir_encaissement: 0,
      a_venir_paiement: 0,
    };

    return NextResponse.json({ data: kpis });
  } catch (error) {
    console.error('GET /api/treasury/summary error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
