import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrashedItems, cleanupOldTrashedItems } from '@/lib/trash/trash';

// GET /api/trash - List all trashed items
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const items = await getTrashedItems(supabase, user.id);

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/trash - Cleanup old items (older than 30 days)
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const result = await cleanupOldTrashedItems(supabase, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      message: `${result.deletedCount} element(s) supprime(s) definitivement`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error cleaning up trash:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
