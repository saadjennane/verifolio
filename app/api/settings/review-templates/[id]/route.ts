import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateReviewTemplateInput } from '@/lib/reviews/types';

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/settings/review-templates/[id] - Get a single template
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('review_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
      }
      console.error('Error fetching review template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/settings/review-templates/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/settings/review-templates/[id] - Update a template
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body: UpdateReviewTemplateInput = await request.json();

    // Validate if rating_criteria is provided
    if (body.rating_criteria !== undefined) {
      if (body.rating_criteria.length === 0) {
        return NextResponse.json({ error: 'Au moins un critère d\'évaluation est requis' }, { status: 400 });
      }

      if (body.rating_criteria.length > 4) {
        return NextResponse.json({ error: 'Maximum 4 critères d\'évaluation' }, { status: 400 });
      }

      for (const criterion of body.rating_criteria) {
        if (!criterion.label?.trim()) {
          return NextResponse.json({ error: 'Tous les critères doivent avoir un libellé' }, { status: 400 });
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.rating_criteria !== undefined) {
      updateData.rating_criteria = body.rating_criteria;
    }

    if (body.text_placeholder !== undefined) {
      updateData.text_placeholder = body.text_placeholder.trim();
    }

    if (body.low_rating_placeholder !== undefined) {
      updateData.low_rating_placeholder = body.low_rating_placeholder.trim();
    }

    if (body.show_text_field !== undefined) {
      updateData.show_text_field = body.show_text_field;
    }

    if (body.show_low_rating_field !== undefined) {
      updateData.show_low_rating_field = body.show_low_rating_field;
    }

    if (body.is_default !== undefined) {
      updateData.is_default = body.is_default;
    }

    const { data, error } = await supabase
      .from('review_templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
      }
      console.error('Error updating review template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PATCH /api/settings/review-templates/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/settings/review-templates/[id] - Delete a template
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('review_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting review template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/settings/review-templates/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
