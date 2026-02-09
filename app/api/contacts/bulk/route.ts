import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * DELETE /api/contacts/bulk
 * Soft delete multiple contacts
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

    // Soft delete: set deleted_at
    const { data, error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', ids)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      console.error('Bulk delete contacts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
    });
  } catch (error) {
    console.error('DELETE /api/contacts/bulk error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}
