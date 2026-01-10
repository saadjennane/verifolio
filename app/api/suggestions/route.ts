import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { type ContextType } from '@/lib/chat/context';
import {
  getSuggestionsForScreen,
  filterSuggestionsByConditions,
  type ScreenSuggestion,
} from '@/lib/chat/screen-suggestions';

// ============================================================================
// Types
// ============================================================================

interface SuggestionResponse {
  id: string;
  label: string;
  prompt: string;
  source: 'screen' | 'business';
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contextType = searchParams.get('contextType') as ContextType | null;
    const contextId = searchParams.get('contextId') || 'global';
    const dismissedIds = searchParams.get('dismissed')?.split(',').filter(Boolean) || [];

    console.log('[Suggestions API] Request:', { contextType, contextId, dismissedIds });

    // Si pas de contexte, pas de suggestions
    if (!contextType) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      console.log('[Suggestions API] No user ID, returning empty');
      return NextResponse.json({ suggestions: [] });
    }

    // ========================================================================
    // 1. Récupérer les suggestions basées sur l'écran
    // ========================================================================
    console.log('[Suggestions API] Calling getSuggestionsForScreen with:', contextType, contextId);
    const screenSuggestions = getSuggestionsForScreen(contextType, contextId);
    console.log('[Suggestions API] Screen suggestions found:', screenSuggestions.length, screenSuggestions);

    // Si on est sur une page détail (UUID), récupérer les données de l'entité
    let entityData: Record<string, unknown> | null = null;
    if (contextId !== 'list' && contextId !== 'global') {
      entityData = await getEntityData(supabase, contextType, contextId);
    }

    // Filtrer les suggestions par conditions
    const filteredScreenSuggestions = filterSuggestionsByConditions(
      screenSuggestions,
      entityData
    );

    // Retirer les suggestions déjà dismissées
    const activeSuggestions = filteredScreenSuggestions.filter(
      s => !dismissedIds.includes(s.id)
    );

    // Convertir au format de réponse
    const suggestions: SuggestionResponse[] = activeSuggestions
      .slice(0, 3) // Max 3 suggestions
      .map(s => ({
        id: s.id,
        label: s.label,
        prompt: s.prompt,
        source: 'screen' as const,
      }));

    console.log('[Suggestions API] Returning', suggestions.length, 'suggestions:', suggestions.map(s => s.id));
    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Récupère les données d'une entité pour évaluer les conditions
 */
async function getEntityData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contextType: ContextType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  const tableMap: Partial<Record<ContextType, string>> = {
    deal: 'deals',
    mission: 'missions',
    invoice: 'invoices',
    quote: 'quotes',
    client: 'clients',
    proposal: 'proposals',
    brief: 'briefs',
    review: 'reviews',
  };

  const tableName = tableMap[contextType];
  if (!tableName) return null;

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', entityId)
      .single();

    if (error) {
      console.log('[Suggestions API] Error fetching entity:', error.message);
      return null;
    }

    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}
