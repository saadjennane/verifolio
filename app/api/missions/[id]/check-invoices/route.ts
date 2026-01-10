import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/supabase/auth-helper';

/**
 * GET /api/missions/:id/check-invoices
 * Vérifie si une mission a des factures liées
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que la mission appartient à l'utilisateur
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, deal_id')
      .eq('id', id)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }

    // Vérifier via deal_id que l'utilisateur a accès
    const { data: deal } = await supabase
      .from('deals')
      .select('id')
      .eq('id', mission.deal_id)
      .eq('user_id', userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier les factures liées à cette mission
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('mission_id', id);

    const hasInvoice = invoices && invoices.length > 0;

    return NextResponse.json({
      hasInvoice,
      invoiceCount: invoices?.length || 0,
      message: hasInvoice
        ? null
        : 'Aucune facture n\'a été créée pour cette mission',
    });
  } catch (error) {
    console.error('Error checking invoices:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des factures' },
      { status: 500 }
    );
  }
}
