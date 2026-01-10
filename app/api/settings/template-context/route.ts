import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';
import { getCompany } from '@/lib/settings/company';
import { listCustomFields, listFieldValuesForEntity } from '@/lib/settings/custom-fields';

/**
 * GET /api/settings/template-context
 * Returns company data and custom fields for client-side template rendering
 * Called once when the template settings page loads
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    // Get doc type from query params (default to invoice)
    const url = new URL(request.url);
    const docType = (url.searchParams.get('docType') as 'invoice' | 'quote') || 'invoice';

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch all data in parallel for better performance
    const [company, companyFields, clientFields] = await Promise.all([
      getCompany(supabase, userId),
      listCustomFields(supabase, userId, 'company'),
      listCustomFields(supabase, userId, 'client'),
    ]);

    // Get company field values if company exists
    let companyFieldValues: { field_id: string; value_text: string | null }[] = [];
    if (company) {
      companyFieldValues = await listFieldValuesForEntity(supabase, userId, 'company', company.id);
    }

    return NextResponse.json({
      company,
      companyFields,
      clientFields,
      companyFieldValues,
      docType,
    });
  } catch (error) {
    console.error('GET /api/settings/template-context error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
