import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emptyTrash } from '@/lib/trash/trash';

// DELETE /api/trash/empty - Empty entire trash (permanently delete all items)
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const result = await emptyTrash(supabase, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      message: `${result.deletedCount} element(s) supprime(s) definitivement`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
