import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNote, updateNote, deleteNote } from '@/lib/notes/notes';
import type { UpdateNotePayload } from '@/lib/notes/types';

// GET /api/notes/[id] - Get single note
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

    const result = await getNote(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ note: result.data });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PATCH /api/notes/[id] - Update note
export async function PATCH(
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
    const payload: UpdateNotePayload = {};

    if (body.title !== undefined) payload.title = body.title;
    if (body.content !== undefined) payload.content = body.content;
    if (body.content_json !== undefined) payload.content_json = body.content_json;
    if (body.color !== undefined) payload.color = body.color;
    if (body.pinned !== undefined) payload.pinned = body.pinned;

    const result = await updateNote(supabase, id, payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ note: result.data });
  } catch (error) {
    console.error('Error in PATCH /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Soft delete note
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

    const result = await deleteNote(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
