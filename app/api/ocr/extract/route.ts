import { NextResponse, NextRequest } from 'next/server';
import { extractAndMatchSupplier, uploadDocumentImage } from '@/lib/ocr';
import type { OcrDocumentType } from '@/lib/ocr/types';

/**
 * POST /api/ocr/extract
 * Extract data from a document image using GPT-4o Vision
 *
 * Body can be:
 * - JSON with { image_url: string, document_type: 'quote' | 'invoice' }
 * - FormData with file and document_type
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let imageUrl: string;
    let documentType: OcrDocumentType = 'invoice';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const docType = formData.get('document_type') as string | null;
      const folder = formData.get('folder') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
      }

      if (docType && ['quote', 'invoice'].includes(docType)) {
        documentType = docType as OcrDocumentType;
      }

      // Upload to storage
      const uploadFolder = folder === 'supplier-quotes' ? 'supplier-quotes' :
        folder === 'receipts' ? 'receipts' : 'supplier-invoices';

      const uploadResult = await uploadDocumentImage(file, uploadFolder);
      if (!uploadResult.success) {
        return NextResponse.json({ error: uploadResult.error }, { status: 400 });
      }

      imageUrl = uploadResult.url;
    } else {
      // Handle JSON body with URL
      const body = await request.json();

      if (!body.image_url) {
        return NextResponse.json({ error: 'URL image requise' }, { status: 400 });
      }

      imageUrl = body.image_url;

      if (body.document_type && ['quote', 'invoice'].includes(body.document_type)) {
        documentType = body.document_type;
      }
    }

    // Extract data and match supplier
    const result = await extractAndMatchSupplier(imageUrl, documentType);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      data: result.data,
      document_url: imageUrl,
    });
  } catch (error) {
    console.error('POST /api/ocr/extract error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
