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
 * POST /api/proposals/v2
 * Create a new proposal with the new wizard flow
 *
 * Body: {
 *   deal_id: string;
 *   client_id: string;
 *   title: string;
 *   template_id?: string | null;
 *   contact_ids: string[];
 *   blank: boolean;
 * }
 *
 * Flow:
 * 1. Create the proposal
 * 2. Associate selected contacts as recipients
 * 3. Create initial structure:
 *    - If template: copy template pages/sections/blocks
 *    - If blank: 1 page, 1 section, 1 empty text block
 * 4. Return the created proposal
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { deal_id, client_id, title, template_id, contact_ids = [], blank = false } = body;

    // Validate required fields
    if (!deal_id) {
      return NextResponse.json({ error: 'deal_id est requis' }, { status: 400 });
    }

    if (!client_id) {
      return NextResponse.json({ error: 'client_id est requis' }, { status: 400 });
    }

    // Verify deal ownership
    const { data: deal } = await supabase
      .from('deals')
      .select('id, title')
      .eq('id', deal_id)
      .eq('user_id', userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: 'Deal non trouvé' }, { status: 404 });
    }

    // Verify client ownership
    const { data: client } = await supabase
      .from('clients')
      .select('id, nom')
      .eq('id', client_id)
      .eq('user_id', userId)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // If using template, verify access
    let template = null;
    if (template_id && !blank) {
      const { data: templateData } = await supabase
        .from('proposal_templates')
        .select('id, name, theme')
        .eq('id', template_id)
        .or(`owner_user_id.eq.${userId},is_system.eq.true`)
        .single();

      if (!templateData) {
        return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
      }
      template = templateData;
    }

    // 1. Create the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        owner_user_id: userId,
        deal_id: deal_id,
        client_id: client_id,
        template_id: template?.id || null,
        title: title || `Proposition - ${deal.title}`,
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

    // 2. Associate contacts as recipients
    if (contact_ids.length > 0) {
      const recipientsToInsert = contact_ids.map((contactId: string) => ({
        proposal_id: proposal.id,
        contact_id: contactId,
      }));

      const { error: recipientsError } = await supabase
        .from('proposal_recipients')
        .insert(recipientsToInsert);

      if (recipientsError) {
        console.error('Create recipients error:', recipientsError);
        // Non-blocking: continue even if recipients fail
      }
    }

    // 3. Create initial structure
    if (blank || !template_id) {
      // Create blank structure: 1 page, 1 section, 1 text block
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
            title: 'Introduction',
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
              content: { html: '<p>Commencez à rédiger votre proposition ici...</p>' },
              sort_order: 0,
            });

          if (blockError) {
            console.error('Create block error:', blockError);
          }
        }
      }
    } else {
      // Copy template structure
      // Note: This would copy template sections to proposal_sections (legacy)
      // For the new page-based structure, we create a similar blank page
      // TODO: Implement full template copying with pages/sections/blocks if templates support it

      // For now, create a page with template name
      const { data: page, error: pageError } = await supabase
        .from('proposal_pages')
        .insert({
          proposal_id: proposal.id,
          title: template?.name || 'Page 1',
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
          // Create default text block with template placeholder
          const { error: blockError } = await supabase
            .from('proposal_blocks')
            .insert({
              section_id: section.id,
              type: 'text',
              content: { html: '<p>Contenu basé sur le template: ' + (template?.name || 'Personnalisé') + '</p>' },
              sort_order: 0,
            });

          if (blockError) {
            console.error('Create block error:', blockError);
          }
        }
      }
    }

    // 4. Set default proposal variables
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('user_id', userId)
      .single();

    const defaultVariables = [
      { proposal_id: proposal.id, key: 'client_name', value: client.nom || '' },
      { proposal_id: proposal.id, key: 'deal_title', value: deal.title || '' },
      { proposal_id: proposal.id, key: 'company_name', value: company?.name || '' },
    ];

    await supabase.from('proposal_variables').insert(defaultVariables);

    // Return the created proposal
    return NextResponse.json({
      data: proposal,
      message: 'Proposition créée avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/proposals/v2 error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
