import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { permanentlyDeleteItem } from '@/lib/trash/trash';
import type { TrashEntityType } from '@/lib/trash/types';

const VALID_ENTITY_TYPES: TrashEntityType[] = [
  'client',
  'contact',
  'deal',
  'mission',
  'quote',
  'invoice',
  'proposal',
];

// DELETE /api/trash/[entityType]/[id]/delete - Permanently delete an item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entityType: string; id: string }> }
) {
  try {
    const { entityType, id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (!VALID_ENTITY_TYPES.includes(entityType as TrashEntityType)) {
      return NextResponse.json({ error: 'Type d\'entite invalide' }, { status: 400 });
    }

    const result = await permanentlyDeleteItem(
      supabase,
      user.id,
      entityType as TrashEntityType,
      id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Element supprime definitivement' });
  } catch (error) {
    console.error('Error permanently deleting item:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
