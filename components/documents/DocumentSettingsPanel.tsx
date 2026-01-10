'use client';

import { X } from 'lucide-react';
import type { DocumentData, DocumentSettings } from './DocumentEditor';

interface DocumentSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DocumentSettings;
  onUpdateSettings: (settings: DocumentSettings) => void;
  document: DocumentData;
  onUpdateDocument: (updates: Partial<DocumentData>) => void;
}

const CURRENCIES = [
  { value: 'MAD', label: 'MAD (DH)', symbol: 'DH' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CHF', label: 'CHF', symbol: 'CHF' },
];

const TVA_RATES = [0, 5, 7, 10, 14, 20];

export function DocumentSettingsPanel({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  document,
  onUpdateDocument,
}: DocumentSettingsPanelProps) {
  if (!isOpen) return null;

  const updateSetting = <K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Paramètres</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devise
            </label>
            <select
              value={document.devise}
              onChange={(e) => onUpdateDocument({ devise: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Default TVA Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux de TVA par défaut
            </label>
            <select
              value={settings.defaultTvaRate}
              onChange={(e) => updateSetting('defaultTvaRate', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TVA_RATES.map(rate => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
          </div>

          {/* Visibility toggles */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Affichage
            </h3>
            <div className="space-y-3">
              <ToggleItem
                label="Afficher la TVA"
                checked={settings.showTva}
                onChange={(v) => updateSetting('showTva', v)}
              />
              <ToggleItem
                label="Afficher les notes"
                checked={settings.showNotes}
                onChange={(v) => updateSetting('showNotes', v)}
              />
              <ToggleItem
                label="Bloc signature"
                checked={settings.showSignature}
                onChange={(v) => updateSetting('showSignature', v)}
              />
            </div>
          </div>

          {/* Client block */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Bloc client
            </h3>
            <div className="space-y-3">
              <ToggleItem
                label="Afficher l'adresse"
                checked={settings.showClientAddress}
                onChange={(v) => updateSetting('showClientAddress', v)}
              />
              <ToggleItem
                label="Afficher l'email"
                checked={settings.showClientEmail}
                onChange={(v) => updateSetting('showClientEmail', v)}
              />
              <ToggleItem
                label="Afficher le téléphone"
                checked={settings.showClientPhone}
                onChange={(v) => updateSetting('showClientPhone', v)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Ces paramètres s&apos;appliquent à ce document uniquement
          </p>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Toggle Item Component
// ============================================================================

interface ToggleItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleItem({ label, checked, onChange }: ToggleItemProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
