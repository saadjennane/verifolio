import { NextResponse } from 'next/server';
import { reorderNavigationTabs } from '@/lib/navigation';

/**
 * POST /api/navigation/reorder
 * Réordonne les tabs de navigation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tab_orders } = body; // [{ tab_key: "deals", order: 0 }, ...]

    if (!Array.isArray(tab_orders)) {
      return NextResponse.json(
        { error: 'Format invalide pour tab_orders' },
        { status: 400 }
      );
    }

    const result = await reorderNavigationTabs(tab_orders);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering navigation tabs:', error);
    return NextResponse.json(
      { error: 'Erreur lors du réordonnancement' },
      { status: 500 }
    );
  }
}
