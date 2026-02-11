import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNote, getNotes } from '@/lib/notes/notes';
import type { CreateNotePayload, NoteEntityType } from '@/lib/notes/types';

// GET /api/notes - List notes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pinned = searchParams.get('pinned');
    const entityType = searchParams.get('entity_type') as NoteEntityType | null;
    const entityId = searchParams.get('entity_id');

    const filters: {
      pinned?: boolean;
      entity_type?: NoteEntityType;
      entity_id?: string;
    } = {};

    if (pinned !== null) {
      filters.pinned = pinned === 'true';
    }

    if (entityType && entityId) {
      filters.entity_type = entityType;
      filters.entity_id = entityId;
    }

    const result = await getNotes(supabase, Object.keys(filters).length > 0 ? filters : undefined);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ notes: result.data });
  } catch (error) {
    console.error('Error in GET /api/notes:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create note
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const payload: CreateNotePayload = {
      title: body.title,
      content: body.content,
      content_json: body.content_json,
      color: body.color,
      links: body.links,
    };

    const result = await createNote(supabase, user.id, payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ note: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/notes:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
