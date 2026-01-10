import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ContactWithResponsibilities } from '@/lib/documents/recipient-selection';

// Helper pour extraire un contact depuis une relation Supabase (peut être array ou object)
function extractContact(contactData: unknown): {
  id: string;
  nom: string;
  prenom: string | null;
  civilite: string | null;
  email: string | null;
  telephone: string | null;
} | null {
  if (!contactData) return null;

  // Si c'est un tableau, prendre le premier élément
  const contact = Array.isArray(contactData) ? contactData[0] : contactData;

  if (!contact || typeof contact !== 'object') return null;

  const c = contact as Record<string, unknown>;
  if (!c.id || !c.nom) return null;

  return {
    id: c.id as string,
    nom: c.nom as string,
    prenom: (c.prenom as string | null) || null,
    civilite: (c.civilite as string | null) || null,
    email: (c.email as string | null) || null,
    telephone: (c.telephone as string | null) || null,
  };
}

/**
 * GET /api/documents/recipients
 * Récupère les contacts disponibles pour l'envoi d'un document
 *
 * Query params:
 * - entityType: 'deal' | 'mission' | 'client'
 * - entityId: UUID de l'entité
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Paramètres manquants: entityType, entityId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let clientId: string | null = null;
    const teamContactIds: Set<string> = new Set();
    const contacts: ContactWithResponsibilities[] = [];

    // 1. Récupérer l'entité et ses contacts team
    if (entityType === 'deal') {
      // Récupérer le deal et son client_id
      const { data: deal, error } = await supabase
        .from('deals')
        .select('client_id')
        .eq('id', entityId)
        .single();

      if (error || !deal) {
        return NextResponse.json({ error: 'Deal non trouvé' }, { status: 404 });
      }

      clientId = deal.client_id;

      // Récupérer les contacts de la team du deal
      const { data: dealContacts } = await supabase
        .from('deal_contacts')
        .select(`
          id,
          role,
          is_primary,
          contact:contacts(id, nom, prenom, civilite, email, telephone)
        `)
        .eq('deal_id', entityId);

      if (dealContacts) {
        for (const dc of dealContacts) {
          const contact = extractContact(dc.contact);
          if (contact) {
            teamContactIds.add(contact.id);
            contacts.push({
              id: contact.id,
              nom: contact.nom,
              prenom: contact.prenom,
              civilite: contact.civilite,
              email: contact.email,
              telephone: contact.telephone,
              role: dc.role,
              is_primary: dc.is_primary,
              source: 'team',
              linkId: dc.id,
            });
          }
        }
      }

    } else if (entityType === 'mission') {
      // Récupérer la mission et son client_id
      const { data: mission, error } = await supabase
        .from('missions')
        .select('client_id')
        .eq('id', entityId)
        .single();

      if (error || !mission) {
        return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
      }

      clientId = mission.client_id;

      // Récupérer les contacts de la team de la mission
      const { data: missionContacts } = await supabase
        .from('mission_contacts')
        .select(`
          id,
          role,
          is_primary,
          contact:contacts(id, nom, prenom, civilite, email, telephone)
        `)
        .eq('mission_id', entityId);

      if (missionContacts) {
        for (const mc of missionContacts) {
          const contact = extractContact(mc.contact);
          if (contact) {
            teamContactIds.add(contact.id);
            contacts.push({
              id: contact.id,
              nom: contact.nom,
              prenom: contact.prenom,
              civilite: contact.civilite,
              email: contact.email,
              telephone: contact.telephone,
              role: mc.role,
              is_primary: mc.is_primary,
              source: 'team',
              linkId: mc.id,
            });
          }
        }
      }

    } else if (entityType === 'client') {
      clientId = entityId;
    }

    // 2. Récupérer les autres contacts du client (qui ne sont pas déjà dans la team)
    if (clientId) {
      const { data: clientContacts } = await supabase
        .from('client_contacts')
        .select(`
          id,
          role,
          is_primary,
          handles_billing,
          handles_ops,
          handles_commercial,
          handles_management,
          contact:contacts(id, nom, prenom, civilite, email, telephone)
        `)
        .eq('client_id', clientId);

      if (clientContacts) {
        for (const cc of clientContacts) {
          const contact = extractContact(cc.contact);
          if (contact && !teamContactIds.has(contact.id)) {
            contacts.push({
              id: contact.id,
              nom: contact.nom,
              prenom: contact.prenom,
              civilite: contact.civilite,
              email: contact.email,
              telephone: contact.telephone,
              role: cc.role,
              is_primary: cc.is_primary,
              handles_billing: cc.handles_billing,
              handles_ops: cc.handles_ops,
              handles_commercial: cc.handles_commercial,
              handles_management: cc.handles_management,
              source: 'client',
              linkId: cc.id,
            });
          } else if (contact && teamContactIds.has(contact.id)) {
            // Enrichir le contact team avec les responsabilités du client_contact
            const existingContact = contacts.find((c) => c.id === contact.id);
            if (existingContact) {
              existingContact.handles_billing = cc.handles_billing;
              existingContact.handles_ops = cc.handles_ops;
              existingContact.handles_commercial = cc.handles_commercial;
              existingContact.handles_management = cc.handles_management;
              // Garder is_primary de client_contacts si true
              if (cc.is_primary) {
                existingContact.is_primary = true;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      contacts,
      clientId,
    });

  } catch (error) {
    console.error('Erreur récupération destinataires:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des destinataires' },
      { status: 500 }
    );
  }
}
