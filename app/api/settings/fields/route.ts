import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { listCustomFields, createCustomField } from '@/lib/settings';
import type { CustomFieldScope } from '@/lib/types/settings';

/**
 * GET /api/settings/fields?scope=company|client|document
 * List custom fields for the current user
 * For company scope fields, includes their values
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as CustomFieldScope | null;

    // Validate scope if provided
    if (scope && !['company', 'client', 'supplier', 'document'].includes(scope)) {
      return NextResponse.json(
        { error: 'scope invalide (company|client|supplier|document)' },
        { status: 400 }
      );
    }

    const fields = await listCustomFields(supabase, userId, scope || undefined);

    // For company scope fields, fetch their values
    const companyFields = fields.filter(f => f.scope === 'company');
    if (companyFields.length > 0) {
      // Get company ID
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (company) {
        // Get values for company fields
        const { data: values, error: valuesError } = await supabase
          .from('custom_field_values')
          .select('field_id, value_text')
          .eq('user_id', userId)
          .eq('entity_type', 'company')
          .eq('entity_id', company.id)
          .in('field_id', companyFields.map(f => f.id));

        console.log('Custom field values query:', {
          userId,
          companyId: company.id,
          fieldIds: companyFields.map(f => f.id),
          values,
          error: valuesError,
        });

        // Merge values into fields
        if (values) {
          const valueMap = new Map(values.map(v => [v.field_id, v.value_text]));
          fields.forEach(field => {
            if (field.scope === 'company' && valueMap.has(field.id)) {
              (field as typeof field & { value?: string }).value = valueMap.get(field.id) || '';
            }
          });
        }
      } else {
        console.log('No company found for userId:', userId);
      }
    }

    return NextResponse.json({ data: fields });
  } catch (error) {
    console.error('GET /api/settings/fields error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/settings/fields
 * Create a new custom field
 * Body: { scope, key, label, field_type?, is_active?, is_visible_default? }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.scope || !body.key || !body.label) {
      return NextResponse.json(
        { error: 'scope, key et label sont requis' },
        { status: 400 }
      );
    }

    // Validate scope
    if (!['company', 'client', 'supplier', 'document'].includes(body.scope)) {
      return NextResponse.json(
        { error: 'scope invalide (company|client|supplier|document)' },
        { status: 400 }
      );
    }

    const result = await createCustomField(supabase, userId, {
      scope: body.scope,
      key: body.key,
      label: body.label,
      field_type: body.field_type,
      is_active: body.is_active,
      is_visible_default: body.is_visible_default,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/settings/fields error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
