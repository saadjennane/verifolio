import { NextResponse } from 'next/server';
import { getUserNavigationPreferences } from '@/lib/navigation';

/**
 * GET /api/navigation/preferences
 * Récupère les préférences de navigation de l'utilisateur
 */
export async function GET(request: Request) {
  try {
    const result = await getUserNavigationPreferences();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ tabs: result.data });
  } catch (error) {
    console.error('Error getting navigation preferences:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des préférences' },
      { status: 500 }
    );
  }
}
