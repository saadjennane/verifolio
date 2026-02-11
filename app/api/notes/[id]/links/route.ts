import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNoteLinks, addNoteLink, removeNoteLink } from '@/lib/notes/notes';
import type { NoteEntityType } from '@/lib/notes/types';

// GET /api/notes/[id]/links - Get note links
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const result = await getNoteLinks(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ links: result.data });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]/links:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/notes/[id]/links - Add link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { entity_type, entity_id } = body as {
      entity_type: NoteEntityType;
      entity_id: string;
    };

    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'entity_type et entity_id sont requis' },
        { status: 400 }
      );
    }

    const result = await addNoteLink(supabase, id, entity_type, entity_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ link: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/notes/[id]/links:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id]/links - Remove link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type') as NoteEntityType;
    const entityId = searchParams.get('entity_id');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type et entity_id sont requis' },
        { status: 400 }
      );
    }

    const result = await removeNoteLink(supabase, id, entityType, entityId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]/links:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
