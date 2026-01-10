import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

// PUT /api/settings/fields/[id]/value - Save company field value
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: fieldId } = await params;

    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { value } = body;

    // Get the field to verify it exists and belongs to user
    const { data: field, error: fieldError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('id', fieldId)
      .eq('user_id', userId)
      .single();

    if (fieldError || !field) {
      return NextResponse.json({ error: 'Champ non trouvé' }, { status: 404 });
    }

    // Only allow values for company scope fields
    if (field.scope !== 'company') {
      return NextResponse.json(
        { error: 'Seuls les champs entreprise peuvent avoir une valeur ici' },
        { status: 400 }
      );
    }

    // Get or create company
    let { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Create company if it doesn't exist
    if (!company) {
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({ user_id: userId, nom: 'Mon entreprise' })
        .select('id')
        .single();

      if (createError || !newCompany) {
        console.error('Create company error:', createError);
        return NextResponse.json({ error: 'Erreur création entreprise' }, { status: 500 });
      }
      company = newCompany;
    }

    // Delete + Insert approach (more reliable than upsert with composite key)
    console.log('Saving custom field value:', {
      userId,
      fieldId,
      companyId: company.id,
      value,
    });

    // Delete existing value if any
    await supabase
      .from('custom_field_values')
      .delete()
      .eq('user_id', userId)
      .eq('field_id', fieldId)
      .eq('entity_type', 'company')
      .eq('entity_id', company.id);

    // Insert new value
    const { data, error } = await supabase
      .from('custom_field_values')
      .insert({
        user_id: userId,
        field_id: fieldId,
        entity_type: 'company',
        entity_id: company.id,
        value_text: value || null,
      })
      .select()
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Upsert field value error:', error);
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/settings/fields/[id]/value error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
