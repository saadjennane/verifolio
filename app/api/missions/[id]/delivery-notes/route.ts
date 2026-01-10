import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DeliveryNote, DeliveryNoteStatus } from '@/lib/supabase/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/missions/:id/delivery-notes
 * List delivery notes for a mission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: missionId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('mission_id', missionId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching delivery notes:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/missions/:id/delivery-notes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/missions/:id/delivery-notes
 * Create a new delivery note for a mission
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: missionId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    // Get mission to verify ownership and get client_id
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, client_id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }

    // Get company for numbering
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('next_delivery_note_number, delivery_note_prefix')
      .eq('user_id', user.id)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      return NextResponse.json({ error: 'Erreur configuration entreprise' }, { status: 500 });
    }

    // Generate delivery note number
    const prefix = company?.delivery_note_prefix || 'BL-';
    const nextNumber = company?.next_delivery_note_number || 1;
    const year = new Date().getFullYear().toString().slice(-2);
    const deliveryNoteNumber = `${prefix}${String(nextNumber).padStart(3, '0')}-${year}`;

    // Create delivery note
    const { data: deliveryNote, error: insertError } = await supabase
      .from('delivery_notes')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        client_id: mission.client_id,
        delivery_note_number: deliveryNoteNumber,
        title: title.trim(),
        status: 'DRAFT' as DeliveryNoteStatus,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating delivery note:', insertError);
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }

    // Increment company number
    await supabase
      .from('companies')
      .update({ next_delivery_note_number: nextNumber + 1 })
      .eq('user_id', user.id);

    return NextResponse.json({ data: deliveryNote }, { status: 201 });
  } catch (error) {
    console.error('POST /api/missions/:id/delivery-notes error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
