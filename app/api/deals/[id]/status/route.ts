import { NextResponse } from 'next/server';
import { updateDealStatus, backToDraft } from '@/lib/deals';
import type { DealStatus } from '@/lib/deals';

/**
 * PATCH /api/deals/:id/status
 * Change le statut d'un deal
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, back_to_draft } = body;

    // Si c'est une demande de retour en draft
    if (back_to_draft) {
      const result = await backToDraft(id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        deal: result.data,
        message: 'Deal retourné en mode brouillon',
      });
    }

    // Sinon, changement de statut normal
    if (!status) {
      return NextResponse.json(
        { error: 'Le champ status est requis' },
        { status: 400 }
      );
    }

    const validStatuses: DealStatus[] = ['new', 'draft', 'sent', 'won', 'lost', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const result = await updateDealStatus(id, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ deal: result.data });
  } catch (error) {
    console.error('Error updating deal status:', error);
    return NextResponse.json(
      { error: 'Erreur lors du changement de statut' },
      { status: 500 }
    );
  }
}
