import { NextResponse } from 'next/server';
import { getDeal, updateDeal, deleteDeal } from '@/lib/deals';
import type { UpdateDealPayload } from '@/lib/deals';

/**
 * GET /api/deals/:id
 * Récupère un deal avec toutes ses relations
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await getDeal(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ deal: result.data });
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du deal' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/deals/:id
 * Met à jour un deal
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body: UpdateDealPayload = await request.json();

    const result = await updateDeal(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ deal: result.data });
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du deal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deals/:id
 * Supprime un deal
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await deleteDeal(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du deal' },
      { status: 500 }
    );
  }
}
