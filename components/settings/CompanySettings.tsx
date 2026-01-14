'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, PhoneInput } from '@/components/ui';
import type { Company } from '@/lib/types/settings';
import { useSettingsCompletionStore } from '@/lib/stores/settings-completion-store';

// Logo constraints
const MAX_SIZE_KB = 500;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const ALLOWED_EXTENSIONS = '.png, .jpg, .jpeg, .svg, .webp';

export function CompanySettings() {
  const [company, setCompany] = useState<Partial<Company>>({
    display_name: '',
    logo_url: '',
    address: '',
    email: '',
    phone: '',
    default_currency: 'EUR',
    default_tax_rate: 20,
    invoice_number_pattern: 'FA-{SEQ:3}-{YY}',
    quote_number_pattern: 'DEV-{SEQ:3}-{YY}',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invalidateCache = useSettingsCompletionStore((state) => state.invalidateCache);

  useEffect(() => {
    fetchCompany();
  }, []);

  async function fetchCompany() {
    try {
      const res = await fetch('/api/settings/company', { credentials: 'include' });
      const json = await res.json();
      if (json.data) {
        setCompany(json.data);
      }
    } catch (error) {
      console.error('Erreur chargement company:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!company.display_name?.trim()) {
      setMessage({ type: 'error', text: 'Le nom de l\'entreprise est requis' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });

      const json = await res.json();

      if (res.ok) {
        setCompany(json.data);
        setMessage({ type: 'success', text: 'Paramètres enregistrés' });
        // Refresh completion widget
        invalidateCache();
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format non supporté. Utilisez PNG, JPG, SVG ou WebP.' });
      return;
    }

    if (file.size > MAX_SIZE_KB * 1024) {
      setMessage({ type: 'error', text: `Fichier trop volumineux. Maximum: ${MAX_SIZE_KB} Ko` });
      return;
    }

    setUploadingLogo(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();

      if (res.ok) {
        setCompany(prev => ({ ...prev, logo_url: json.data.logo_url }));
        setMessage({ type: 'success', text: 'Logo uploadé' });
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de l\'upload' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleLogoDelete() {
    if (!confirm('Supprimer le logo ?')) return;

    setUploadingLogo(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/logo', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setCompany(prev => ({ ...prev, logo_url: '' }));
        setMessage({ type: 'success', text: 'Logo supprimé' });
      } else {
        const json = await res.json();
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleChange(field: keyof Company, value: string | number) {
    setCompany(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Informations générales */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              value={company.display_name || ''}
              onChange={e => handleChange('display_name', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mon entreprise"
            />
          </div>

          {/* Logo Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo
            </label>

            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              <div className="w-24 h-24 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                    onError={e => (e.currentTarget.src = '')}
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_EXTENSIONS}
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                      uploadingLogo
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {uploadingLogo ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        Upload...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Choisir un fichier
                      </>
                    )}
                  </label>

                  {company.logo_url && (
                    <button
                      type="button"
                      onClick={handleLogoDelete}
                      disabled={uploadingLogo}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Supprimer
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  PNG, JPG, SVG ou WebP. Max {MAX_SIZE_KB} Ko.
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <textarea
              value={company.address || ''}
              onChange={e => handleChange('address', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 rue de la Paix&#10;75001 Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={company.email || ''}
              onChange={e => handleChange('email', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@exemple.com"
            />
          </div>

          <div>
            <PhoneInput
              label="Téléphone"
              value={company.phone || ''}
              onChange={value => handleChange('phone', value)}
              defaultCountry="MA"
            />
          </div>
        </div>
      </div>

      {/* Paramètres par défaut */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Paramètres par défaut</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Devise
            </label>
            <select
              value={company.default_currency || 'EUR'}
              onChange={e => handleChange('default_currency', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
              <option value="MAD">MAD (DH)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taux de TVA par défaut (%)
            </label>
            <input
              type="number"
              value={company.default_tax_rate || 20}
              onChange={e => handleChange('default_tax_rate', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format de date
            </label>
            <select
              value={company.date_format || 'dd/mm/yyyy'}
              onChange={e => handleChange('date_format', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dd/mm/yyyy">JJ/MM/AAAA (31/12/2025)</option>
              <option value="dd/mm/yy">JJ/MM/AA (31/12/25)</option>
              <option value="mm/dd/yyyy">MM/JJ/AAAA (12/31/2025)</option>
              <option value="mm/dd/yy">MM/JJ/AA (12/31/25)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Numérotation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Numérotation des documents</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tokens: {'{SEQ:3}'} = numéro (3 chiffres), {'{YY}'} ou {'{YYYY}'} = année, {'{MM}'} = mois, {'{DD}'} = jour
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format factures
            </label>
            <input
              type="text"
              value={company.invoice_number_pattern || 'FA-{SEQ:3}-{YY}'}
              onChange={e => handleChange('invoice_number_pattern', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="FA-{SEQ:3}-{YY}"
            />
            <p className="text-xs text-gray-400 mt-1">Ex: FA-001-25</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format devis
            </label>
            <input
              type="text"
              value={company.quote_number_pattern || 'DEV-{SEQ:3}-{YY}'}
              onChange={e => handleChange('quote_number_pattern', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="DEV-{SEQ:3}-{YY}"
            />
            <p className="text-xs text-gray-400 mt-1">Ex: DEV-001-25</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
