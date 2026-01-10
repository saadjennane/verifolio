import { NextResponse } from 'next/server';
import { dismissSuggestion } from '@/lib/ai';

/**
 * POST /api/ai/suggestions/:id/dismiss
 * Rejette une suggestion
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await dismissSuggestion(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ suggestion: result.data });
  } catch (error) {
    console.error('Error dismissing AI suggestion:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rejet de la suggestion' },
      { status: 500 }
    );
  }
}
