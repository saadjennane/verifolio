import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * DELETE /api/quotes/bulk
 * Soft delete multiple quotes
 * Body: { ids: string[] }
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids requis (tableau non vide)' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', ids)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      console.error('Bulk delete quotes error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
    });
  } catch (error) {
    console.error('DELETE /api/quotes/bulk error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quotes/bulk
 * Update status for multiple quotes
 * Body: { ids: string[], updates: { status: 'brouillon' | 'envoye' } }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids requis (tableau non vide)' },
        { status: 400 }
      );
    }

    if (!updates?.status) {
      return NextResponse.json(
        { error: 'status requis dans updates' },
        { status: 400 }
      );
    }

    const validStatuses = ['brouillon', 'envoye'];
    if (!validStatuses.includes(updates.status)) {
      return NextResponse.json(
        { error: `status invalide (${validStatuses.join(', ')})` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({ status: updates.status })
      .eq('user_id', userId)
      .in('id', ids)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      console.error('Bulk update quotes error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    });
  } catch (error) {
    console.error('PATCH /api/quotes/bulk error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}
