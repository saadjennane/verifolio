import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/treasury/decaissement
 * Create a decaissement (supplier payment OUT)
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
      supplier_invoice_id,
      supplier_id,
      amount,
      payment_date,
      payment_method,
      payment_type,
      reference,
      notes,
    } = body;

    // Validation
    if (!supplier_id && !supplier_invoice_id) {
      return NextResponse.json({ error: 'Fournisseur ou facture fournisseur requis' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide (doit etre > 0)' }, { status: 400 });
    }

    // Verifier que le montant ne depasse pas le reste
    if (supplier_invoice_id) {
      const { data: summary } = await supabase
        .from('supplier_invoice_payment_summary')
        .select('remaining')
        .eq('id', supplier_invoice_id)
        .single();

      if (summary && amount > summary.remaining) {
        return NextResponse.json(
          { error: `Montant depasse le reste a payer (${summary.remaining} EUR)` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: userData.user.id,
        supplier_id: supplier_id || null,
        supplier_invoice_id: supplier_invoice_id || null,
        amount,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'virement',
        payment_type: payment_type || 'supplier_payment',
        reference: reference || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('POST /api/treasury/decaissement error:', error);
      return NextResponse.json({ error: 'Erreur lors de la creation' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/treasury/decaissement error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
