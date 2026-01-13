import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// POST /api/structure-templates/[id]/duplicate
// Dupliquer un template de structure (créer une copie utilisateur)
// ============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const newName = body.name || null;

    // Récupérer le template source avec ses pages
    const { data: sourceTemplate, error: fetchError } = await supabase
      .from('structure_templates')
      .select(`
        *,
        pages:structure_template_pages(*)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !sourceTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template source non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier l'accès au template source
    if (!sourceTemplate.is_system && sourceTemplate.owner_user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé au template source' },
        { status: 403 }
      );
    }

    // Créer le nouveau template
    const { data: newTemplate, error: createError } = await supabase
      .from('structure_templates')
      .insert({
        owner_user_id: user.id,
        name: newName || `${sourceTemplate.name} (copie)`,
        description: sourceTemplate.description,
        category: sourceTemplate.category,
        thumbnail_svg: sourceTemplate.thumbnail_svg,
        is_system: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('[structure-templates/duplicate] Error creating:', createError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création du template' },
        { status: 500 }
      );
    }

    // Copier les pages
    const pages = (sourceTemplate.pages || []).map((page: {
      title: string;
      sort_order: number;
      is_cover: boolean;
      content: unknown;
    }) => ({
      template_id: newTemplate.id,
      title: page.title,
      sort_order: page.sort_order,
      is_cover: page.is_cover,
      content: page.content,
    }));

    if (pages.length > 0) {
      const { error: pagesError } = await supabase
        .from('structure_template_pages')
        .insert(pages);

      if (pagesError) {
        console.error('[structure-templates/duplicate] Error copying pages:', pagesError);
        // Cleanup
        await supabase.from('structure_templates').delete().eq('id', newTemplate.id);
        return NextResponse.json(
          { success: false, error: 'Erreur lors de la copie des pages' },
          { status: 500 }
        );
      }
    }

    // Récupérer le template complet
    const { data: completeTemplate, error: finalFetchError } = await supabase
      .from('structure_templates')
      .select(`
        *,
        pages:structure_template_pages(*)
      `)
      .eq('id', newTemplate.id)
      .single();

    if (finalFetchError) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la récupération' },
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
    console.error('[structure-templates/duplicate] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
