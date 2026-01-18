'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, GripVertical } from 'lucide-react';
import type { Client, Company, LineItemInput } from '@/lib/supabase/types';
import type { DocumentType, DocumentData, DocumentSettings } from './DocumentEditor';
import type { TemplateConfig } from '@/lib/types/settings';

// ============================================================================
// Types
// ============================================================================

interface CompanyFieldValue {
  key: string;
  label: string;
  value: string;
}

export interface DuplicateNumeroInfo {
  exists: boolean;
  existingId?: string;
  existingNumero?: string;
}

interface DocumentEditorPageProps {
  type: DocumentType;
  document: DocumentData;
  client: Client | null;
  clients: Client[];
  company: Company | null;
  settings: DocumentSettings;
  currencySymbol: string;
  templateConfig?: Partial<TemplateConfig>;
  companyFields?: CompanyFieldValue[];
  clientFields?: CompanyFieldValue[];
  onUpdateDocument: (updates: Partial<DocumentData>) => void;
  onSelectClient: (client: Client | null) => void;
  onUpdateItem: (index: number, field: keyof LineItemInput, value: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onDuplicateItem: (index: number) => void;
  onCheckDuplicateNumero?: (numero: string) => Promise<DuplicateNumeroInfo>;
  onReplaceDocument?: (existingId: string, newNumero: string) => Promise<void>;
}

// ============================================================================
// Currency Utilities
// ============================================================================

function formatCurrency(amount: number, symbol: string): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + symbol;
}

function numberToWords(amount: number, currencyCode: string = 'MAD'): string {
  if (amount < 0 || amount >= 1000000000) return '';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const currencyNames: Record<string, { singular: string; plural: string; cents: string }> = {
    MAD: { singular: 'dirham', plural: 'dirhams', cents: 'centimes' },
    EUR: { singular: 'euro', plural: 'euros', cents: 'centimes' },
    DH: { singular: 'dirham', plural: 'dirhams', cents: 'centimes' },
  };

  const curr = currencyNames[currencyCode] || currencyNames['MAD'];

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  function convertHundreds(n: number): string {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 || t === 9) {
        if (u < 10) {
          return tens[t] + (u === 1 && t === 7 ? '-et-' : '-') + teens[u];
        }
      }
      if (t === 8 && u === 0) return 'quatre-vingts';
      if (u === 1 && t < 8) return tens[t] + '-et-un';
      if (u === 0) return tens[t];
      return tens[t] + '-' + units[u];
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let result = h === 1 ? 'cent' : units[h] + ' cent';
    if (rest === 0 && h > 1) result += 's';
    if (rest > 0) result += ' ' + convertHundreds(rest);
    return result;
  }

  function convertThousands(n: number): string {
    if (n === 0) return 'zéro';
    if (n < 1000) return convertHundreds(n);

    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;

    let result = '';
    if (thousands === 1) {
      result = 'mille';
    } else if (thousands > 1) {
      result = convertHundreds(thousands) + ' mille';
    }

    if (rest > 0) {
      result += ' ' + convertHundreds(rest);
    }

    return result.trim();
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);

    const millions = Math.floor(n / 1000000);
    const rest = n % 1000000;

    let result = '';
    if (millions === 1) {
      result = 'un million';
    } else {
      result = convertThousands(millions) + ' millions';
    }

    if (rest > 0) {
      result += ' ' + convertThousands(rest);
    }

    return result.trim();
  }

  let result = convertMillions(intPart);
  result += ' ' + (intPart === 1 ? curr.singular : curr.plural);

  if (decPart > 0) {
    result += ' et ' + convertHundreds(decPart) + ' ' + curr.cents;
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Client Selector (Inline)
// ============================================================================

interface ClientSelectorProps {
  client: Client | null;
  clients: Client[];
  settings: DocumentSettings;
  clientFields?: CompanyFieldValue[];
  onSelect: (client: Client | null) => void;
}

function ClientSelector({ client, clients, settings, clientFields = [], onSelect }: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase())
  );

  if (!client) {
    return (
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="border border-gray-200 rounded-md p-4 cursor-pointer hover:border-blue-400 transition-colors"
        >
          <p className="text-[8pt] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Destinataire
          </p>
          <span className="text-gray-400 italic text-sm">Cliquez pour sélectionner un client...</span>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="py-1">
              {filteredClients.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">Aucun client trouvé</div>
              ) : (
                filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{c.nom}</div>
                    {c.email && <div className="text-sm text-gray-500">{c.email}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="border border-gray-200 rounded-md p-4 cursor-pointer hover:border-blue-400 transition-colors group relative"
      onClick={() => setIsOpen(!isOpen)}
      ref={dropdownRef}
    >
      <p className="text-[8pt] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Destinataire
      </p>
      <p className="font-semibold text-gray-900 text-[12pt]">{client.nom}</p>
      {settings.showClientAddress && client.adresse && (
        <p className="text-[9pt] text-gray-600 mt-1 whitespace-pre-line">{client.adresse}</p>
      )}
      {(settings.showClientEmail || settings.showClientPhone) && (
        <p className="text-[9pt] text-gray-500 mt-1">
          {[
            settings.showClientEmail && client.email,
            settings.showClientPhone && client.telephone
          ].filter(Boolean).join(' | ')}
        </p>
      )}

      {/* Client custom fields (ICE, RC, etc.) */}
      {clientFields.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
          {clientFields.map((field) => (
            <p key={field.key} className="text-[9pt] text-blue-600">
              <span className="text-gray-500">{field.label} :</span> {field.value}
            </p>
          ))}
        </div>
      )}

      {/* Change client dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                e.stopPropagation();
                setSearch(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Rechercher..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="py-1">
            {filteredClients.map(c => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(c);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${c.id === client.id ? 'bg-blue-50' : ''}`}
              >
                <div className="font-medium text-gray-900">{c.nom}</div>
                {c.email && <div className="text-sm text-gray-500">{c.email}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Line Items Table (Spreadsheet-like)
// ============================================================================

interface LineItemsTableProps {
  items: LineItemInput[];
  currencySymbol: string;
  showTva: boolean;
  onUpdateItem: (index: number, field: keyof LineItemInput, value: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onDuplicateItem: (index: number) => void;
}

function LineItemsTable({
  items,
  currencySymbol,
  showTva,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onDuplicateItem,
}: LineItemsTableProps) {
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: string } | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, col: string) => {
    if (e.key === 'Tab' && !e.shiftKey && rowIndex === items.length - 1) {
      const lastCol = showTva ? 'tva' : 'prix';
      if (col === lastCol) {
        e.preventDefault();
        onAddItem();
        setTimeout(() => setFocusedCell({ row: rowIndex + 1, col: 'description' }), 50);
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (rowIndex < items.length - 1) {
        setFocusedCell({ row: rowIndex + 1, col });
      } else {
        onAddItem();
        setTimeout(() => setFocusedCell({ row: rowIndex + 1, col: 'description' }), 50);
      }
    }
  };

  return (
    <div className="line-items-table">
      {/* Hide number input spinners and ensure visible caret */}
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        .line-items-table input,
        .line-items-table textarea {
          caret-color: #1e40af;
        }
      `}</style>
      <div className="border border-gray-300 rounded overflow-hidden">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '50px' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-2 px-3 text-[9pt] font-semibold text-gray-700 uppercase border-r border-gray-300">
                Désignation
              </th>
              <th className="text-center py-2 px-3 text-[9pt] font-semibold text-gray-700 uppercase border-r border-gray-300">
                Qté
              </th>
              <th className="text-right py-2 px-3 text-[9pt] font-semibold text-gray-700 uppercase border-r border-gray-300">
                Prix unitaire
              </th>
              <th className="text-right py-2 px-3 text-[9pt] font-semibold text-gray-700 uppercase">
                Total
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const lineTotal = item.quantite * item.prix_unitaire;

              return (
                <tr
                  key={index}
                  className="border-t border-gray-200 group hover:bg-gray-50 transition-colors"
                >
                  {/* Description */}
                  <td className="py-2 px-3 border-r border-gray-200 align-top">
                    <textarea
                      ref={(el) => {
                        // Auto-resize on mount
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
                      value={item.description}
                      onChange={(e) => {
                        onUpdateItem(index, 'description', e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onKeyDown={(e) => {
                        // Allow Enter for new line, use Shift+Enter or Tab to navigate
                        if (e.key === 'Enter' && !e.shiftKey) {
                          // Allow normal Enter for new lines
                          return;
                        }
                        if (e.key === 'Tab') {
                          handleKeyDown(e, index, 'description');
                        }
                      }}
                      onFocus={(e) => {
                        setFocusedCell({ row: index, col: 'description' });
                        // Ensure proper height on focus
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      placeholder="Description de la prestation..."
                      className="w-full bg-transparent border-0 focus:ring-0 text-[10pt] text-gray-900 placeholder:text-gray-400 focus:bg-blue-50 rounded px-1 py-1 resize-none"
                      style={{ minHeight: '24px' }}
                      rows={1}
                      autoFocus={focusedCell?.row === index && focusedCell?.col === 'description'}
                    />
                  </td>

                  {/* Quantité */}
                  <td className="py-2 px-2 border-r border-gray-200">
                    <input
                      type="number"
                      value={item.quantite}
                      onChange={(e) => onUpdateItem(index, 'quantite', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'quantite')}
                      onFocus={() => setFocusedCell({ row: index, col: 'quantite' })}
                      min={0}
                      step="0.01"
                      className="w-full bg-transparent border-0 focus:ring-0 text-[10pt] text-gray-900 text-center focus:bg-blue-50 rounded px-1 py-1"
                      autoFocus={focusedCell?.row === index && focusedCell?.col === 'quantite'}
                    />
                  </td>

                  {/* Prix unitaire */}
                  <td className="py-2 px-3 border-r border-gray-200 whitespace-nowrap">
                    {focusedCell?.row === index && focusedCell?.col === 'prix' ? (
                      <input
                        type="number"
                        value={item.prix_unitaire}
                        onChange={(e) => onUpdateItem(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'prix')}
                        onBlur={() => setFocusedCell(null)}
                        min={0}
                        step="0.01"
                        className="w-full bg-blue-50 border-0 focus:ring-0 text-[10pt] text-gray-900 text-right rounded px-1 py-1"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => setFocusedCell({ row: index, col: 'prix' })}
                        className="text-right text-[10pt] text-gray-900 cursor-text hover:bg-blue-50 rounded px-1 py-1"
                      >
                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.prix_unitaire)} {currencySymbol}
                      </div>
                    )}
                  </td>

                  {/* Total */}
                  <td className="py-2 px-3 text-right text-[10pt] font-medium text-gray-900 whitespace-nowrap">
                    {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(lineTotal)} {currencySymbol}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-1">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onDuplicateItem(index)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Dupliquer"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
                        disabled={items.length === 1 && !item.description}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add row button */}
        <button
          type="button"
          onClick={onAddItem}
          className="w-full py-2 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 border-t border-gray-200"
        >
          <Plus className="h-4 w-4" />
          Ajouter une ligne
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function DocumentEditorPage({
  type,
  document,
  client,
  clients,
  company,
  settings,
  currencySymbol,
  templateConfig,
  companyFields = [],
  clientFields = [],
  onUpdateDocument,
  onSelectClient,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onDuplicateItem,
  onCheckDuplicateNumero,
  onReplaceDocument,
}: DocumentEditorPageProps) {
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'FACTURE' : 'DEVIS';

  // State for numero editing
  const [isEditingNumero, setIsEditingNumero] = useState(false);
  const [tempNumero, setTempNumero] = useState(document.numero || '');
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateNumeroInfo | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Get primary color from template config or default
  const primaryColor = templateConfig?.primaryColor || '#1e40af';

  // Handle numero change with duplicate check
  const handleNumeroBlur = async () => {
    if (!tempNumero || tempNumero === document.numero) {
      setIsEditingNumero(false);
      setTempNumero(document.numero || '');
      return;
    }

    if (onCheckDuplicateNumero) {
      const info = await onCheckDuplicateNumero(tempNumero);
      if (info.exists && info.existingId !== document.id) {
        setDuplicateInfo(info);
        setShowDuplicateModal(true);
        return;
      }
    }

    // No duplicate, update the numero
    onUpdateDocument({ numero: tempNumero });
    setIsEditingNumero(false);
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateModal(false);
    setTempNumero(document.numero || '');
    setIsEditingNumero(false);
    setDuplicateInfo(null);
  };

  const handleReplaceDuplicate = async () => {
    if (duplicateInfo?.existingId && onReplaceDocument) {
      await onReplaceDocument(duplicateInfo.existingId, tempNumero);
      onUpdateDocument({ numero: tempNumero });
    }
    setShowDuplicateModal(false);
    setIsEditingNumero(false);
    setDuplicateInfo(null);
  };

  // Separate legal fields (ICE, RC) from bank fields
  const legalFields = companyFields.filter(f =>
    ['ice', 'rc', 'patente', 'if', 'cnss'].some(k => f.key.toLowerCase().includes(k))
  );

  return (
    <div className="max-w-[210mm] mx-auto light" data-theme="light">
      {/* Force light mode styles for the document preview */}
      <style>{`
        .light, .light * {
          color-scheme: light !important;
        }
        .light .bg-white { background-color: #ffffff !important; }
        .light .bg-gray-50 { background-color: #f9fafb !important; }
        .light .bg-gray-100 { background-color: #f3f4f6 !important; }
        .light .text-gray-900 { color: #111827 !important; }
        .light .text-gray-700 { color: #374151 !important; }
        .light .text-gray-600 { color: #4b5563 !important; }
        .light .text-gray-500 { color: #6b7280 !important; }
        .light .text-gray-400 { color: #9ca3af !important; }
        .light .border-gray-200 { border-color: #e5e7eb !important; }
        .light .border-gray-300 { border-color: #d1d5db !important; }
        .light input, .light textarea, .light select {
          background-color: transparent !important;
          color: #111827 !important;
        }
        .light input::placeholder, .light textarea::placeholder {
          color: #9ca3af !important;
        }
        /* Hover states */
        .light .hover\\:bg-gray-50:hover { background-color: #f9fafb !important; }
        .light .hover\\:bg-blue-50:hover { background-color: #eff6ff !important; }
        .light .hover\\:bg-red-50:hover { background-color: #fef2f2 !important; }
        .light .hover\\:text-blue-600:hover { color: #2563eb !important; }
        .light .hover\\:text-red-600:hover { color: #dc2626 !important; }
        .light .hover\\:border-blue-400:hover { border-color: #60a5fa !important; }
        /* Focus states */
        .light .focus\\:ring-blue-500:focus { --tw-ring-color: #3b82f6 !important; }
        .light tr:hover { background-color: #f9fafb !important; }
        .light tr:hover td { background-color: transparent !important; }
        /* Actions outside table */
        .light button.text-gray-400 { color: #9ca3af !important; }
      `}</style>
      {/* A4 Page - Force light mode for print fidelity */}
      <div
        className="bg-white shadow-lg mx-4 text-gray-900"
        style={{
          colorScheme: 'light',
          minHeight: '297mm',
          padding: '15mm 20mm',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: '10pt',
          lineHeight: 1.5,
          color: '#1f2937',
          backgroundColor: '#ffffff',
        }}
      >
        {/* ZONE 1: Header - Logo only */}
        <div className="pb-5 mb-6 border-b-2 border-gray-200">
          {company?.logo_url ? (
            <img
              src={company.logo_url}
              alt={company?.nom || ''}
              style={{ maxHeight: '80px', maxWidth: '220px' }}
            />
          ) : (
            <h1 className="text-[20pt] font-bold text-gray-900">
              {company?.nom || 'Mon entreprise'}
            </h1>
          )}
        </div>

        {/* ZONES 2+3: Client + Document Info (side by side) */}
        <div className="flex justify-between gap-8 mb-6">
          {/* ZONE 3: Client Block */}
          <div className="flex-1" style={{ maxWidth: 'calc(100% - 250px)' }}>
            <ClientSelector
              client={client}
              clients={clients}
              settings={settings}
              clientFields={clientFields}
              onSelect={onSelectClient}
            />
          </div>

          {/* ZONE 2: Document Info Block */}
          <div
            className="flex-shrink-0 rounded-md p-4"
            style={{
              width: '220px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Type + Number */}
            <div className="text-center pb-3 mb-3 border-b border-gray-200">
              <div
                className="text-[18pt] font-bold uppercase tracking-wide"
                style={{ color: primaryColor }}
              >
                {title}
              </div>
              {isEditingNumero ? (
                <input
                  type="text"
                  value={tempNumero}
                  onChange={(e) => setTempNumero(e.target.value)}
                  onBlur={handleNumeroBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNumeroBlur();
                    if (e.key === 'Escape') handleCancelDuplicate();
                  }}
                  autoFocus
                  className="text-[12pt] font-semibold text-gray-700 mt-1 bg-white border border-blue-400 rounded px-2 py-0.5 text-center w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div
                  className="text-[12pt] font-semibold text-gray-700 mt-1 cursor-pointer hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-0.5 transition-colors"
                  onClick={() => {
                    setTempNumero(document.numero || '');
                    setIsEditingNumero(true);
                  }}
                  title="Cliquez pour modifier le numéro"
                >
                  {document.numero || '---'}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9pt]">
                <span className="text-gray-500">Date d&apos;émission</span>
                <input
                  type="date"
                  value={document.date_emission}
                  onChange={(e) => onUpdateDocument({ date_emission: e.target.value })}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-right text-gray-900 font-medium cursor-pointer hover:text-blue-600 text-[9pt]"
                  style={{ width: 'auto' }}
                />
              </div>

              {isInvoice && document.date_echeance !== undefined && (
                <div className="flex justify-between text-[9pt]">
                  <span className="text-gray-500">Date d&apos;échéance</span>
                  <input
                    type="date"
                    value={document.date_echeance || ''}
                    onChange={(e) => onUpdateDocument({ date_echeance: e.target.value })}
                    className="bg-transparent border-0 focus:ring-0 p-0 text-right text-gray-900 font-medium cursor-pointer hover:text-blue-600 text-[9pt]"
                    style={{ width: 'auto' }}
                  />
                </div>
              )}

              {!isInvoice && document.date_validite !== undefined && (
                <div className="flex justify-between text-[9pt]">
                  <span className="text-gray-500">Validité</span>
                  <input
                    type="date"
                    value={document.date_validite || ''}
                    onChange={(e) => onUpdateDocument({ date_validite: e.target.value })}
                    className="bg-transparent border-0 focus:ring-0 p-0 text-right text-gray-900 font-medium cursor-pointer hover:text-blue-600 text-[9pt]"
                    style={{ width: 'auto' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ZONE 4: Line Items Table */}
        <div className="mt-6 mb-5">
          <LineItemsTable
            items={document.items}
            currencySymbol={currencySymbol}
            showTva={settings.showTva}
            onUpdateItem={onUpdateItem}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onDuplicateItem={onDuplicateItem}
          />
        </div>

        {/* ZONES 5+6: Total Due Box + Totals (side by side) */}
        <div className="flex justify-between gap-8 mt-5 mb-5">
          {/* ZONE 6: Montant total dû (highlighted) */}
          <div
            className="rounded-lg p-4 text-center"
            style={{
              minWidth: '280px',
              maxWidth: '320px',
              background: `${primaryColor}08`,
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div
              className="text-[9pt] font-semibold uppercase tracking-wide mb-1"
              style={{ color: primaryColor }}
            >
              {isInvoice ? 'Montant total dû' : 'Total devis'}
            </div>
            <div
              className="text-[18pt] font-bold"
              style={{ color: primaryColor }}
            >
              {formatCurrency(document.total_ttc, currencySymbol)}
            </div>
            <div className="text-[8pt] text-gray-500 mt-2 italic">
              {numberToWords(document.total_ttc, document.devise)}
            </div>
          </div>

          {/* ZONE 5: Totals */}
          <div
            className="rounded-md overflow-hidden"
            style={{
              width: '250px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div className="flex justify-between px-4 py-2 border-b border-gray-200">
              <span className="text-gray-500 text-[10pt]">Total HT</span>
              <span className="font-semibold text-gray-900 text-[10pt]">
                {formatCurrency(document.total_ht, currencySymbol)}
              </span>
            </div>

            {settings.showTva && (
              <div className="flex justify-between px-4 py-2 border-b border-gray-200">
                <span className="text-gray-500 text-[10pt]">TVA</span>
                <span className="font-semibold text-gray-900 text-[10pt]">
                  {formatCurrency(document.total_tva, currencySymbol)}
                </span>
              </div>
            )}

            <div
              className="flex justify-between px-4 py-2"
              style={{
                background: `${primaryColor}10`,
                borderTop: `2px solid ${primaryColor}`,
              }}
            >
              <span
                className="font-bold text-[11pt]"
                style={{ color: primaryColor }}
              >
                Total TTC
              </span>
              <span
                className="font-bold text-[11pt]"
                style={{ color: primaryColor }}
              >
                {formatCurrency(document.total_ttc, currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* ZONES 7+8: Payment + Signature (side by side) */}
        <div className="flex justify-between gap-8 mt-8 pt-5 border-t border-gray-200">
          {/* ZONE 7: Conditions + Notes */}
          <div className="flex-1 space-y-4">
            {/* Conditions de paiement */}
            <div>
              <p className="text-[9pt] font-semibold text-gray-700 uppercase mb-2">
                Conditions de paiement
              </p>
              <textarea
                value={templateConfig?.paymentConditionsText || 'Paiement à 30 jours par virement bancaire'}
                readOnly
                className="w-full text-[9pt] text-gray-600 bg-transparent border-0 focus:ring-0 p-0 resize-none"
                rows={1}
              />
            </div>

            {/* Notes */}
            {settings.showNotes && (
              <div>
                <p className="text-[9pt] font-semibold text-gray-700 uppercase mb-2">
                  Notes
                </p>
                <textarea
                  value={document.notes}
                  onChange={(e) => onUpdateDocument({ notes: e.target.value })}
                  placeholder="Notes ou conditions particulières..."
                  className="w-full text-[9pt] text-gray-600 bg-transparent border-0 focus:ring-0 p-0 resize-none placeholder:text-gray-400 focus:bg-blue-50 rounded px-2 py-1 -mx-2"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* ZONE 8: Signature */}
          {settings.showSignature && (
            <div className="flex-shrink-0 text-right" style={{ minWidth: '180px' }}>
              <p className="text-[9pt] font-medium text-gray-700">
                {templateConfig?.signatureLabel || 'Cachet et signature'}
              </p>
            </div>
          )}
        </div>

        {/* ZONE 9: Footer */}
        <div
          className="mt-auto pt-4 border-t border-gray-200 text-center text-[8pt] text-gray-500"
          style={{ marginTop: '40px' }}
        >
          {/* Company identity */}
          {company && (
            <div className="font-semibold text-gray-700 mb-1">
              {company.nom}
              {company.adresse && ` — ${company.adresse.split('\n')[0]}`}
            </div>
          )}

          {/* Legal fields + Contact */}
          <div>
            {[
              ...legalFields.map(f => `${f.label}: ${f.value}`),
              company?.email,
              company?.telephone,
            ].filter(Boolean).join(' | ')}
          </div>

          {/* Custom footer text */}
          {company?.footer && (
            <div className="mt-2 text-gray-400">
              {company.footer}
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Numero Modal */}
      {showDuplicateModal && duplicateInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Numéro déjà utilisé
            </h3>
            <p className="text-gray-600 mb-4">
              Le numéro <strong>{tempNumero}</strong> est déjà utilisé par un autre {isInvoice ? 'facture' : 'devis'}.
            </p>
            <p className="text-gray-600 mb-6">
              Voulez-vous remplacer ce document ? L&apos;ancien sera déplacé dans la corbeille.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDuplicate}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReplaceDuplicate}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Remplacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
