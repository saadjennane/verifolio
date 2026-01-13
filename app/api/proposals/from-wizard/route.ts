import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TipTapContent } from '@/lib/types/structure-templates';

/**
 * Generate a unique public token for proposals
 */
function generatePublicToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

interface PageInput {
  title: string;
  is_cover: boolean;
  sort_order: number;
  content: TipTapContent;
}

interface WizardInput {
  title: string;
  description?: string;
  preset_id: string;
  pages: PageInput[];
  deal_id?: string;
  client_id?: string;
}

/**
 * POST /api/proposals/from-wizard
 * Create a new proposal from the wizard with custom pages
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body: WizardInput = await request.json();

    // Validation
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }

    if (!body.pages || body.pages.length === 0) {
      return NextResponse.json({ error: 'Au moins une page est requise' }, { status: 400 });
    }

    // Validate preset_id
    const validPresets = ['classic', 'modern', 'minimal', 'elegant', 'professional', 'creative'];
    if (!validPresets.includes(body.preset_id)) {
      return NextResponse.json({ error: 'Preset invalide' }, { status: 400 });
    }

    console.log('[from-wizard] Creating proposal with preset_id:', body.preset_id);

    // Create the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        owner_user_id: user.id,
        deal_id: body.deal_id || null,
        client_id: body.client_id || null,
        template_id: null,
        preset_id: body.preset_id,
        title: body.title.trim(),
        theme_override: null,
        visual_options_override: null,
        public_token: generatePublicToken(),
        status: 'DRAFT',
      })
      .select()
      .single();

    if (proposalError) {
      console.error('[from-wizard] Error creating proposal:', proposalError);
      return NextResponse.json({ error: 'Erreur lors de la creation de la proposition' }, { status: 500 });
    }

    console.log('[from-wizard] Created proposal:', proposal.id, 'with preset_id:', proposal.preset_id);

    // Create the pages
    const pagesToInsert = body.pages.map((page, index) => ({
      proposal_id: proposal.id,
      title: page.title,
      sort_order: page.is_cover ? -1 : index, // Cover always first
      is_cover: page.is_cover,
      is_visible: true,
      content: page.content,
    }));

    const { error: pagesError } = await supabase
      .from('proposal_pages')
      .insert(pagesToInsert);

    if (pagesError) {
      console.error('[from-wizard] Error creating pages:', pagesError);
      // Cleanup: delete the proposal
      await supabase.from('proposals').delete().eq('id', proposal.id);
      return NextResponse.json({ error: 'Erreur lors de la creation des pages' }, { status: 500 });
    }

    console.log('[from-wizard] Created', pagesToInsert.length, 'pages');

    // Debug: log first page content structure
    if (pagesToInsert.length > 0) {
      const firstPage = pagesToInsert[0];
      console.log('[from-wizard] First page title:', firstPage.title);
      console.log('[from-wizard] First page content type:', firstPage.content?.type);
      console.log('[from-wizard] First page content nodes:', firstPage.content?.content?.length, 'nodes');
      if (firstPage.content?.content?.[0]) {
        console.log('[from-wizard] First node type:', firstPage.content.content[0].type);
      }
    }

    return NextResponse.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error('[from-wizard] Unexpected error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
