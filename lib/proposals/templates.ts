import { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProposalTemplate,
  ProposalTemplateWithSections,
  ProposalTemplateSection,
  ProposalTemplateCreate,
  ProposalTemplateUpdate,
  ProposalTemplateSectionCreate,
  ProposalTemplateSectionUpdate,
} from '@/lib/types/proposals';

type Supabase = SupabaseClient;

// ============================================================================
// Proposal Templates
// ============================================================================

/**
 * List all proposal templates for a user (including system templates)
 */
export async function listProposalTemplates(
  supabase: Supabase,
  userId: string
): Promise<ProposalTemplate[]> {
  const { data, error } = await supabase
    .from('proposal_templates')
    .select('*')
    .or(`owner_user_id.eq.${userId},is_system.eq.true`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listProposalTemplates error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a proposal template with its sections
 */
export async function getProposalTemplate(
  supabase: Supabase,
  userId: string,
  templateId: string
): Promise<ProposalTemplateWithSections | null> {
  const { data: template, error: templateError } = await supabase
    .from('proposal_templates')
    .select('*')
    .eq('id', templateId)
    .or(`owner_user_id.eq.${userId},is_system.eq.true`)
    .single();

  if (templateError || !template) {
    console.error('getProposalTemplate error:', templateError);
    return null;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('proposal_template_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('position', { ascending: true });

  if (sectionsError) {
    console.error('getProposalTemplate sections error:', sectionsError);
    return { ...template, sections: [] };
  }

  return {
    ...template,
    sections: sections || [],
  };
}

/**
 * Create a new proposal template
 */
export async function createProposalTemplate(
  supabase: Supabase,
  userId: string,
  payload: ProposalTemplateCreate
): Promise<{ success: boolean; data?: ProposalTemplate; error?: string }> {
  const defaultTheme = {
    primaryColor: '#111111',
    accentColor: '#3B82F6',
    font: 'Inter',
    ...(payload.theme || {}),
  };

  const { data, error } = await supabase
    .from('proposal_templates')
    .insert({
      owner_user_id: userId,
      name: payload.name,
      description: payload.description || null,
      theme: defaultTheme,
      is_default: payload.is_default || false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update a proposal template
 */
export async function updateProposalTemplate(
  supabase: Supabase,
  userId: string,
  templateId: string,
  patch: ProposalTemplateUpdate
): Promise<{ success: boolean; data?: ProposalTemplate; error?: string }> {
  const { data, error } = await supabase
    .from('proposal_templates')
    .update(patch)
    .eq('id', templateId)
    .eq('owner_user_id', userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a proposal template
 */
export async function deleteProposalTemplate(
  supabase: Supabase,
  userId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('proposal_templates')
    .delete()
    .eq('id', templateId)
    .eq('owner_user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Template Sections
// ============================================================================

/**
 * Add a section to a template
 */
export async function addTemplateSection(
  supabase: Supabase,
  userId: string,
  templateId: string,
  payload: ProposalTemplateSectionCreate
): Promise<{ success: boolean; data?: ProposalTemplateSection; error?: string }> {
  // Verify template ownership
  const { data: template } = await supabase
    .from('proposal_templates')
    .select('id')
    .eq('id', templateId)
    .eq('owner_user_id', userId)
    .single();

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  // Get max position if not provided
  let position = payload.position;
  if (position === undefined) {
    const { data: maxSection } = await supabase
      .from('proposal_template_sections')
      .select('position')
      .eq('template_id', templateId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    position = (maxSection?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('proposal_template_sections')
    .insert({
      template_id: templateId,
      title: payload.title,
      body: payload.body,
      position,
      is_enabled: payload.is_enabled !== false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Update a template section
 */
export async function updateTemplateSection(
  supabase: Supabase,
  userId: string,
  sectionId: string,
  patch: ProposalTemplateSectionUpdate
): Promise<{ success: boolean; data?: ProposalTemplateSection; error?: string }> {
  // Verify ownership through template
  const { data: section } = await supabase
    .from('proposal_template_sections')
    .select('template_id')
    .eq('id', sectionId)
    .single();

  if (!section) {
    return { success: false, error: 'Section not found' };
  }

  const { data: template } = await supabase
    .from('proposal_templates')
    .select('id')
    .eq('id', section.template_id)
    .eq('owner_user_id', userId)
    .single();

  if (!template) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('proposal_template_sections')
    .update(patch)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a template section
 */
export async function deleteTemplateSection(
  supabase: Supabase,
  userId: string,
  sectionId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify ownership through template
  const { data: section } = await supabase
    .from('proposal_template_sections')
    .select('template_id')
    .eq('id', sectionId)
    .single();

  if (!section) {
    return { success: false, error: 'Section not found' };
  }

  const { data: template } = await supabase
    .from('proposal_templates')
    .select('id')
    .eq('id', section.template_id)
    .eq('owner_user_id', userId)
    .single();

  if (!template) {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('proposal_template_sections')
    .delete()
    .eq('id', sectionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder template sections
 */
export async function reorderTemplateSections(
  supabase: Supabase,
  userId: string,
  templateId: string,
  orderedSectionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // Verify template ownership
  const { data: template } = await supabase
    .from('proposal_templates')
    .select('id')
    .eq('id', templateId)
    .eq('owner_user_id', userId)
    .single();

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  // Update each section's position
  for (let i = 0; i < orderedSectionIds.length; i++) {
    const { error } = await supabase
      .from('proposal_template_sections')
      .update({ position: i })
      .eq('id', orderedSectionIds[i])
      .eq('template_id', templateId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

/**
 * TipTap node interface for conversion
 */
interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

/**
 * Convert TipTap JSON content to HTML string for template body
 */
function tiptapToHtml(content: TipTapNode): string {
  if (!content || !content.content) return '';

  const processNode = (node: TipTapNode): string => {
    switch (node.type) {
      case 'doc':
        return (node.content || []).map(processNode).join('');
      case 'paragraph': {
        const pContent = (node.content || []).map(processNode).join('');
        return pContent ? `<p>${pContent}</p>` : '<p></p>';
      }
      case 'heading': {
        const level = node.attrs?.level || 1;
        const hContent = (node.content || []).map(processNode).join('');
        return `<h${level}>${hContent}</h${level}>`;
      }
      case 'text':
        return node.text || '';
      case 'bulletList':
        return `<ul>${(node.content || []).map(processNode).join('')}</ul>`;
      case 'orderedList':
        return `<ol>${(node.content || []).map(processNode).join('')}</ol>`;
      case 'listItem':
        return `<li>${(node.content || []).map(processNode).join('')}</li>`;
      case 'horizontalRule':
        return '<hr />';
      case 'blockquote':
        return `<blockquote>${(node.content || []).map(processNode).join('')}</blockquote>`;
      default:
        return (node.content || []).map(processNode).join('');
    }
  };

  return processNode(content);
}

/**
 * Create a template from an existing proposal
 */
export async function createTemplateFromProposal(
  supabase: Supabase,
  userId: string,
  proposalId: string,
  name: string,
  description?: string,
  isDefault?: boolean
): Promise<{ success: boolean; data?: ProposalTemplate; error?: string }> {
  // Verify proposal ownership
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select('id, titre')
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (proposalError || !proposal) {
    return { success: false, error: 'Proposition non trouvee' };
  }

  // Get pages from the proposal (new schema with TipTap content)
  const { data: pages, error: pagesError } = await supabase
    .from('proposal_pages')
    .select('id, title, content, sort_order, is_cover, is_visible')
    .eq('proposal_id', proposalId)
    .order('sort_order', { ascending: true });

  if (pagesError) {
    return { success: false, error: pagesError.message };
  }

  // Create the template
  const { data: template, error: templateError } = await supabase
    .from('proposal_templates')
    .insert({
      owner_user_id: userId,
      name,
      description: description || null,
      theme: {
        primaryColor: '#111111',
        accentColor: '#3B82F6',
        font: 'Inter',
      },
      is_default: isDefault || false,
      is_system: false,
    })
    .select()
    .single();

  if (templateError || !template) {
    return { success: false, error: templateError?.message || 'Erreur creation template' };
  }

  // Convert pages to template sections
  // Each page becomes a section with HTML body
  if (pages && pages.length > 0) {
    const sectionsToInsert = pages
      .filter(page => page.is_visible !== false) // Only include visible pages
      .map((page, index) => ({
        template_id: template.id,
        title: page.title || (page.is_cover ? 'Couverture' : `Page ${index + 1}`),
        body: page.content ? tiptapToHtml(page.content as TipTapNode) : '',
        position: index,
        is_enabled: true,
      }));

    if (sectionsToInsert.length > 0) {
      const { error: sectionsError } = await supabase
        .from('proposal_template_sections')
        .insert(sectionsToInsert);

      if (sectionsError) {
        // Rollback: delete the template if sections failed
        await supabase.from('proposal_templates').delete().eq('id', template.id);
        return { success: false, error: sectionsError.message };
      }
    }
  }

  // If isDefault, unset other defaults
  if (isDefault) {
    await supabase
      .from('proposal_templates')
      .update({ is_default: false })
      .eq('owner_user_id', userId)
      .neq('id', template.id);
  }

  return { success: true, data: template };
}

/**
 * Duplicate a template (creates a copy for the user)
 */
export async function duplicateProposalTemplate(
  supabase: Supabase,
  userId: string,
  templateId: string,
  newName?: string
): Promise<{ success: boolean; data?: ProposalTemplate; error?: string }> {
  // Get the original template with sections
  const original = await getProposalTemplate(supabase, userId, templateId);

  if (!original) {
    return { success: false, error: 'Template not found' };
  }

  // Create the new template
  const { data: newTemplate, error: templateError } = await supabase
    .from('proposal_templates')
    .insert({
      owner_user_id: userId,
      name: newName || `${original.name} (copie)`,
      description: original.description,
      theme: original.theme,
      is_default: false,
      is_system: false,
    })
    .select()
    .single();

  if (templateError || !newTemplate) {
    return { success: false, error: templateError?.message || 'Failed to create template' };
  }

  // Copy all sections
  if (original.sections.length > 0) {
    const sectionsToInsert = original.sections.map((section) => ({
      template_id: newTemplate.id,
      title: section.title,
      body: section.body,
      position: section.position,
      is_enabled: section.is_enabled,
    }));

    const { error: sectionsError } = await supabase
      .from('proposal_template_sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      // Rollback: delete the template if sections failed
      await supabase.from('proposal_templates').delete().eq('id', newTemplate.id);
      return { success: false, error: sectionsError.message };
    }
  }

  return { success: true, data: newTemplate };
}
