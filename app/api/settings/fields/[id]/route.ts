import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { updateCustomField, deleteCustomField } from '@/lib/settings';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/settings/fields/:id
 * Update a custom field
 * Body: { label?, is_active?, is_visible_default? }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the field belongs to the user
    const { data: field } = await supabase
      .from('custom_fields')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!field) {
      return NextResponse.json({ error: 'Champ non trouvé' }, { status: 404 });
    }

    const result = await updateCustomField(supabase, id, {
      label: body.label,
      is_active: body.is_active,
      is_visible_default: body.is_visible_default,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('PUT /api/settings/fields/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/fields/:id
 * Delete a custom field
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the field belongs to the user
    const { data: field } = await supabase
      .from('custom_fields')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!field) {
      return NextResponse.json({ error: 'Champ non trouvé' }, { status: 404 });
    }

    const result = await deleteCustomField(supabase, id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/settings/fields/:id error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
