import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * DELETE /api/clients/bulk
 * Soft delete multiple clients
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
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', ids)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      console.error('Bulk delete clients error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data?.length || 0,
    });
  } catch (error) {
    console.error('DELETE /api/clients/bulk error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/bulk
 * Update multiple clients (type change)
 * Body: { ids: string[], updates: { type: 'particulier' | 'entreprise' } }
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

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates requis' },
        { status: 400 }
      );
    }

    // Validate allowed updates
    const allowedFields = ['type'];
    const updateData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'type' && !['particulier', 'entreprise'].includes(value as string)) {
          return NextResponse.json(
            { error: 'type invalide (particulier ou entreprise)' },
            { status: 400 }
          );
        }
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune mise a jour valide' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('user_id', userId)
      .in('id', ids)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      console.error('Bulk update clients error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    });
  } catch (error) {
    console.error('PATCH /api/clients/bulk error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour' },
      { status: 500 }
    );
  }
}
