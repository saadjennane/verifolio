import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { createPayment, listPayments } from '@/lib/payments';

/**
 * GET /api/payments
 * List payments with optional filters
 * Query params: client_id, invoice_id, mission_id, payment_type, from_date, to_date, limit
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      client_id: searchParams.get('client_id') || undefined,
      invoice_id: searchParams.get('invoice_id') || undefined,
      mission_id: searchParams.get('mission_id') || undefined,
      payment_type: searchParams.get('payment_type') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const payments = await listPayments(supabase, userId, filters);

    return NextResponse.json({ data: payments });
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/payments
 * Create a new payment
 */
export async function POST(request: NextRequest) {
  try {
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

    if (!body.client_id && !body.invoice_id) {
      return NextResponse.json(
        { error: 'client_id ou invoice_id requis' },
        { status: 400 }
      );
    }

    const result = await createPayment(supabase, userId, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
