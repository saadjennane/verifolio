import { NextResponse } from 'next/server';
import { remindReviewRequest } from '@/lib/reviews';

/**
 * POST /api/reviews/requests/:id/remind
 * Relance une demande d'avis
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await remindReviewRequest(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      request: result.data,
      message: 'Demande relancée avec succès',
    });
  } catch (error) {
    console.error('Error reminding review request:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la relance' },
      { status: 500 }
    );
  }
}
