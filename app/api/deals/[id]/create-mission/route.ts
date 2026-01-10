import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { createMission } from '@/lib/missions';

/**
 * POST /api/deals/:id/create-mission
 * Crée une mission à partir d'un deal gagné
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que le deal appartient à l'utilisateur et est WON
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, status, client_id, title, description, final_amount, estimated_amount, mission_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal introuvable' }, { status: 404 });
    }

    if (deal.status !== 'won') {
      return NextResponse.json(
        { error: 'Le deal doit être au statut "Gagné" pour créer une mission' },
        { status: 400 }
      );
    }

    // Si une mission existe déjà, retourner la mission existante au lieu d'une erreur
    if (deal.mission_id) {
      const { data: existingMission } = await supabase
        .from('missions')
        .select('*')
        .eq('id', deal.mission_id)
        .single();

      if (existingMission) {
        return NextResponse.json({
          success: true,
          mission: existingMission,
          message: 'Une mission existe déjà pour ce deal',
        });
      }
    }

    // Récupérer les contacts du deal
    const { data: dealContacts } = await supabase
      .from('deal_contacts')
      .select('contact_id')
      .eq('deal_id', id);

    const contactIds = dealContacts?.map((dc) => dc.contact_id) || [];

    // Créer la mission
    const missionResult = await createMission({
      deal_id: id,
      client_id: deal.client_id,
      title: deal.title,
      description: deal.description,
      estimated_amount: deal.final_amount || deal.estimated_amount,
      contacts: contactIds,
      visible_on_verifolio: false,
    });

    if (!missionResult.success) {
      return NextResponse.json(
        { error: missionResult.error },
        { status: 500 }
      );
    }

    // Lier la mission au deal
    const { error: updateError } = await supabase
      .from('deals')
      .update({ mission_id: missionResult.data.id })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur lors du lien de la mission au deal' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mission: missionResult.data,
    });
  } catch (error) {
    console.error('Error creating mission from deal:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
