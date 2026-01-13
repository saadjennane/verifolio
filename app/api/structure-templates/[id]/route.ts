import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// GET /api/structure-templates/[id]
// Récupérer un template de structure avec ses pages
// ============================================================================

export async function GET(
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

    const { data: template, error } = await supabase
      .from('structure_templates')
      .select(`
        *,
        pages:structure_template_pages(*)
      `)
      .eq('id', id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { success: false, error: 'Template non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier l'accès
    if (!template.is_system && template.owner_user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        pages: (template.pages || []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        ),
      },
    });
  } catch (error) {
    console.error('[structure-templates/[id]] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/structure-templates/[id]
// Supprimer un template de structure (utilisateur seulement, pas système)
// ============================================================================

export async function DELETE(
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

    // Vérifier que le template existe et appartient à l'utilisateur
    const { data: template, error: fetchError } = await supabase
      .from('structure_templates')
      .select('id, owner_user_id, is_system')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json(
        { success: false, error: 'Template non trouvé' },
        { status: 404 }
      );
    }

    if (template.is_system) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer un template système' },
        { status: 403 }
      );
    }

    if (template.owner_user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Supprimer (les pages seront supprimées en cascade)
    const { error: deleteError } = await supabase
      .from('structure_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[structure-templates/[id]] Error deleting:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[structure-templates/[id]] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
