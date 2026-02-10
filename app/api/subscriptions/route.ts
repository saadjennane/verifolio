import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import {
  listSubscriptions,
  createSubscription,
  getSubscriptionsSummary,
  generateSubscriptionPayments,
} from '@/lib/subscriptions';
import type { SubscriptionCreate } from '@/lib/subscriptions';

/**
 * GET /api/subscriptions
 * Liste des abonnements avec options de filtrage
 * Query params: status (active|suspended|cancelled|all), limit, offset
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'suspended' | 'cancelled' | 'all' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    const includeSummary = searchParams.get('summary') === 'true';

    // Generer les paiements d'abonnement en arriere-plan
    await generateSubscriptionPayments(supabase, userId);

    const { data: subscriptions, error } = await listSubscriptions(supabase, userId, {
      status: status || 'all',
      limit,
      offset,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionnel: inclure le resume
    let summary = null;
    if (includeSummary) {
      const summaryResult = await getSubscriptionsSummary(supabase, userId);
      summary = summaryResult.data;
    }

    return NextResponse.json({
      data: subscriptions,
      summary,
    });
  } catch (error) {
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des abonnements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions
 * Creer un nouvel abonnement
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json() as SubscriptionCreate;

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nom du service requis' }, { status: 400 });
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    if (!body.frequency) {
      return NextResponse.json({ error: 'Periodicite requise' }, { status: 400 });
    }

    if (!body.start_date) {
      return NextResponse.json({ error: 'Date de debut requise' }, { status: 400 });
    }

    if (!body.supplier_id && !body.supplier_name?.trim()) {
      return NextResponse.json(
        { error: 'Fournisseur requis (supplier_id ou supplier_name)' },
        { status: 400 }
      );
    }

    if (body.frequency === 'custom' && (!body.frequency_days || body.frequency_days <= 0)) {
      return NextResponse.json(
        { error: 'Nombre de jours requis pour periodicite personnalisee' },
        { status: 400 }
      );
    }

    const { data, error } = await createSubscription(supabase, userId, body);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/subscriptions error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation de l\'abonnement' },
      { status: 500 }
    );
  }
}
