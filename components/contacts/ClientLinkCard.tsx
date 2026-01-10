'use client';

import { Autocomplete, Checkbox } from '@/components/ui';

export interface ClientLinkData {
  id?: string; // undefined if new link
  clientId: string;
  clientName: string;
  role: string;
  isPrimary: boolean;
  handles_billing: boolean;
  handles_commercial: boolean;
  handles_ops: boolean;
  handles_management: boolean;
}

interface ClientLinkCardProps {
  link: ClientLinkData;
  onUpdate: (link: ClientLinkData) => void;
  onRemove: () => void;
  roleSuggestions: string[];
}

export function ClientLinkCard({
  link,
  onUpdate,
  onRemove,
  roleSuggestions,
}: ClientLinkCardProps) {
  const handleRoleChange = (role: string) => {
    onUpdate({ ...link, role });
  };

  const handleCheckboxChange = (field: keyof ClientLinkData, value: boolean) => {
    onUpdate({ ...link, [field]: value });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{link.clientName}</span>
          {link.isPrimary && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Principal
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Supprimer la liaison"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Role with autocomplete */}
        <Autocomplete
          label="Fonction"
          value={link.role}
          onChange={handleRoleChange}
          suggestions={roleSuggestions}
          placeholder="Ex: Comptable, Directeur..."
        />

        {/* Primary contact checkbox */}
        <Checkbox
          label="Contact principal"
          checked={link.isPrimary}
          onChange={(checked) => handleCheckboxChange('isPrimary', checked)}
          description="Ce contact sera utilise par defaut pour ce client"
        />

        {/* Responsibilities */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Responsabilites</p>
          <div className="grid grid-cols-2 gap-2">
            <Checkbox
              label="Facturation"
              checked={link.handles_billing}
              onChange={(checked) => handleCheckboxChange('handles_billing', checked)}
            />
            <Checkbox
              label="Commercial"
              checked={link.handles_commercial}
              onChange={(checked) => handleCheckboxChange('handles_commercial', checked)}
            />
            <Checkbox
              label="Operations"
              checked={link.handles_ops}
              onChange={(checked) => handleCheckboxChange('handles_ops', checked)}
            />
            <Checkbox
              label="Direction"
              checked={link.handles_management}
              onChange={(checked) => handleCheckboxChange('handles_management', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
