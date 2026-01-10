import { NextResponse } from 'next/server';
import { getReviewRequest } from '@/lib/reviews';

/**
 * GET /api/reviews/requests/:id
 * Récupère le détail d'une demande d'avis
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await getReviewRequest(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching review request:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la demande' },
      { status: 500 }
    );
  }
}
