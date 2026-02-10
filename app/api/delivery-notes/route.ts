import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/delivery-notes
 * List all delivery notes (excluding deleted)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const missionId = searchParams.get('mission_id');

    let query = supabase
      .from('delivery_notes')
      .select(`
        *,
        client:clients!delivery_notes_client_id_fkey(id, nom),
        mission:missions!delivery_notes_mission_id_fkey(id, title)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date_emission', { ascending: false });

    if (missionId) {
      query = query.eq('mission_id', missionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching delivery notes:', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des bons de livraison' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/delivery-notes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/delivery-notes
 * Create a new delivery note
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { mission_id, client_id, date_emission, notes, line_items } = body;

    if (!mission_id || !client_id) {
      return NextResponse.json(
        { error: 'mission_id et client_id sont requis' },
        { status: 400 }
      );
    }

    // Generate BL number
    const { data: numeroData, error: numeroError } = await supabase
      .rpc('generate_bl_number', { p_user_id: user.id });

    if (numeroError) {
      console.error('Error generating BL number:', numeroError);
      return NextResponse.json({ error: 'Erreur lors de la génération du numéro' }, { status: 500 });
    }

    // Create delivery note
    const { data, error } = await supabase
      .from('delivery_notes')
      .insert({
        user_id: user.id,
        mission_id,
        client_id,
        numero: numeroData,
        date_emission: date_emission || new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating delivery note:', error);
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }

    // Create line items if provided
    if (line_items && Array.isArray(line_items) && line_items.length > 0) {
      const itemsToInsert = line_items.map((item: { description: string; quantite?: number; unite?: string }, index: number) => ({
        delivery_note_id: data.id,
        description: item.description,
        quantite: item.quantite ?? 1,
        unite: item.unite ?? 'unité',
        ordre: index,
      }));

      const { error: itemsError } = await supabase
        .from('delivery_note_line_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating line items:', itemsError);
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/delivery-notes:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
