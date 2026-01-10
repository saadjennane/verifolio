/**
 * API Send History - Récupère l'historique d'envoi pour une ressource
 * GET /api/send/history?resource_type=xxx&resource_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResourceEvents, getResourceAnalytics } from '@/lib/tracking/events';
import { getLinksForResource, buildPublicUrl } from '@/lib/tracking/public-links';
import type { ResourceType, SendHistoryItem } from '@/lib/send/types';
import { DOCUMENT_SEND_CONFIGS } from '@/lib/send/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get('resource_type') as ResourceType;
    const resourceId = searchParams.get('resource_id');

    // Validation des paramètres
    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: 'Paramètres manquants: resource_type et resource_id requis' },
        { status: 400 }
      );
    }

    // Vérifier que le type est valide
    if (!DOCUMENT_SEND_CONFIGS[resourceType]) {
      return NextResponse.json(
        { error: `Type de ressource invalide: ${resourceType}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'historique depuis outbound_messages
    const { data: messages, error: messagesError } = await supabase
      .from('outbound_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('doc_type', resourceType)
      .eq('document_id', resourceId)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('[SendHistory] Error fetching messages:', messagesError);
    }

    // Transformer en format SendHistoryItem
    const history: SendHistoryItem[] = (messages || []).map((msg) => ({
      id: msg.id,
      sent_at: msg.sent_at,
      recipient_emails: msg.recipient_emails || [],
      recipient_count: msg.recipient_emails?.length || 0,
      status: msg.status as 'pending' | 'sent' | 'failed',
      subject: msg.subject,
      message: msg.message,
      error_message: msg.error_message,
    }));

    // Récupérer les événements de tracking
    const events = await getResourceEvents(resourceType, resourceId);

    // Récupérer les analytics
    const analytics = await getResourceAnalytics(resourceType, resourceId);

    // Récupérer les liens publics
    const links = await getLinksForResource(user.id, resourceType, resourceId);

    // Lien actif actuel
    const activeLink = links.find(l => !l.is_revoked);
    const publicUrl = activeLink ? buildPublicUrl(resourceType, activeLink.token) : null;

    return NextResponse.json({
      history,
      events,
      analytics,
      public_link: activeLink ? {
        token: activeLink.token,
        url: publicUrl,
        created_at: activeLink.created_at,
        expires_at: activeLink.expires_at,
      } : null,
    });

  } catch (error) {
    console.error('[SendHistory] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    );
  }
}
