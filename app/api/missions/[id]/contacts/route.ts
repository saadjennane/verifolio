import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/missions/:id/contacts
 * Récupère les contacts liés à la mission + tous les contacts du client (pour sélection)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: missionId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la mission avec son client_id
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, client_id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
    }

    // Récupérer les contacts actuellement liés à la mission
    const { data: missionContacts } = await supabase
      .from('mission_contacts')
      .select(`
        id,
        contact_id,
        role,
        is_primary,
        contact:contacts(id, nom, prenom, civilite, email, telephone)
      `)
      .eq('mission_id', missionId);

    // Récupérer tous les contacts du client avec leurs responsabilités
    const { data: clientContacts } = await supabase
      .from('client_contacts')
      .select(`
        id,
        role,
        is_primary,
        handles_billing,
        handles_commercial,
        handles_ops,
        handles_management,
        contact:contacts(id, nom, prenom, civilite, email, telephone)
      `)
      .eq('client_id', mission.client_id);

    // Extraire le contact depuis la relation (peut être array ou object)
    const extractContact = (contactData: unknown) => {
      if (!contactData) return null;
      const contact = Array.isArray(contactData) ? contactData[0] : contactData;
      if (!contact || typeof contact !== 'object') return null;
      return contact as {
        id: string;
        nom: string;
        prenom: string | null;
        civilite: string | null;
        email: string | null;
        telephone: string | null;
      };
    };

    // Set des contacts déjà liés à la mission
    const linkedContactIds = new Set(
      missionContacts?.map(mc => {
        const contact = extractContact(mc.contact);
        return contact?.id;
      }).filter(Boolean) || []
    );

    // Formater les contacts de la mission
    const formattedMissionContacts = (missionContacts || []).map(mc => {
      const contact = extractContact(mc.contact);
      return {
        id: mc.id,
        contact_id: mc.contact_id,
        role: mc.role,
        is_primary: mc.is_primary,
        contact,
      };
    }).filter(mc => mc.contact);

    // Formater les contacts du client (tous, avec indication de liaison à la mission)
    const formattedClientContacts = (clientContacts || []).map(cc => {
      const contact = extractContact(cc.contact);
      if (!contact) return null;

      return {
        contact_id: contact.id,
        contact,
        role: cc.role,
        is_primary: cc.is_primary,
        handles_billing: cc.handles_billing,
        handles_commercial: cc.handles_commercial,
        handles_ops: cc.handles_ops,
        handles_management: cc.handles_management,
        linked_to_mission: linkedContactIds.has(contact.id),
      };
    }).filter(Boolean);

    return NextResponse.json({
      missionContacts: formattedMissionContacts,
      clientContacts: formattedClientContacts,
    });
  } catch (error) {
    console.error('GET /api/missions/:id/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/missions/:id/contacts
 * Met à jour les contacts liés à la mission (remplace la liste complète)
 * Body: { contact_ids: string[] }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: missionId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { contact_ids } = body as { contact_ids: string[] };

    if (!Array.isArray(contact_ids)) {
      return NextResponse.json({ error: 'contact_ids doit être un tableau' }, { status: 400 });
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, client_id')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
    }

    // Récupérer les contacts du client pour déterminer le primary
    const { data: clientContacts } = await supabase
      .from('client_contacts')
      .select('contact_id, is_primary')
      .eq('client_id', mission.client_id);

    const primaryClientContact = clientContacts?.find(cc => cc.is_primary);

    // Supprimer tous les contacts actuels de la mission
    await supabase
      .from('mission_contacts')
      .delete()
      .eq('mission_id', missionId);

    // Ajouter les nouveaux contacts
    if (contact_ids.length > 0) {
      const newContacts = contact_ids.map((contact_id, index) => ({
        mission_id: missionId,
        contact_id,
        is_primary: primaryClientContact
          ? contact_id === primaryClientContact.contact_id
          : index === 0,
      }));

      const { error: insertError } = await supabase
        .from('mission_contacts')
        .insert(newContacts);

      if (insertError) {
        console.error('Error inserting mission contacts:', insertError);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/missions/:id/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
