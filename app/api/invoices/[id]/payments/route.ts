import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { getInvoicePayments, getInvoicePaymentSummary, createPayment } from '@/lib/payments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/payments
 * Get all payments for an invoice + summary
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: invoiceId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const [payments, summary] = await Promise.all([
      getInvoicePayments(supabase, userId, invoiceId),
      getInvoicePaymentSummary(supabase, userId, invoiceId),
    ]);

    return NextResponse.json({
      data: {
        payments,
        summary,
      },
    });
  } catch (error) {
    console.error('GET /api/invoices/[id]/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/invoices/[id]/payments
 * Create a payment for this invoice
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: invoiceId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Validation basique
    if (!body.amount || body.amount === 0) {
      return NextResponse.json(
        { error: 'Le montant est requis et doit être différent de 0' },
        { status: 400 }
      );
    }

    // Créer le paiement avec l'invoice_id de l'URL
    const result = await createPayment(supabase, userId, {
      ...body,
      invoice_id: invoiceId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/invoices/[id]/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
