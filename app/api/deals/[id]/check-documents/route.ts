import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * GET /api/deals/:id/check-documents
 * Vérifie si un deal a des propositions ou devis envoyés
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que le deal appartient à l'utilisateur
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal introuvable' }, { status: 404 });
    }

    // Vérifier les devis liés directement au deal
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id')
      .eq('deal_id', id)
      .is('deleted_at', null);

    // Vérifier les propositions liées directement au deal
    const { data: proposals } = await supabase
      .from('proposals')
      .select('id')
      .eq('deal_id', id)
      .is('deleted_at', null);

    const hasQuote = (quotes?.length || 0) > 0;
    const hasProposal = (proposals?.length || 0) > 0;
    const hasAnyDocument = hasQuote || hasProposal;

    return NextResponse.json({
      hasQuote,
      hasProposal,
      hasAnyDocument,
      message: hasAnyDocument
        ? null
        : 'Aucune proposition ou devis n\'a été lié à ce deal',
    });
  } catch (error) {
    console.error('Error checking documents:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des documents' },
      { status: 500 }
    );
  }
}
