import type { QuoteWithClientAndItems, InvoiceWithClientAndItems, Company } from '@/lib/supabase/types';
import { getCurrencySymbol } from '@/lib/utils/currency';

interface DocumentPreviewProps {
  type: 'quote' | 'invoice';
  document: QuoteWithClientAndItems | InvoiceWithClientAndItems;
  company?: Company | null;
}

export function DocumentPreview({ type, document, company }: DocumentPreviewProps) {
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'FACTURE' : 'DEVIS';
  const items = document.items || [];
  const currencySymbol = getCurrencySymbol(company?.default_currency);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm" style={{ minHeight: '800px' }}>
      {/* En-tête */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{company?.nom || 'Mon entreprise'}</h1>
          {company?.adresse && <p className="text-sm text-gray-600 mt-1">{company.adresse}</p>}
          {company?.email && <p className="text-sm text-gray-600">{company.email}</p>}
          {company?.telephone && <p className="text-sm text-gray-600">{company.telephone}</p>}
          {company?.siret && <p className="text-sm text-gray-500 mt-2">SIRET: {company.siret}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-600">{title}</h2>
          <p className="text-lg font-medium text-gray-900 mt-1">{document.numero}</p>
          <p className="text-sm text-gray-500 mt-2">
            Date: {document.date_emission}
          </p>
          {isInvoice && (document as InvoiceWithClientAndItems).date_echeance && (
            <p className="text-sm text-gray-500">
              Échéance: {(document as InvoiceWithClientAndItems).date_echeance}
            </p>
          )}
          {!isInvoice && (document as QuoteWithClientAndItems).date_validite && (
            <p className="text-sm text-gray-500">
              Validité: {(document as QuoteWithClientAndItems).date_validite}
            </p>
          )}
        </div>
      </div>

      {/* Client */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 uppercase mb-1">Destinataire</p>
        <p className="font-medium text-gray-900">{document.client.nom}</p>
        {document.client.adresse && <p className="text-sm text-gray-600">{document.client.adresse}</p>}
        {document.client.email && <p className="text-sm text-gray-600">{document.client.email}</p>}
      </div>

      {/* Tableau des lignes */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 text-sm font-medium text-gray-500">Description</th>
            <th className="text-right py-3 text-sm font-medium text-gray-500 w-20">Qté</th>
            <th className="text-right py-3 text-sm font-medium text-gray-500 w-28">Prix unit. HT</th>
            <th className="text-right py-3 text-sm font-medium text-gray-500 w-20">TVA</th>
            <th className="text-right py-3 text-sm font-medium text-gray-500 w-28">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-3 text-sm text-gray-900">{item.description}</td>
              <td className="py-3 text-sm text-gray-700 text-right">{Number(item.quantite)}</td>
              <td className="py-3 text-sm text-gray-700 text-right">{Number(item.prix_unitaire).toFixed(2)} {currencySymbol}</td>
              <td className="py-3 text-sm text-gray-700 text-right">{Number(item.tva_rate)}%</td>
              <td className="py-3 text-sm text-gray-900 text-right font-medium">{Number(item.montant_ht).toFixed(2)} {currencySymbol}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total HT</span>
            <span className="text-gray-900">{Number(document.total_ht).toFixed(2)} {currencySymbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">TVA</span>
            <span className="text-gray-900">{Number(document.total_tva).toFixed(2)} {currencySymbol}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span className="text-blue-600">Total TTC</span>
            <span className="text-blue-600">{Number(document.total_ttc).toFixed(2)} {currencySymbol}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {document.notes && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{document.notes}</p>
        </div>
      )}

      {/* Footer */}
      {company?.footer && (
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">{company.footer}</p>
        </div>
      )}
    </div>
  );
}
