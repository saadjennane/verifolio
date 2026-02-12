'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Search, X, Loader2, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface LogoVariant {
  url: string;
  size: number;
  format: string;
}

interface ClientLogoPickerProps {
  clientId: string;
  currentLogoUrl: string | null;
  clientName: string;
  onLogoChange: (logoUrl: string | null, logoSource: 'upload' | 'logodev' | null) => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ClientLogoPicker({
  clientId,
  currentLogoUrl,
  clientName,
  onLogoChange,
  disabled = false,
}: ClientLogoPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'search'>('upload');
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchDomain, setSearchDomain] = useState('');
  const [searchResults, setSearchResults] = useState<LogoVariant[]>([]);
  const [searchError, setSearchError] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<LogoVariant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get initials for placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Handle file upload
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append('logo', file);

        const res = await fetch(`/api/clients/${clientId}/logo`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Erreur lors de l'upload");
          return;
        }

        onLogoChange(data.data.logo_url, 'upload');
        toast.success('Logo uploadé avec succès');
        setShowModal(false);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [clientId, onLogoChange]
  );

  // Handle domain search
  const handleSearch = useCallback(async () => {
    if (!searchDomain.trim()) {
      setSearchError('Veuillez entrer un domaine');
      return;
    }

    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSelectedVariant(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/logo/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: searchDomain }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || 'Erreur lors de la recherche');
        return;
      }

      if (data.data.found) {
        setSearchResults(data.data.variants);
      } else {
        setSearchError('Aucun logo trouvé pour ce domaine');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  }, [clientId, searchDomain]);

  // Handle logo selection from search results
  const handleSelectLogo = useCallback(async () => {
    if (!selectedVariant) return;

    setUploading(true);

    try {
      const res = await fetch(`/api/clients/${clientId}/logo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: selectedVariant.url }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la sélection');
        return;
      }

      onLogoChange(data.data.logo_url, 'logodev');
      toast.success('Logo sélectionné avec succès');
      setShowModal(false);
      setSearchResults([]);
      setSelectedVariant(null);
      setSearchDomain('');
    } catch (error) {
      console.error('Select error:', error);
      toast.error('Erreur lors de la sélection');
    } finally {
      setUploading(false);
    }
  }, [clientId, selectedVariant, onLogoChange]);

  // Handle logo deletion
  const handleDelete = useCallback(async () => {
    setDeleting(true);

    try {
      const res = await fetch(`/api/clients/${clientId}/logo`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la suppression');
        return;
      }

      onLogoChange(null, null);
      toast.success('Logo supprimé');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }, [clientId, onLogoChange]);

  // Close modal and reset state
  const handleCloseModal = () => {
    setShowModal(false);
    setSearchResults([]);
    setSelectedVariant(null);
    setSearchDomain('');
    setSearchError('');
  };

  return (
    <>
      {/* Logo Display with Actions */}
      <div className="flex items-center gap-4">
        {/* Logo or Placeholder */}
        <div
          className={`
            w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
            flex items-center justify-center overflow-hidden
            ${!disabled ? 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500' : ''}
            transition-colors bg-gray-50 dark:bg-gray-800
          `}
          onClick={() => !disabled && setShowModal(true)}
        >
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt={`Logo de ${clientName}`}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement?.querySelector('.fallback')?.classList.remove('hidden');
              }}
            />
          ) : (
            <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
              <Building2 className="w-8 h-8" />
              <span className="text-xs mt-1">{getInitials(clientName)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowModal(true)}
            disabled={disabled}
          >
            {currentLogoUrl ? 'Modifier' : 'Ajouter un logo'}
          </Button>
          {currentLogoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={disabled || deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span className="ml-1">Supprimer</span>
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {currentLogoUrl ? 'Modifier le logo' : 'Ajouter un logo'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('upload')}
                className={`
                  flex-1 py-3 text-sm font-medium text-center
                  ${activeTab === 'upload'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Uploader
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`
                  flex-1 py-3 text-sm font-medium text-center
                  ${activeTab === 'search'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Rechercher
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'upload' ? (
                /* Upload Tab */
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8
                      text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500
                      transition-colors
                      ${uploading ? 'pointer-events-none opacity-50' : ''}
                    `}
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Cliquez pour sélectionner un fichier
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          PNG, JPG, SVG, WebP (max. 500 Ko)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Search Tab */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Domaine de l'entreprise
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchDomain}
                        onChange={(e) => setSearchDomain(e.target.value)}
                        placeholder="ex: acme.com"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button
                        type="button"
                        onClick={handleSearch}
                        disabled={searching}
                      >
                        {searching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Rechercher'
                        )}
                      </Button>
                    </div>
                    {searchError && (
                      <p className="text-sm text-red-600 mt-1">{searchError}</p>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sélectionnez une taille:
                      </p>
                      <div className="flex gap-3 justify-center">
                        {searchResults.map((variant) => (
                          <button
                            key={variant.format}
                            onClick={() => setSelectedVariant(variant)}
                            className={`
                              p-2 rounded-lg border-2 transition-colors
                              ${selectedVariant?.format === variant.format
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                              }
                            `}
                          >
                            <img
                              src={variant.url}
                              alt={`Logo ${variant.size}px`}
                              className="w-16 h-16 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                              }}
                            />
                            <p className="text-xs text-center text-gray-500 mt-1">
                              {variant.size}px
                            </p>
                          </button>
                        ))}
                      </div>

                      {selectedVariant && (
                        <Button
                          type="button"
                          onClick={handleSelectLogo}
                          disabled={uploading}
                          className="w-full"
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Utiliser ce logo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
