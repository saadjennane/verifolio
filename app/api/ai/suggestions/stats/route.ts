import { NextResponse } from 'next/server';
import { getSuggestionsStats } from '@/lib/ai';

/**
 * GET /api/ai/suggestions/stats
 * Récupère les statistiques des suggestions actives
 */
export async function GET(request: Request) {
  try {
    const result = await getSuggestionsStats();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ stats: result.data });
  } catch (error) {
    console.error('Error getting AI suggestions stats:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
