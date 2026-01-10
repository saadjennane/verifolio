import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/deals/:id/tags/reorder
 * Réordonne les tags d'un deal
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { tag_orders } = body; // [{ tag: "tag1", order: 0 }, ...]

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que le deal appartient à l'utilisateur
    const { data: deal } = await supabase
      .from('deals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: 'Deal introuvable' }, { status: 404 });
    }

    // Appeler la fonction de réordonnancement
    const { error } = await supabase.rpc('reorder_deal_tags', {
      p_deal_id: id,
      p_tag_orders: tag_orders,
    });

    if (error) {
      console.error('Error reordering deal tags:', error);
      return NextResponse.json(
        { error: 'Erreur lors du réordonnancement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering deal tags:', error);
    return NextResponse.json(
      { error: 'Erreur lors du réordonnancement des tags' },
      { status: 500 }
    );
  }
}
