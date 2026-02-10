import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/treasury/encaissement
 * Create an encaissement (client payment IN)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoice_id,
      client_id,
      mission_id,
      amount,
      payment_date,
      payment_method,
      payment_type,
      reference,
      notes,
    } = body;

    // Validation
    if (!client_id && !invoice_id) {
      return NextResponse.json({ error: 'Client ou facture requis' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide (doit etre > 0)' }, { status: 400 });
    }

    // Verifier que le montant ne depasse pas le reste
    if (invoice_id) {
      const { data: summary } = await supabase
        .from('invoice_payment_summary')
        .select('remaining')
        .eq('id', invoice_id)
        .single();

      if (summary && amount > summary.remaining) {
        return NextResponse.json(
          { error: `Montant depasse le reste a encaisser (${summary.remaining} EUR)` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userData.user.id,
        client_id: client_id || null,
        invoice_id: invoice_id || null,
        mission_id: mission_id || null,
        amount,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'virement',
        payment_type: payment_type || 'payment',
        reference: reference || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/treasury/encaissement error:', error);
      return NextResponse.json({ error: 'Erreur lors de la creation' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/treasury/encaissement error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
