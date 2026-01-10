import { NextResponse } from 'next/server';
import { publishReview } from '@/lib/reviews';

/**
 * PATCH /api/reviews/:id/publish
 * Publie ou dépublie une review
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { is_published } = body;

    if (typeof is_published !== 'boolean') {
      return NextResponse.json(
        { error: 'is_published doit être un booléen' },
        { status: 400 }
      );
    }

    const result = await publishReview(id, is_published);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      review: result.data,
    });
  } catch (error) {
    console.error('Error publishing review:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
