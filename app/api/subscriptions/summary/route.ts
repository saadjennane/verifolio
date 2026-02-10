import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { getSubscriptionsSummary, generateSubscriptionPayments } from '@/lib/subscriptions';

/**
 * GET /api/subscriptions/summary
 * Recuperer le resume des abonnements (KPIs)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Generer les paiements d'abonnement en arriere-plan
    await generateSubscriptionPayments(supabase, userId);

    const { data, error } = await getSubscriptionsSummary(supabase, userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/subscriptions/summary error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation du resume' },
      { status: 500 }
    );
  }
}
