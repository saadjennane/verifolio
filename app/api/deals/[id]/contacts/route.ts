import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/deals/:id/contacts
 * Récupère les contacts liés au deal + tous les contacts du client (pour sélection)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le deal avec son client_id
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, client_id')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal non trouvé' }, { status: 404 });
    }

    // Récupérer les contacts actuellement liés au deal
    const { data: dealContacts } = await supabase
      .from('deal_contacts')
      .select(`
        id,
        contact_id,
        role,
        is_primary,
        contact:contacts(id, nom, prenom, civilite, email, telephone)
      `)
      .eq('deal_id', dealId);

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
      .eq('client_id', deal.client_id);

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

    // Set des contacts déjà liés au deal
    const linkedContactIds = new Set(
      dealContacts?.map(dc => {
        const contact = extractContact(dc.contact);
        return contact?.id;
      }).filter(Boolean) || []
    );

    // Formater les contacts du deal
    const formattedDealContacts = (dealContacts || []).map(dc => {
      const contact = extractContact(dc.contact);
      return {
        id: dc.id,
        contact_id: dc.contact_id,
        role: dc.role,
        is_primary: dc.is_primary,
        contact,
      };
    }).filter(dc => dc.contact);

    // Formater les contacts du client (tous, avec indication de liaison au deal)
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
        linked_to_deal: linkedContactIds.has(contact.id),
      };
    }).filter(Boolean);

    return NextResponse.json({
      dealContacts: formattedDealContacts,
      clientContacts: formattedClientContacts,
    });
  } catch (error) {
    console.error('GET /api/deals/:id/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PUT /api/deals/:id/contacts
 * Met à jour les contacts liés au deal (remplace la liste complète)
 * Body: { contact_ids: string[] }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
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

    // Vérifier que le deal appartient à l'utilisateur
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal non trouvé' }, { status: 404 });
    }

    // Supprimer tous les contacts actuels du deal
    await supabase
      .from('deal_contacts')
      .delete()
      .eq('deal_id', dealId);

    // Ajouter les nouveaux contacts
    if (contact_ids.length > 0) {
      const newContacts = contact_ids.map((contact_id, index) => ({
        deal_id: dealId,
        contact_id,
        is_primary: index === 0, // Premier contact = primary
      }));

      const { error: insertError } = await supabase
        .from('deal_contacts')
        .insert(newContacts);

      if (insertError) {
        console.error('Error inserting deal contacts:', insertError);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/deals/:id/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
