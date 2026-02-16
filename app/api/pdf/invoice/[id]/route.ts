import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePDF } from '@/lib/pdf/generator';
import type { InvoiceWithClientAndItems } from '@/lib/supabase/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la facture avec le client et les lignes
    // SÉCURITÉ: Filtrer par user_id pour empêcher l'accès aux factures d'autres utilisateurs
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*),
        items:invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    // Récupérer les infos de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Générer le PDF
    const pdfBuffer = await generatePDF({
      type: 'invoice',
      document: invoice as InvoiceWithClientAndItems,
      company,
    });

    // Retourner le PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erreur génération PDF facture:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
