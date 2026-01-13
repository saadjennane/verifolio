import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

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

/**
 * POST /api/proposals/template-draft
 * Create a new draft proposal for template editing (no deal/client required)
 *
 * Body: {
 *   title?: string;
 *   template_id?: string; // If duplicating from existing template
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { title, template_id } = body;

    // 1. Create the proposal without deal/client (for template editing)
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        owner_user_id: userId,
        deal_id: null,
        client_id: null,
        template_id: template_id || null,
        title: title || 'Nouveau template',
        theme_override: null,
        public_token: generatePublicToken(),
        status: 'DRAFT',
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Create proposal error:', proposalError);
      return NextResponse.json({ error: proposalError.message }, { status: 500 });
    }

    // 2. Create initial structure: 1 page, 1 section, 1 text block
    const { data: page, error: pageError } = await supabase
      .from('proposal_pages')
      .insert({
        proposal_id: proposal.id,
        title: 'Page 1',
        sort_order: 0,
      })
      .select()
      .single();

    if (pageError) {
      console.error('Create page error:', pageError);
    } else {
      // Create default section
      const { data: section, error: sectionError } = await supabase
        .from('proposal_page_sections')
        .insert({
          page_id: page.id,
          title: 'Contenu',
          sort_order: 0,
          is_highlighted: false,
        })
        .select()
        .single();

      if (sectionError) {
        console.error('Create section error:', sectionError);
      } else {
        // Create default text block
        const { error: blockError } = await supabase
          .from('proposal_blocks')
          .insert({
            section_id: section.id,
            type: 'text',
            content: { html: '<p>Commencez à éditer votre template ici...</p>' },
            sort_order: 0,
          });

        if (blockError) {
          console.error('Create block error:', blockError);
        }
      }
    }

    return NextResponse.json({
      data: proposal,
      message: 'Template draft créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/proposals/template-draft error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
