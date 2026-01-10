import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateReviewTemplateInput } from '@/lib/reviews/types';
import { DEFAULT_TEXT_PLACEHOLDER, DEFAULT_LOW_RATING_PLACEHOLDER } from '@/lib/reviews/types';

// GET /api/settings/review-templates - List all templates
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('review_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching review templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/settings/review-templates:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/settings/review-templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body: CreateReviewTemplateInput = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    if (!body.rating_criteria || body.rating_criteria.length === 0) {
      return NextResponse.json({ error: 'Au moins un critère d\'évaluation est requis' }, { status: 400 });
    }

    if (body.rating_criteria.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 critères d\'évaluation' }, { status: 400 });
    }

    // Validate criteria have labels
    for (const criterion of body.rating_criteria) {
      if (!criterion.label?.trim()) {
        return NextResponse.json({ error: 'Tous les critères doivent avoir un libellé' }, { status: 400 });
      }
    }

    const templateData = {
      user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      rating_criteria: body.rating_criteria,
      text_placeholder: body.text_placeholder?.trim() || DEFAULT_TEXT_PLACEHOLDER,
      low_rating_placeholder: body.low_rating_placeholder?.trim() || DEFAULT_LOW_RATING_PLACEHOLDER,
      show_text_field: body.show_text_field ?? true,
      show_low_rating_field: body.show_low_rating_field ?? true,
      is_default: body.is_default ?? false,
    };

    const { data, error } = await supabase
      .from('review_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating review template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/settings/review-templates:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
