import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import {
  getSubscription,
  getSubscriptionPayments,
  completeSubscriptionPayment,
} from '@/lib/subscriptions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/subscriptions/[id]/payments
 * Liste des paiements d'un abonnement
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Verifier que l'abonnement appartient a l'utilisateur
    const { data: existing } = await getSubscription(supabase, id);
    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Abonnement non trouve' }, { status: 404 });
    }

    const { data: payments, error } = await getSubscriptionPayments(supabase, id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: payments });
  } catch (error) {
    console.error('GET /api/subscriptions/[id]/payments error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des paiements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions/[id]/payments
 * Marquer un paiement comme effectue
 * Body: { payment_id: string }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Verifier que l'abonnement appartient a l'utilisateur
    const { data: existing } = await getSubscription(supabase, id);
    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Abonnement non trouve' }, { status: 404 });
    }

    const body = await request.json();
    const { payment_id } = body;

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id requis' }, { status: 400 });
    }

    const { success, error } = await completeSubscriptionPayment(supabase, payment_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Impossible de marquer ce paiement comme effectue' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/subscriptions/[id]/payments error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation du paiement' },
      { status: 500 }
    );
  }
}
