import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import {
  getSubscription,
  updateSubscription,
  suspendSubscription,
  resumeSubscription,
  cancelSubscription,
  getSubscriptionPayments,
} from '@/lib/subscriptions';
import type { SubscriptionUpdate } from '@/lib/subscriptions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/subscriptions/[id]
 * Recuperer un abonnement par son ID avec ses paiements
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { data: subscription, error } = await getSubscription(supabase, id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscription || subscription.user_id !== userId) {
      return NextResponse.json({ error: 'Abonnement non trouve' }, { status: 404 });
    }

    // Recuperer les paiements associes
    const { data: payments } = await getSubscriptionPayments(supabase, id);

    return NextResponse.json({
      data: {
        ...subscription,
        payments,
      },
    });
  } catch (error) {
    console.error('GET /api/subscriptions/[id] error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation de l\'abonnement' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/subscriptions/[id]
 * Modifier un abonnement
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

    const body = await request.json() as SubscriptionUpdate;

    // Validation
    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    if (body.frequency === 'custom' && (!body.frequency_days || body.frequency_days <= 0)) {
      return NextResponse.json(
        { error: 'Nombre de jours requis pour periodicite personnalisee' },
        { status: 400 }
      );
    }

    const { data, error } = await updateSubscription(supabase, id, body);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/subscriptions/[id] error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'abonnement' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscriptions/[id]
 * Resilier un abonnement (ne supprime pas, change le statut)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    if (existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Abonnement deja resilie' }, { status: 400 });
    }

    const { success, error } = await cancelSubscription(supabase, id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success });
  } catch (error) {
    console.error('DELETE /api/subscriptions/[id] error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la resiliation de l\'abonnement' },
      { status: 500 }
    );
  }
}
