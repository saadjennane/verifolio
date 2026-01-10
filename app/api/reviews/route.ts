import { NextResponse } from 'next/server';
import { listAllReviews } from '@/lib/reviews';

/**
 * GET /api/reviews
 * Liste toutes les reviews de l'utilisateur
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const isPublishedParam = url.searchParams.get('is_published');
    const clientId = url.searchParams.get('client_id');

    const filter: { is_published?: boolean; client_id?: string } = {};

    if (isPublishedParam !== null) {
      filter.is_published = isPublishedParam === 'true';
    }

    if (clientId) {
      filter.client_id = clientId;
    }

    const result = await listAllReviews(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ reviews: result.data });
  } catch (error) {
    console.error('Error listing reviews:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}
