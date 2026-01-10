'use client';

import { ArrowLeft, Save, Settings, Eye, Send, FileDown, Loader2 } from 'lucide-react';
import type { DocumentType, DocumentStatus } from './DocumentEditor';

interface DocumentEditorToolbarProps {
  type: DocumentType;
  numero: string;
  status: DocumentStatus;
  hasUnsavedChanges: boolean;
  saving: boolean;
  isEditing: boolean;
  isAutoSaving?: boolean;
  lastSaved?: Date | null;
  onBack: () => void;
  onSave: () => Promise<boolean>;
  onOpenSettings: () => void;
}

const statusLabels: Record<DocumentStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  envoyee: 'Envoyée',
  payee: 'Payée',
  annulee: 'Annulée',
};

const statusColors: Record<DocumentStatus, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  envoye: 'bg-blue-100 text-blue-700',
  envoyee: 'bg-blue-100 text-blue-700',
  payee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
};

export function DocumentEditorToolbar({
  type,
  numero,
  status,
  hasUnsavedChanges,
  saving,
  isEditing,
  isAutoSaving,
  lastSaved,
  onBack,
  onSave,
  onOpenSettings,
}: DocumentEditorToolbarProps) {
  const typeLabel = type === 'quote' ? 'Devis' : 'Facture';

  // Format last saved time
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return 'Enregistré';
    if (diffSec < 60) return `Enregistré il y a ${diffSec}s`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Enregistré il y a ${diffMin}min`;

    return `Enregistré à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-[210mm] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">
                {numero || `Nouveau ${typeLabel.toLowerCase()}`}
              </h1>

              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[status]}`}>
                {statusLabels[status]}
              </span>

              {isAutoSaving ? (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enregistrement...
                </span>
              ) : lastSaved ? (
                <span className="text-xs text-green-600">
                  {formatLastSaved(lastSaved)}
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-xs text-amber-600">
                  (non enregistré)
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Paramètres du document"
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Save */}
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEditing ? 'Enregistrer' : 'Créer'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
