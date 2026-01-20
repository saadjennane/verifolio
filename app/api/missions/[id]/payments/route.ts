import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import {
  listPayments,
  getMissionPaymentSummary,
  getMissionInvoicePayments,
  createPayment,
} from '@/lib/payments';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/missions/[id]/payments
 * Get all payments for a mission (via invoices + direct advances)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: missionId } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const [summary, invoiceSummaries, directPayments] = await Promise.all([
      getMissionPaymentSummary(supabase, userId, missionId),
      getMissionInvoicePayments(supabase, userId, missionId),
      // Paiements directs liés à la mission (avances)
      listPayments(supabase, userId, { mission_id: missionId }),
    ]);

    return NextResponse.json({
      data: {
        summary,
        invoices: invoiceSummaries,
        payments: directPayments,
      },
    });
  } catch (error) {
    console.error('GET /api/missions/[id]/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/missions/[id]/payments
 * Create a payment/advance for this mission
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: missionId } = await params;
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

    // Si pas de client_id fourni, récupérer celui de la mission
    let clientId = body.client_id;
    if (!clientId && !body.invoice_id) {
      const { data: mission } = await supabase
        .from('missions')
        .select('client_id')
        .eq('id', missionId)
        .single();

      clientId = mission?.client_id;
    }

    const result = await createPayment(supabase, userId, {
      ...body,
      mission_id: missionId,
      client_id: clientId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/missions/[id]/payments error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
