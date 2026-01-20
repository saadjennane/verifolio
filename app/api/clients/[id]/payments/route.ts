import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import {
  listPayments,
  getClientPaymentBalance,
  getClientAdvances,
  createPayment,
} from '@/lib/payments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/[id]/payments
 * Get all payments for a client + balance
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const advancesOnly = searchParams.get('advances_only') === 'true';

    const [balance, payments] = await Promise.all([
      getClientPaymentBalance(supabase, userId, clientId),
      advancesOnly
        ? getClientAdvances(supabase, userId, clientId)
        : listPayments(supabase, userId, { client_id: clientId }),
    ]);

    return NextResponse.json({
      data: {
        balance,
        payments,
      },
    });
  } catch (error) {
    console.error('GET /api/clients/[id]/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/clients/[id]/payments
 * Create an advance for this client
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params;
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

    // Créer l'avance avec le client_id de l'URL
    const result = await createPayment(supabase, userId, {
      ...body,
      client_id: clientId,
      payment_type: body.payment_type || 'advance', // Par défaut: avance
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients/[id]/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
