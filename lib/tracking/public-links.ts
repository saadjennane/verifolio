/**
 * Gestion des liens publics
 * Création, récupération et révocation des liens
 */

import { createClient } from '@/lib/supabase/server';
import type { ResourceType, PublicLink } from '@/lib/send/types';
import { DOCUMENT_SEND_CONFIGS } from '@/lib/send/types';

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Génère un token aléatoire de 32 caractères
 */
function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================================
// GET OR CREATE PUBLIC LINK
// ============================================================================

/**
 * Récupère le lien public actif pour une ressource, ou en crée un nouveau
 */
export async function getOrCreatePublicLink(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<{ link: PublicLink | null; error?: string }> {
  const supabase = await createClient();

  // 1. Chercher un lien actif existant
  const { data: existingLink, error: fetchError } = await supabase
    .from('public_links')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('is_revoked', false)
    .maybeSingle();

  if (fetchError) {
    console.error('[PublicLinks] Error fetching existing link:', fetchError);
    return { link: null, error: fetchError.message };
  }

  // Si un lien actif existe, le retourner
  if (existingLink) {
    return { link: existingLink };
  }

  // 2. Créer un nouveau lien
  const token = generateToken();

  const { data: newLink, error: insertError } = await supabase
    .from('public_links')
    .insert({
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      token,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[PublicLinks] Error creating link:', insertError);
    return { link: null, error: insertError.message };
  }

  return { link: newLink };
}

// ============================================================================
// GET PUBLIC LINK BY TOKEN
// ============================================================================

/**
 * Récupère un lien public par son token (pour les viewers publics)
 */
export async function getPublicLinkByToken(
  token: string
): Promise<{ link: PublicLink | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('public_links')
    .select('*')
    .eq('token', token)
    .eq('is_revoked', false)
    .maybeSingle();

  if (error) {
    console.error('[PublicLinks] Error fetching link by token:', error);
    return { link: null, error: error.message };
  }

  if (!data) {
    return { link: null, error: 'Link not found or revoked' };
  }

  // Vérifier l'expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { link: null, error: 'Link has expired' };
  }

  return { link: data };
}

// ============================================================================
// REVOKE PUBLIC LINK
// ============================================================================

/**
 * Révoque un lien public (le rend invalide)
 */
export async function revokePublicLink(
  userId: string,
  linkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('public_links')
    .update({ is_revoked: true })
    .eq('id', linkId)
    .eq('user_id', userId);

  if (error) {
    console.error('[PublicLinks] Error revoking link:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Révoque tous les liens actifs pour une ressource
 */
export async function revokeAllLinksForResource(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('public_links')
    .update({ is_revoked: true })
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('is_revoked', false);

  if (error) {
    console.error('[PublicLinks] Error revoking links:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// GET LINKS FOR RESOURCE
// ============================================================================

/**
 * Récupère tous les liens (actifs et révoqués) pour une ressource
 */
export async function getLinksForResource(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<PublicLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('public_links')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PublicLinks] Error fetching links:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// BUILD PUBLIC URL
// ============================================================================

/**
 * Construit l'URL publique complète pour un token
 */
export function buildPublicUrl(resourceType: ResourceType, token: string): string {
  const config = DOCUMENT_SEND_CONFIGS[resourceType];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verifolio.app';
  return `${baseUrl}${config.viewer_path}/${token}`;
}

/**
 * Construit l'URL publique pour un lien existant
 */
export function getPublicUrlFromLink(link: PublicLink): string {
  return buildPublicUrl(link.resource_type, link.token);
}
