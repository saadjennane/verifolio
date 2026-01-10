import { NextResponse } from 'next/server';
import { listDeals, createDeal } from '@/lib/deals';
import type { CreateDealPayload, DealStatus } from '@/lib/deals';

/**
 * GET /api/deals
 * Liste les deals avec filtres optionnels
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as DealStatus | null;
    const clientId = url.searchParams.get('client_id');

    const filter = {
      ...(status && { status }),
      ...(clientId && { client_id: clientId }),
    };

    const result = await listDeals(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ deals: result.data });
  } catch (error) {
    console.error('Error listing deals:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des deals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deals
 * Crée un nouveau deal
 */
export async function POST(request: Request) {
  try {
    const body: CreateDealPayload = await request.json();

    if (!body.client_id || !body.title) {
      return NextResponse.json(
        { error: 'client_id et title sont requis' },
        { status: 400 }
      );
    }

    const result = await createDeal(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ deal: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du deal' },
      { status: 500 }
    );
  }
}
