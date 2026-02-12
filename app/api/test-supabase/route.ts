import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const supabase = await createClient();

    const connectTime = Date.now() - startTime;
    console.log(`Client created in ${connectTime}ms`);

    // Test simple query
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1);

    const queryTime = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        status: 'error',
        error: error.message,
        connectTime,
        queryTime,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }

    return NextResponse.json({
      status: 'ok',
      connectTime,
      queryTime,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (err: unknown) {
    const errorTime = Date.now() - startTime;
    return NextResponse.json({
      status: 'exception',
      error: err instanceof Error ? err.message : 'Unknown error',
      errorTime,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }, { status: 500 });
  }
}
