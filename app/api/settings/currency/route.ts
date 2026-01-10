import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * GET /api/settings/currency
 * Returns the default currency from company settings
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('companies')
    .select('default_currency')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching currency:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      currency: data?.default_currency || 'EUR',
    },
  });
}
