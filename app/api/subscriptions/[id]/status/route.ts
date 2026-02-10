import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import {
  getSubscription,
  suspendSubscription,
  resumeSubscription,
  cancelSubscription,
} from '@/lib/subscriptions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/subscriptions/[id]/status
 * Changer le statut d'un abonnement (suspend/resume/cancel)
 * Body: { action: 'suspend' | 'resume' | 'cancel' }
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

    const body = await request.json();
    const { action } = body;

    if (!action || !['suspend', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide (suspend, resume, cancel)' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'suspend':
        if (existing.status !== 'active') {
          return NextResponse.json(
            { error: 'Seul un abonnement actif peut etre suspendu' },
            { status: 400 }
          );
        }
        result = await suspendSubscription(supabase, id);
        break;

      case 'resume':
        if (existing.status !== 'suspended') {
          return NextResponse.json(
            { error: 'Seul un abonnement suspendu peut etre reactive' },
            { status: 400 }
          );
        }
        result = await resumeSubscription(supabase, id);
        break;

      case 'cancel':
        if (existing.status === 'cancelled') {
          return NextResponse.json(
            { error: 'Abonnement deja resilie' },
            { status: 400 }
          );
        }
        result = await cancelSubscription(supabase, id);
        break;
    }

    if (result?.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('PATCH /api/subscriptions/[id]/status error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du changement de statut' },
      { status: 500 }
    );
  }
}
