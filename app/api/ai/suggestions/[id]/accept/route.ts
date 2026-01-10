import { NextResponse } from 'next/server';
import { acceptSuggestion } from '@/lib/ai';

/**
 * POST /api/ai/suggestions/:id/accept
 * Accepte une suggestion
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await acceptSuggestion(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ suggestion: result.data });
  } catch (error) {
    console.error('Error accepting AI suggestion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'acceptation de la suggestion' },
      { status: 500 }
    );
  }
}
