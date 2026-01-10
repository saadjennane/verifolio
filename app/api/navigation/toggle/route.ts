import { NextResponse } from 'next/server';
import { toggleTabVisibility } from '@/lib/navigation';

/**
 * POST /api/navigation/toggle
 * Active/désactive la visibilité d'un tab
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tab_key, is_visible } = body;

    if (!tab_key || typeof is_visible !== 'boolean') {
      return NextResponse.json(
        { error: 'Paramètres invalides' },
        { status: 400 }
      );
    }

    const result = await toggleTabVisibility(tab_key, is_visible);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling tab visibility:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
}
