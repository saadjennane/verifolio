import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/invoices/[id]/stamped-document
 * Upload stamped/signed invoice document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Verify invoice exists and belongs to user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, numero, stamped_document_url')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format invalide. Acceptes: PDF, PNG, JPG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 MB)' },
        { status: 400 }
      );
    }

    // Delete previous stamped document if exists
    if (invoice.stamped_document_url) {
      await supabase.storage
        .from('verifolio-docs')
        .remove([invoice.stamped_document_url]);
    }

    // Generate storage path
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const uuid = crypto.randomUUID();
    const storagePath = `${user.id}/invoices/${invoiceId}/stamped/${uuid}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('verifolio-docs')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier' },
        { status: 500 }
      );
    }

    // Update invoice with stamped document URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ stamped_document_url: storagePath })
      .eq('id', invoiceId);

    if (updateError) {
      // Rollback: delete uploaded file
      await supabase.storage.from('verifolio-docs').remove([storagePath]);
      console.error('Invoice update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour de la facture' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        stamped_document_url: storagePath,
        message: 'Facture cachetee ajoutee avec succes',
      },
    });
  } catch (error) {
    console.error('POST /api/invoices/[id]/stamped-document error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * GET /api/invoices/[id]/stamped-document
 * Get signed URL to view/download stamped document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Get invoice with stamped document URL
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('stamped_document_url')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });
    }

    if (!invoice.stamped_document_url) {
      return NextResponse.json(
        { error: 'Aucune facture cachetee pour ce document' },
        { status: 404 }
      );
    }

    // Generate signed URL (1 hour validity)
    const { data: signedUrl, error: signedError } = await supabase.storage
      .from('verifolio-docs')
      .createSignedUrl(invoice.stamped_document_url, 3600);

    if (signedError || !signedUrl) {
      console.error('Signed URL error:', signedError);
      return NextResponse.json(
        { error: 'Erreur lors de la generation du lien' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        url: signedUrl.signedUrl,
        expires_in: 3600,
      },
    });
  } catch (error) {
    console.error('GET /api/invoices/[id]/stamped-document error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/invoices/[id]/stamped-document
 * Remove stamped document from invoice
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Get invoice with stamped document URL
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('stamped_document_url')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });
    }

    if (!invoice.stamped_document_url) {
      return NextResponse.json(
        { error: 'Aucune facture cachetee a supprimer' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('verifolio-docs')
      .remove([invoice.stamped_document_url]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      // Continue anyway - file might not exist
    }

    // Clear invoice stamped_document_url
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ stamped_document_url: null })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Invoice update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour de la facture' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { message: 'Facture cachetee supprimee' },
    });
  } catch (error) {
    console.error('DELETE /api/invoices/[id]/stamped-document error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
