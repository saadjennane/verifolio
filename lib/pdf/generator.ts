import puppeteer from 'puppeteer';
import { generateDocumentHTML } from './template';
import type { QuoteWithClientAndItems, InvoiceWithClientAndItems, Company } from '@/lib/supabase/types';

interface GeneratePDFOptions {
  type: 'quote' | 'invoice';
  document: QuoteWithClientAndItems | InvoiceWithClientAndItems;
  company: Company | null;
}

export async function generatePDF({ type, document, company }: GeneratePDFOptions): Promise<Buffer> {
  const html = generateDocumentHTML({ type, document, company });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
