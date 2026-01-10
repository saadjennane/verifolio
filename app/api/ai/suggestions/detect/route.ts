import { NextResponse } from 'next/server';
import { detectNewSuggestions } from '@/lib/ai';

/**
 * POST /api/ai/suggestions/detect
 * Déclenche la détection de nouvelles suggestions
 */
export async function POST(request: Request) {
  try {
    const result = await detectNewSuggestions();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Détection effectuée', data: result.data });
  } catch (error) {
    console.error('Error detecting new AI suggestions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la détection des suggestions' },
      { status: 500 }
    );
  }
}
