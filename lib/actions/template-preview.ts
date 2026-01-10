'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { renderDocumentHtml } from '@/lib/pdf/renderDocumentHtml';
import { buildMockRenderContext } from '@/lib/render/buildMockRenderContext';
import type { TemplateConfig } from '@/lib/types/settings';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/types/settings';

export async function generateTemplatePreview(
  config: TemplateConfig = DEFAULT_TEMPLATE_CONFIG
): Promise<{ success: true; html: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    // Get current user using the auth helper (has dev fallback)
    const userId = await getUserId(supabase);

    if (!userId) {
      console.log('[template-preview action] Auth failed: no userId');
      return { success: false, error: 'Non authentifié' };
    }

    // Build mock context with real company data
    const context = await buildMockRenderContext(supabase, userId);

    // Generate HTML with template config
    const html = renderDocumentHtml(context, config);

    return { success: true, html };
  } catch (error) {
    console.error('[template-preview action] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}
