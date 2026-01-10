import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { restoreItem, permanentlyDeleteItem } from '@/lib/trash/trash';
import type { TrashEntityType } from '@/lib/trash/types';

interface RouteParams {
  params: Promise<{
    entityType: string;
    id: string;
  }>;
}

const validEntityTypes: TrashEntityType[] = [
  'client',
  'contact',
  'deal',
  'mission',
  'quote',
  'invoice',
  'proposal',
];

// POST /api/trash/[entityType]/[id]/restore - Restore an item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { entityType, id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (!validEntityTypes.includes(entityType as TrashEntityType)) {
      return NextResponse.json({ error: 'Type d\'entite invalide' }, { status: 400 });
    }

    const result = await restoreItem(supabase, user.id, entityType as TrashEntityType, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Element restaure avec succes' });
  } catch (error) {
    console.error('Error restoring item:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/trash/[entityType]/[id]/restore - Permanently delete an item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { entityType, id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    if (!validEntityTypes.includes(entityType as TrashEntityType)) {
      return NextResponse.json({ error: 'Type d\'entite invalide' }, { status: 400 });
    }

    const result = await permanentlyDeleteItem(supabase, user.id, entityType as TrashEntityType, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Element supprime definitivement' });
  } catch (error) {
    console.error('Error permanently deleting item:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
