import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/treasury/pending
 * Get pending invoices for quick actions
 * Query params: type ('client' | 'supplier')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'client';

    if (type === 'supplier') {
      // Factures fournisseurs non payees
      const { data, error } = await supabase
        .from('supplier_invoice_payment_summary')
        .select('*')
        .eq('user_id', userData.user.id)
        .neq('payment_status', 'paye')
        .neq('status', 'cancelled')
        .order('date_echeance', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('GET /api/treasury/pending supplier error:', error);
        return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
      }

      const invoices = (data || []).map((inv) => ({
        id: inv.id,
        numero: inv.numero || 'Sans numero',
        supplier_id: inv.supplier_id,
        supplier_name: inv.supplier_name || 'Fournisseur inconnu',
        total_ttc: inv.total_ttc || 0,
        remaining: inv.remaining ?? inv.total_ttc ?? 0,
        date_echeance: inv.date_echeance,
      }));

      return NextResponse.json({ data: invoices });
    } else {
      // Factures clients non payees (statut envoyee uniquement)
      const { data, error } = await supabase
        .from('invoice_payment_summary')
        .select(
          `
          id,
          numero,
          client_id,
          total_ttc,
          remaining,
          date_echeance,
          client:clients(nom)
        `
        )
        .eq('user_id', userData.user.id)
        .eq('status', 'envoyee')
        .neq('payment_status', 'paye')
        .gt('remaining', 0)
        .order('date_echeance', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('GET /api/treasury/pending client error:', error);
        return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
      }

      const invoices = (data || []).map((inv) => {
        const client = inv.client as unknown as { nom: string } | null;
        return {
          id: inv.id,
          numero: inv.numero,
          client_id: inv.client_id,
          client_name: client?.nom || 'Client inconnu',
          total_ttc: inv.total_ttc,
          remaining: inv.remaining,
          date_echeance: inv.date_echeance,
        };
      });

      return NextResponse.json({ data: invoices });
    }
  } catch (error) {
    console.error('GET /api/treasury/pending error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
