import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clients/:id/contacts
 * Récupère tous les contacts liés au client
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: clientId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que le client appartient à l'utilisateur
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Récupérer tous les contacts du client
    const { data: clientContacts, error } = await supabase
      .from('client_contacts')
      .select(`
        id,
        contact_id,
        role,
        is_primary,
        handles_billing,
        handles_commercial,
        handles_ops,
        handles_management,
        contact:contacts(id, nom, prenom, civilite, email, telephone)
      `)
      .eq('client_id', clientId);

    if (error) {
      console.error('GET /api/clients/:id/contacts error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

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

    // Formater les contacts
    const formattedContacts = (clientContacts || []).map(cc => {
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
      };
    }).filter(Boolean);

    return NextResponse.json({ data: formattedContacts });
  } catch (error) {
    console.error('GET /api/clients/:id/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/clients/:id/contacts
 * Ajoute un contact au client
 * Body: { contact_id: string, role?: string, is_primary?: boolean }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: clientId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { contact_id, role, is_primary = false } = body;

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id est requis' }, { status: 400 });
    }

    // Vérifier que le client appartient à l'utilisateur
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Vérifier que le contact existe et appartient à l'utilisateur
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 });
    }

    // Si ce contact doit être primaire, retirer le statut primaire des autres
    if (is_primary) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', clientId);
    }

    // Ajouter la liaison
    const { data: newLink, error: insertError } = await supabase
      .from('client_contacts')
      .insert({
        client_id: clientId,
        contact_id,
        role: role || null,
        is_primary,
      })
      .select()
      .single();

    if (insertError) {
      // Vérifier si c'est une erreur de doublon
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Ce contact est déjà lié à ce client' }, { status: 400 });
      }
      console.error('POST /api/clients/:id/contacts error:', insertError);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ data: newLink }, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients/:id/contacts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
