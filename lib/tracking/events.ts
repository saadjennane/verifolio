/**
 * Gestion des événements de tracking
 * Log des événements et récupération pour analytics
 */

import { createClient } from '@/lib/supabase/server';
import type { ResourceType, EventType, TrackingEvent, ResourceAnalytics } from '@/lib/send/types';

// ============================================================================
// TYPES
// ============================================================================

interface LogEventParams {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  eventType: EventType;
  publicLinkId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// LOG EVENT
// ============================================================================

/**
 * Enregistre un événement de tracking
 */
export async function logTrackingEvent(params: LogEventParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('tracking_events').insert({
    user_id: params.userId,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    event_type: params.eventType,
    public_link_id: params.publicLinkId || null,
    metadata: params.metadata || {},
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
  });

  if (error) {
    console.error('[Tracking] Error logging event:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// CHECK IF ALREADY TRACKED (for first-visit-only tracking)
// ============================================================================

/**
 * Vérifie si un événement a déjà été tracké pour une ressource
 * Utilisé pour tracker uniquement la première visite
 */
export async function hasEventBeenTracked(
  resourceType: ResourceType,
  resourceId: string,
  eventType: EventType
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tracking_events')
    .select('id')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('event_type', eventType)
    .limit(1)
    .maybeSingle();

  return !!data;
}

/**
 * Log un événement seulement s'il n'a pas déjà été tracké
 * Retourne true si l'événement a été loggé, false s'il existait déjà
 */
export async function logEventIfFirst(params: LogEventParams): Promise<{ logged: boolean; error?: string }> {
  const alreadyTracked = await hasEventBeenTracked(
    params.resourceType,
    params.resourceId,
    params.eventType
  );

  if (alreadyTracked) {
    return { logged: false };
  }

  const result = await logTrackingEvent(params);
  return { logged: result.success, error: result.error };
}

// ============================================================================
// GET EVENTS
// ============================================================================

/**
 * Récupère les événements pour une ressource
 */
export async function getResourceEvents(
  resourceType: ResourceType,
  resourceId: string
): Promise<TrackingEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tracking_events')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Tracking] Error fetching events:', error);
    return [];
  }

  return data || [];
}

/**
 * Récupère les événements pour un utilisateur (toutes ressources)
 */
export async function getUserEvents(
  userId: string,
  options?: { limit?: number; eventTypes?: EventType[] }
): Promise<TrackingEvent[]> {
  const supabase = await createClient();

  let query = supabase
    .from('tracking_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.eventTypes?.length) {
    query = query.in('event_type', options.eventTypes);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Tracking] Error fetching user events:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Calcule les analytics pour une ressource
 */
export async function getResourceAnalytics(
  resourceType: ResourceType,
  resourceId: string
): Promise<ResourceAnalytics> {
  const supabase = await createClient();

  // Récupérer tous les événements pour cette ressource
  const { data: events } = await supabase
    .from('tracking_events')
    .select('event_type, created_at, ip_address')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);

  if (!events || events.length === 0) {
    return {
      total_sends: 0,
      total_opens: 0,
      unique_opens: 0,
      pdf_downloads: 0,
      last_sent_at: null,
      last_viewed_at: null,
    };
  }

  // Calculer les métriques
  const sends = events.filter(e => e.event_type === 'email_sent');
  const opens = events.filter(e => e.event_type === 'viewer_opened');
  const downloads = events.filter(e => e.event_type === 'pdf_downloaded');

  // IPs uniques pour les opens
  const uniqueIps = new Set(opens.map(e => e.ip_address).filter(Boolean));

  // Dernières dates
  const lastSend = sends.length > 0
    ? sends.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;
  const lastOpen = opens.length > 0
    ? opens.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  return {
    total_sends: sends.length,
    total_opens: opens.length,
    unique_opens: uniqueIps.size,
    pdf_downloads: downloads.length,
    last_sent_at: lastSend?.created_at || null,
    last_viewed_at: lastOpen?.created_at || null,
  };
}
