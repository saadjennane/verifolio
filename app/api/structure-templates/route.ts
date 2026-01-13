import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  StructureTemplateWithPages,
  CreateStructureTemplateInput,
} from '@/lib/types/structure-templates';

// ============================================================================
// GET /api/structure-templates
// Liste tous les templates de structure (système + utilisateur)
// ============================================================================

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer les templates système
    const { data: systemTemplates, error: systemError } = await supabase
      .from('structure_templates')
      .select(`
        *,
        pages:structure_template_pages(*)
      `)
      .eq('is_system', true)
      .order('category')
      .order('name');

    if (systemError) {
      console.error('[structure-templates] Error fetching system templates:', systemError);
    }

    // Récupérer les templates de l'utilisateur
    const { data: userTemplates, error: userError } = await supabase
      .from('structure_templates')
      .select(`
        *,
        pages:structure_template_pages(*)
      `)
      .eq('owner_user_id', user.id)
      .eq('is_system', false)
      .order('created_at', { ascending: false });

    if (userError) {
      console.error('[structure-templates] Error fetching user templates:', userError);
    }

    // Combiner les résultats
    const templates = [...(systemTemplates || []), ...(userTemplates || [])];
    const error = systemError || userError;

    if (error) {
      console.error('[structure-templates] Error fetching:', error);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération des templates' },
        { status: 500 }
      );
    }

    // Trier les pages par sort_order
    const templatesWithSortedPages: StructureTemplateWithPages[] = (templates || []).map(
      (template) => ({
        ...template,
        pages: (template.pages || []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        ),
      })
    );

    return NextResponse.json({
      success: true,
      data: templatesWithSortedPages,
    });
  } catch (error) {
    console.error('[structure-templates] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/structure-templates
// Créer un nouveau template de structure (utilisateur)
// ============================================================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body: CreateStructureTemplateInput = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Le nom est requis' },
        { status: 400 }
      );
    }

    if (!body.pages || body.pages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Au moins une page est requise' },
        { status: 400 }
      );
    }

    // Créer le template
    const { data: template, error: templateError } = await supabase
      .from('structure_templates')
      .insert({
        owner_user_id: user.id,
        name: body.name,
        description: body.description || null,
        category: body.category || 'general',
        is_system: false,
      })
      .select()
      .single();

    if (templateError) {
      console.error('[structure-templates] Error creating template:', templateError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du template' },
        { status: 500 }
      );
    }

    // Créer les pages
    const pages = body.pages.map((page, index) => ({
      template_id: template.id,
      title: page.title,
      sort_order: index,
      is_cover: page.is_cover,
      content: page.content,
    }));

    const { error: pagesError } = await supabase
      .from('structure_template_pages')
      .insert(pages);

    if (pagesError) {
      console.error('[structure-templates] Error creating pages:', pagesError);
      // Cleanup: supprimer le template créé
      await supabase.from('structure_templates').delete().eq('id', template.id);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création des pages' },
        { status: 500 }
      );
    }

    // Récupérer le template complet avec ses pages
    const { data: completeTemplate, error: fetchError } = await supabase
      .from('structure_templates')
      .select(`
        *,
        pages:structure_template_pages(*)
      `)
      .eq('id', template.id)
      .single();

    if (fetchError) {
      console.error('[structure-templates] Error fetching complete template:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération du template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...completeTemplate,
        pages: (completeTemplate.pages || []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        ),
      },
    });
  } catch (error) {
    console.error('[structure-templates] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
