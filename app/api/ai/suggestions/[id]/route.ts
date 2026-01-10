import { NextResponse } from 'next/server';
import { getSuggestion, updateSuggestion } from '@/lib/ai';

/**
 * GET /api/ai/suggestions/:id
 * Récupère une suggestion par ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await getSuggestion(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ suggestion: result.data });
  } catch (error) {
    console.error('Error getting AI suggestion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la suggestion' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/suggestions/:id
 * Met à jour une suggestion (changement de statut)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const result = await updateSuggestion(id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ suggestion: result.data });
  } catch (error) {
    console.error('Error updating AI suggestion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la suggestion' },
      { status: 500 }
    );
  }
}
