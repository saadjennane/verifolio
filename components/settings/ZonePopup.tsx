'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { TemplateConfig, CustomField } from '@/lib/types/settings';

// Zone names in French
const ZONE_LABELS: Record<string, string> = {
  header: 'En-tête',
  doc_info: 'Informations document',
  client: 'Client',
  items: 'Tableau des lignes',
  totals: 'Totaux',
  total_due: 'Montant total dû',
  payment: 'Paiement / Banque',
  signature: 'Cachet et signature',
  footer: 'Pied de page',
};

interface ZonePopupProps {
  zone: string;
  position: { x: number; y: number };
  config: TemplateConfig;
  onChange: (config: TemplateConfig) => void;
  onClose: () => void;
}

export function ZonePopup({ zone, position, config, onChange, onClose }: ZonePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);

  // Calculate initial position after popup is rendered (to get actual dimensions)
  useEffect(() => {
    if (popupPosition === null && popupRef.current) {
      const padding = 16;
      const rect = popupRef.current.getBoundingClientRect();
      const popupWidth = rect.width || 280;
      const popupHeight = rect.height || 400;

      let x = position.x + 10;
      let y = position.y + 10;

      // Adjust if too close to right edge
      if (x + popupWidth > window.innerWidth - padding) {
        x = Math.max(padding, window.innerWidth - popupWidth - padding);
      }

      // Adjust if too close to bottom edge
      if (y + popupHeight > window.innerHeight - padding) {
        y = Math.max(padding, window.innerHeight - popupHeight - padding);
      }

      // Ensure minimum distance from edges
      x = Math.max(padding, Math.min(x, window.innerWidth - popupWidth - padding));
      y = Math.max(padding, Math.min(y, window.innerHeight - popupHeight - padding));

      setPopupPosition({ x, y });
      setIsPositioned(true);
    }
  }, [position, popupPosition]);

  // Close on click outside (only if not dragging)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isDragging && popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isDragging]);

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const padding = 16;
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      // Keep popup within viewport
      newX = Math.max(padding, Math.min(newX, window.innerWidth - 240));
      newY = Math.max(padding, Math.min(newY, window.innerHeight - 100));

      setPopupPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (popupPosition) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - popupPosition.x,
        y: e.clientY - popupPosition.y,
      });
      e.preventDefault();
    }
  };

  const getPopupStyle = (): React.CSSProperties => {
    // Initially render off-screen to measure, then position correctly
    if (!popupPosition) {
      return {
        position: 'fixed',
        left: -9999,
        top: -9999,
        zIndex: 50,
        visibility: 'hidden',
      };
    }
    return {
      position: 'fixed',
      left: popupPosition.x,
      top: popupPosition.y,
      zIndex: 50,
      visibility: isPositioned ? 'visible' : 'hidden',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
    };
  };

  const zoneName = ZONE_LABELS[zone] || zone;

  // Check if zone has options
  const hasOptions = zone === 'header' || zone === 'payment' || zone === 'client' || zone === 'doc_info' || zone === 'items' || zone === 'totals' || zone === 'total_due' || zone === 'signature' || zone === 'footer';

  return (
    <div
      ref={popupRef}
      style={getPopupStyle()}
      className="bg-white rounded-lg shadow-xl border border-gray-200 min-w-[220px] max-w-[320px] overflow-hidden"
    >
      {/* Header - Draggable */}
      <div
        className={`flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          {/* Drag indicator */}
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">{zoneName}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {zone === 'header' && (
          <HeaderOptions config={config} onChange={onChange} />
        )}
        {zone === 'payment' && (
          <PaymentOptions config={config} onChange={onChange} />
        )}
        {zone === 'client' && (
          <ClientOptions config={config} onChange={onChange} />
        )}
        {zone === 'doc_info' && (
          <DocInfoOptions config={config} onChange={onChange} />
        )}
        {zone === 'items' && (
          <ItemsOptions config={config} onChange={onChange} />
        )}
        {zone === 'totals' && (
          <TotalsOptions config={config} onChange={onChange} />
        )}
        {zone === 'total_due' && (
          <TotalDueOptions config={config} onChange={onChange} />
        )}
        {zone === 'signature' && (
          <SignatureOptions config={config} onChange={onChange} />
        )}
        {zone === 'footer' && (
          <FooterOptions config={config} onChange={onChange} />
        )}
        {!hasOptions && (
          <p className="text-sm text-gray-500">
            Pas d'options pour cette zone.
          </p>
        )}
      </div>
    </div>
  );
}

// Header zone options
function HeaderOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  const positions = [
    { value: 'left', label: 'Gauche' },
    { value: 'center', label: 'Centre' },
    { value: 'right', label: 'Droite' },
  ] as const;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">
        Position du logo
      </label>
      <div className="flex gap-1">
        {positions.map(pos => (
          <button
            key={pos.value}
            onClick={() => onChange({ ...config, logoPosition: pos.value })}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              config.logoPosition === pos.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Payment zone options
function PaymentOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  return (
    <div className="space-y-4">
      {/* Coordonnées bancaires */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showBankDetails"
            checked={config.showBankDetails ?? true}
            onChange={(e) => onChange({ ...config, showBankDetails: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showBankDetails" className="text-xs font-medium text-gray-600 cursor-pointer">
            Coordonnées bancaires
          </label>
        </div>
        <input
          type="text"
          value={config.paymentBankLabel ?? 'Coordonnées bancaires'}
          onChange={(e) => onChange({ ...config, paymentBankLabel: e.target.value })}
          placeholder="Titre de la section"
          disabled={!(config.showBankDetails ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 mb-2"
        />
        <textarea
          value={config.paymentBankText ?? ''}
          onChange={(e) => onChange({ ...config, paymentBankText: e.target.value })}
          placeholder="IBAN, BIC, nom de la banque..."
          disabled={!(config.showBankDetails ?? true)}
          rows={3}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 resize-none"
        />
      </div>

      {/* Conditions de paiement */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showPaymentConditions"
            checked={config.showPaymentConditions ?? true}
            onChange={(e) => onChange({ ...config, showPaymentConditions: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showPaymentConditions" className="text-xs font-medium text-gray-600 cursor-pointer">
            Conditions de paiement
          </label>
        </div>
        <input
          type="text"
          value={config.paymentConditionsLabel ?? 'Conditions de paiement'}
          onChange={(e) => onChange({ ...config, paymentConditionsLabel: e.target.value })}
          placeholder="Titre de la section"
          disabled={!(config.showPaymentConditions ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 mb-2"
        />
        <textarea
          value={config.paymentConditionsText ?? ''}
          onChange={(e) => onChange({ ...config, paymentConditionsText: e.target.value })}
          placeholder="Texte des conditions de paiement..."
          disabled={!(config.showPaymentConditions ?? true)}
          rows={2}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 resize-none"
        />
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showNotes"
            checked={config.showNotes ?? true}
            onChange={(e) => onChange({ ...config, showNotes: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showNotes" className="text-xs font-medium text-gray-600 cursor-pointer">
            Notes
          </label>
        </div>
        <input
          type="text"
          value={config.paymentNotesLabel ?? 'Notes'}
          onChange={(e) => onChange({ ...config, paymentNotesLabel: e.target.value })}
          placeholder="Titre de la section"
          disabled={!(config.showNotes ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 mb-2"
        />
        <textarea
          value={config.paymentNotesText ?? ''}
          onChange={(e) => onChange({ ...config, paymentNotesText: e.target.value })}
          placeholder="Notes à afficher sur le document..."
          disabled={!(config.showNotes ?? true)}
          rows={2}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 resize-none"
        />
      </div>
    </div>
  );
}

// Client zone options
function ClientOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);

  // Load custom fields for client scope
  useEffect(() => {
    async function loadFields() {
      try {
        const response = await fetch('/api/settings/fields?scope=client');
        if (response.ok) {
          const result = await response.json();
          // API returns { data: fields }
          setCustomFields(result.data || []);
        }
      } catch (error) {
        console.error('Error loading custom fields:', error);
      } finally {
        setLoadingFields(false);
      }
    }
    loadFields();
  }, []);

  const styles = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'bordered', label: 'Bordure' },
    { value: 'filled', label: 'Fond' },
  ] as const;

  const baseToggles = [
    { key: 'showClientAddress', label: 'Adresse' },
    { key: 'showClientEmail', label: 'Email' },
    { key: 'showClientPhone', label: 'Téléphone' },
  ] as const;

  // Check if a custom field is visible (not in hidden list)
  const isFieldVisible = (fieldKey: string) => {
    const hidden = config.hiddenClientFields ?? [];
    return !hidden.includes(fieldKey);
  };

  // Toggle a custom field visibility
  const toggleFieldVisibility = (fieldKey: string) => {
    const hidden = config.hiddenClientFields ?? [];
    const newHidden = hidden.includes(fieldKey)
      ? hidden.filter(k => k !== fieldKey)
      : [...hidden, fieldKey];
    onChange({ ...config, hiddenClientFields: newHidden });
  };

  return (
    <div className="space-y-4">
      {/* Titre du bloc */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Titre du bloc
        </label>
        <input
          type="text"
          value={config.clientBlockLabel ?? 'DESTINATAIRE'}
          onChange={(e) => onChange({ ...config, clientBlockLabel: e.target.value })}
          placeholder="DESTINATAIRE"
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Style du bloc */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Style du bloc
        </label>
        <div className="flex gap-1">
          {styles.map(style => (
            <button
              key={style.value}
              onClick={() => onChange({ ...config, clientBlockStyle: style.value })}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                (config.clientBlockStyle ?? 'bordered') === style.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Informations de base */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Informations de base
        </label>
        <div className="space-y-2">
          {baseToggles.map(toggle => (
            <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config[toggle.key] ?? true}
                onChange={(e) => onChange({ ...config, [toggle.key]: e.target.checked })}
                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Champs personnalisés */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Champs personnalisés
        </label>
        {loadingFields ? (
          <p className="text-xs text-gray-400">Chargement...</p>
        ) : customFields.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucun champ personnalisé client</p>
        ) : (
          <div className="space-y-2">
            {customFields.map(field => (
              <label key={field.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFieldVisible(field.key)}
                  onChange={() => toggleFieldVisibility(field.key)}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700">{field.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Doc info zone options
function DocInfoOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  return (
    <div className="space-y-4">
      {/* Date d'émission */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showDocInfoDate"
            checked={config.showDocInfoDate ?? true}
            onChange={(e) => onChange({ ...config, showDocInfoDate: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showDocInfoDate" className="text-xs font-medium text-gray-600 cursor-pointer">
            Date d'émission
          </label>
        </div>
        <input
          type="text"
          value={config.docInfoDateLabel ?? "Date d'émission"}
          onChange={(e) => onChange({ ...config, docInfoDateLabel: e.target.value })}
          placeholder="Date d'émission"
          disabled={!(config.showDocInfoDate ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>

      {/* Date d'échéance */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showDocInfoDueDate"
            checked={config.showDocInfoDueDate ?? true}
            onChange={(e) => onChange({ ...config, showDocInfoDueDate: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showDocInfoDueDate" className="text-xs font-medium text-gray-600 cursor-pointer">
            Date d'échéance
          </label>
        </div>
        <input
          type="text"
          value={config.docInfoDueDateLabel ?? "Date d'échéance"}
          onChange={(e) => onChange({ ...config, docInfoDueDateLabel: e.target.value })}
          placeholder="Date d'échéance"
          disabled={!(config.showDocInfoDueDate ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
    </div>
  );
}

// Items table zone options
function ItemsOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  const columns = [
    { showKey: 'showItemsColQty' as const, labelKey: 'itemsColQtyLabel' as const, defaultLabel: 'Qté', name: 'Quantité' },
    { showKey: 'showItemsColPrice' as const, labelKey: 'itemsColPriceLabel' as const, defaultLabel: 'Prix unitaire', name: 'Prix unitaire' },
    { showKey: 'showItemsColTva' as const, labelKey: 'itemsColTvaLabel' as const, defaultLabel: 'TVA', name: 'TVA' },
    { showKey: 'showItemsColTotal' as const, labelKey: 'itemsColTotalLabel' as const, defaultLabel: 'Total', name: 'Total' },
  ];

  return (
    <div className="space-y-4">
      {/* Label colonne Description (toujours visible) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Colonne Description
        </label>
        <input
          type="text"
          value={config.itemsColDescriptionLabel ?? 'Désignation'}
          onChange={(e) => onChange({ ...config, itemsColDescriptionLabel: e.target.value })}
          placeholder="Désignation"
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Autres colonnes avec checkbox + input */}
      {columns.map(col => (
        <div key={col.showKey}>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={col.showKey}
              checked={config[col.showKey] ?? true}
              onChange={(e) => onChange({ ...config, [col.showKey]: e.target.checked })}
              className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={col.showKey} className="text-xs font-medium text-gray-600 cursor-pointer">
              {col.name}
            </label>
          </div>
          <input
            type="text"
            value={config[col.labelKey] ?? col.defaultLabel}
            onChange={(e) => onChange({ ...config, [col.labelKey]: e.target.value })}
            placeholder={col.defaultLabel}
            disabled={!(config[col.showKey] ?? true)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
      ))}
    </div>
  );
}

// Totals zone options
function TotalsOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  return (
    <div className="space-y-4">
      {/* Total HT - toujours visible, label éditable */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Total HT
        </label>
        <input
          type="text"
          value={config.totalsHtLabel ?? 'Total HT'}
          onChange={(e) => onChange({ ...config, totalsHtLabel: e.target.value })}
          placeholder="Total HT"
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Remise - checkbox + label */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showTotalsDiscount"
            checked={config.showTotalsDiscount ?? true}
            onChange={(e) => onChange({ ...config, showTotalsDiscount: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showTotalsDiscount" className="text-xs font-medium text-gray-600 cursor-pointer">
            Remise
          </label>
        </div>
        <input
          type="text"
          value={config.totalsDiscountLabel ?? 'Remise'}
          onChange={(e) => onChange({ ...config, totalsDiscountLabel: e.target.value })}
          placeholder="Remise"
          disabled={!(config.showTotalsDiscount ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>

      {/* TVA - checkbox + label */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showTotalsTva"
            checked={config.showTotalsTva ?? true}
            onChange={(e) => onChange({ ...config, showTotalsTva: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showTotalsTva" className="text-xs font-medium text-gray-600 cursor-pointer">
            TVA
          </label>
        </div>
        <input
          type="text"
          value={config.totalsTvaLabel ?? 'TVA'}
          onChange={(e) => onChange({ ...config, totalsTvaLabel: e.target.value })}
          placeholder="TVA"
          disabled={!(config.showTotalsTva ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>

      {/* Total TTC - toujours visible, label éditable */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Total TTC
        </label>
        <input
          type="text"
          value={config.totalsTtcLabel ?? 'Total TTC'}
          onChange={(e) => onChange({ ...config, totalsTtcLabel: e.target.value })}
          placeholder="Total TTC"
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

    </div>
  );
}

// Total due zone options (separate from totals for clarity)
function TotalDueOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  return (
    <div className="space-y-4">
      {/* Label du montant dû */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Label
        </label>
        <input
          type="text"
          value={config.totalsDueLabel ?? 'Montant total dû'}
          onChange={(e) => onChange({ ...config, totalsDueLabel: e.target.value })}
          placeholder="Montant total dû"
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Montant en lettres */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.showTotalsInWords ?? true}
            onChange={(e) => onChange({ ...config, showTotalsInWords: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700">Afficher montant en lettres</span>
        </label>
      </div>
    </div>
  );
}

// Signature zone options
function SignatureOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  return (
    <div className="space-y-4">
      {/* Afficher le bloc */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.showSignatureBlock ?? true}
            onChange={(e) => onChange({ ...config, showSignatureBlock: e.target.checked })}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700">Afficher le bloc signature</span>
        </label>
      </div>

      {/* Label personnalisé */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Titre du bloc
        </label>
        <input
          type="text"
          value={config.signatureLabel ?? 'Cachet et signature'}
          onChange={(e) => onChange({ ...config, signatureLabel: e.target.value })}
          placeholder="Cachet et signature"
          disabled={!(config.showSignatureBlock ?? true)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
    </div>
  );
}

// Footer zone options
function FooterOptions({ config, onChange }: { config: TemplateConfig; onChange: (config: TemplateConfig) => void }) {
  const toggles = [
    { key: 'showFooterIdentity' as const, label: 'Identité entreprise', description: 'Nom et adresse courte' },
    { key: 'showFooterLegal' as const, label: 'Mentions légales', description: 'ICE, RC, IF, etc.' },
    { key: 'showFooterContact' as const, label: 'Contact', description: 'Email et téléphone' },
  ];

  return (
    <div className="space-y-4">
      {/* Toggles pour chaque section */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Sections à afficher
        </label>
        <div className="space-y-2">
          {toggles.map(toggle => (
            <label key={toggle.key} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config[toggle.key] ?? true}
                onChange={(e) => onChange({ ...config, [toggle.key]: e.target.checked })}
                className="w-3.5 h-3.5 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-xs text-gray-700 block">{toggle.label}</span>
                <span className="text-[10px] text-gray-400">{toggle.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Texte personnalisé */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Texte personnalisé
        </label>
        <textarea
          value={config.footerCustomText ?? ''}
          onChange={(e) => onChange({ ...config, footerCustomText: e.target.value })}
          placeholder="Texte additionnel à afficher en pied de page..."
          rows={3}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
