import type { QuoteWithClientAndItems, InvoiceWithClientAndItems, Company } from '@/lib/supabase/types';

interface TemplateData {
  type: 'quote' | 'invoice';
  document: QuoteWithClientAndItems | InvoiceWithClientAndItems;
  company: Company | null;
}

export function generateDocumentHTML({ type, document, company }: TemplateData): string {
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'FACTURE' : 'DEVIS';
  const items = document.items || [];

  const invoice = document as InvoiceWithClientAndItems;
  const quote = document as QuoteWithClientAndItems;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} ${document.numero}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .company-info h1 {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .company-info p {
      color: #6b7280;
      font-size: 11px;
    }

    .document-info {
      text-align: right;
    }

    .document-info .title {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 4px;
    }

    .document-info .number {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }

    .document-info .date {
      font-size: 11px;
      color: #6b7280;
    }

    .client-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
    }

    .client-box .label {
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .client-box .name {
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }

    .client-box .detail {
      font-size: 11px;
      color: #6b7280;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }

    thead tr {
      border-bottom: 2px solid #e5e7eb;
    }

    th {
      text-align: left;
      padding: 12px 8px;
      font-size: 11px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
    }

    th.right {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #f3f4f6;
    }

    td {
      padding: 12px 8px;
      font-size: 12px;
    }

    td.right {
      text-align: right;
    }

    td.bold {
      font-weight: 600;
    }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }

    .totals-box {
      width: 240px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
    }

    .totals-row .label {
      color: #6b7280;
    }

    .totals-row.total {
      border-top: 2px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 700;
    }

    .notes {
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      margin-bottom: 32px;
    }

    .notes .label {
      font-size: 10px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .notes .content {
      font-size: 11px;
      color: #4b5563;
      white-space: pre-wrap;
    }

    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
      text-align: center;
      font-size: 10px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${company?.nom || 'Mon entreprise'}</h1>
      ${company?.adresse ? `<p>${company.adresse}</p>` : ''}
      ${company?.email ? `<p>${company.email}</p>` : ''}
      ${company?.telephone ? `<p>${company.telephone}</p>` : ''}
      ${company?.siret ? `<p style="margin-top: 8px;">SIRET: ${company.siret}</p>` : ''}
    </div>
    <div class="document-info">
      <div class="title">${title}</div>
      <div class="number">${document.numero}</div>
      <div class="date">Date: ${document.date_emission}</div>
      ${isInvoice && invoice.date_echeance ? `<div class="date">Échéance: ${invoice.date_echeance}</div>` : ''}
      ${!isInvoice && quote.date_validite ? `<div class="date">Validité: ${quote.date_validite}</div>` : ''}
    </div>
  </div>

  <div class="client-box">
    <div class="label">Destinataire</div>
    <div class="name">${document.client.nom}</div>
    ${document.client.adresse ? `<div class="detail">${document.client.adresse}</div>` : ''}
    ${document.client.email ? `<div class="detail">${document.client.email}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Description</th>
        <th class="right" style="width: 12%;">Qté</th>
        <th class="right" style="width: 15%;">Prix unit. HT</th>
        <th class="right" style="width: 10%;">TVA</th>
        <th class="right" style="width: 13%;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="right">${Number(item.quantite)}</td>
          <td class="right">${Number(item.prix_unitaire).toFixed(2)} €</td>
          <td class="right">${Number(item.tva_rate)}%</td>
          <td class="right bold">${Number(item.montant_ht).toFixed(2)} €</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span class="label">Total HT</span>
        <span>${Number(document.total_ht).toFixed(2)} €</span>
      </div>
      <div class="totals-row">
        <span class="label">TVA</span>
        <span>${Number(document.total_tva).toFixed(2)} €</span>
      </div>
      <div class="totals-row total">
        <span>Total TTC</span>
        <span>${Number(document.total_ttc).toFixed(2)} €</span>
      </div>
    </div>
  </div>

  ${document.notes ? `
    <div class="notes">
      <div class="label">Notes</div>
      <div class="content">${document.notes}</div>
    </div>
  ` : ''}

  ${company?.footer ? `
    <div class="footer">
      ${company.footer}
    </div>
  ` : ''}
</body>
</html>
  `.trim();
}
