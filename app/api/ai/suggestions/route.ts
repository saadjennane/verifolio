import { NextResponse } from 'next/server';
import { listSuggestions, createSuggestion, detectNewSuggestions } from '@/lib/ai';
import type { SuggestionType, SuggestionPriority, EntityType } from '@/lib/ai';

/**
 * GET /api/ai/suggestions
 * Liste les suggestions IA avec filtres
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const suggestion_type = searchParams.get('suggestion_type') as SuggestionType | null;
    const priority = searchParams.get('priority') as SuggestionPriority | null;
    const entity_type = searchParams.get('entity_type') as EntityType | null;
    const entity_id = searchParams.get('entity_id');

    const filter: any = {};
    if (status) filter.status = status;
    if (suggestion_type) filter.suggestion_type = suggestion_type;
    if (priority) filter.priority = priority;
    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;

    const result = await listSuggestions(filter);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ suggestions: result.data });
  } catch (error) {
    console.error('Error listing AI suggestions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des suggestions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/suggestions
 * Créer une nouvelle suggestion manuellement (pour tests ou usage avancé)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await createSuggestion(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ suggestion: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI suggestion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la suggestion' },
      { status: 500 }
    );
  }
}
