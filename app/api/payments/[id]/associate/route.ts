import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/payments/[id]/associate
// Body: { invoice_id?: string, supplier_invoice_id?: string, amount?: number }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id: paymentId } = await params;
  const body = await request.json();
  const { invoice_id, supplier_invoice_id, amount } = body;

  if (!invoice_id && !supplier_invoice_id) {
    return NextResponse.json(
      { error: 'invoice_id ou supplier_invoice_id requis' },
      { status: 400 }
    );
  }

  try {
    // Vérifier que le paiement appartient à l'utilisateur
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, user_id')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Paiement non trouvé' },
        { status: 404 }
      );
    }

    let result;

    if (invoice_id) {
      // Association à une facture client
      const { data, error } = await supabase.rpc('associate_payment_to_invoice', {
        p_payment_id: paymentId,
        p_invoice_id: invoice_id,
        p_amount: amount || null,
      });

      if (error) throw error;
      result = data;
    } else if (supplier_invoice_id) {
      // Association à une facture fournisseur
      const { data, error } = await supabase.rpc('associate_payment_to_supplier_invoice', {
        p_payment_id: paymentId,
        p_supplier_invoice_id: supplier_invoice_id,
        p_amount: amount || null,
      });

      if (error) throw error;
      result = data;
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Erreur lors de l\'association' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error associating payment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'association du paiement' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id]/associate - Dissociate payment from invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id: paymentId } = await params;

  try {
    // Vérifier que le paiement appartient à l'utilisateur
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, user_id')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Paiement non trouvé' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.rpc('dissociate_payment_from_invoice', {
      p_payment_id: paymentId,
    });

    if (error) throw error;

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || 'Erreur lors de la dissociation' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error dissociating payment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la dissociation du paiement' },
      { status: 500 }
    );
  }
}
