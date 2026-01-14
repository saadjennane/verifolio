'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { VerifolioPublicProfile, VerifolioCTA, VerifolioCTAIcon } from '@/lib/verifolio/types';

// CTA Icon components
const CTAIcons: Record<VerifolioCTAIcon, React.FC<{ className?: string }>> = {
  email: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  portfolio: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  instagram: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  linkedin: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  website: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  calendar: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  phone: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  download: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  twitter: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  youtube: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  tiktok: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  github: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
};

interface VerifolioHeaderProps {
  profile: VerifolioPublicProfile;
  isEditable?: boolean;
  themeAccent?: string;
}

export function VerifolioHeader({
  profile,
  isEditable = false,
  themeAccent = '#3b82f6',
}: VerifolioHeaderProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState({
    display_name: profile.display_name,
    title: profile.title || '',
    bio: profile.bio || '',
  });
  const [editingCta, setEditingCta] = useState<VerifolioCTA | null>(null);
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url || '');
  const [tempPhotoUrl, setTempPhotoUrl] = useState(profile.photo_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local CTAs state for immediate UI updates
  const initialCtas = profile.ctas && profile.ctas.length > 0
    ? profile.ctas
    : [
        ...(profile.cta1_label && profile.cta1_url
          ? [{ id: 'legacy-1', profile_id: '', label: profile.cta1_label, url: profile.cta1_url, icon: null, variant: 'primary' as const, sort_order: 0 }]
          : []),
        ...(profile.cta2_label && profile.cta2_url
          ? [{ id: 'legacy-2', profile_id: '', label: profile.cta2_label, url: profile.cta2_url, icon: null, variant: 'secondary' as const, sort_order: 1 }]
          : []),
      ];
  const [ctas, setCtas] = useState<VerifolioCTA[]>(initialCtas);

  const autosave = useCallback(async (field: string, value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/verifolio', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value || null }),
        });
        // Don't call onUpdate for text fields - local state is already updated
        // This prevents unnecessary page reloads
      } catch (error) {
        console.error('Autosave error:', error);
      }
    }, 500);
  }, []);

  const handleChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (isEditable) {
      autosave(field, value);
    }
  };

  const handleBlur = () => {
    setEditingField(null);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');

      const res = await fetch('/api/verifolio/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setTempPhotoUrl(data.url);
        // Auto-save after upload
        await fetch('/api/verifolio', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_url: data.url }),
        });
        setPhotoUrl(data.url);
        setEditingPhotoUrl(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPhotoDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoUpload(file);
  };

  const handlePhotoSave = async () => {
    try {
      await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: tempPhotoUrl || null }),
      });
      // Update local state instead of triggering full reload
      setPhotoUrl(tempPhotoUrl);
      setEditingPhotoUrl(false);
    } catch (error) {
      console.error('Photo save error:', error);
    }
  };

  const handleCtaSave = async (cta: VerifolioCTA) => {
    try {
      if (cta.id.startsWith('new-')) {
        const res = await fetch('/api/verifolio/ctas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: cta.label,
            url: cta.url,
            icon: cta.icon,
            variant: cta.variant,
          }),
        });
        const newCta = await res.json();
        // Add new CTA to local state
        setCtas(prev => [...prev, { ...cta, id: newCta.id || cta.id }]);
      } else if (!cta.id.startsWith('legacy-')) {
        await fetch(`/api/verifolio/ctas/${cta.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: cta.label,
            url: cta.url,
            icon: cta.icon,
            variant: cta.variant,
          }),
        });
        // Update CTA in local state
        setCtas(prev => prev.map(c => c.id === cta.id ? cta : c));
      }
      setEditingCta(null);
    } catch (error) {
      console.error('CTA save error:', error);
    }
  };

  const handleCtaDelete = async (ctaId: string) => {
    if (ctaId.startsWith('legacy-') || ctaId.startsWith('new-')) return;
    try {
      await fetch(`/api/verifolio/ctas/${ctaId}`, { method: 'DELETE' });
      // Remove CTA from local state
      setCtas(prev => prev.filter(c => c.id !== ctaId));
      setEditingCta(null);
    } catch (error) {
      console.error('CTA delete error:', error);
    }
  };

  const renderEditableText = (
    field: 'display_name' | 'title' | 'bio',
    displayClass: string,
    placeholder: string,
    multiline = false
  ) => {
    const isEditing = editingField === field;
    const value = values[field];

    if (isEditable && isEditing) {
      if (multiline) {
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(field, e.target.value)}
            onBlur={handleBlur}
            autoFocus
            placeholder={placeholder}
            className={`${displayClass} w-full bg-transparent border-b-2 border-blue-500 focus:outline-none resize-none`}
            rows={3}
          />
        );
      }
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          onBlur={handleBlur}
          autoFocus
          placeholder={placeholder}
          className={`${displayClass} w-full bg-transparent border-b-2 border-blue-500 focus:outline-none text-center`}
        />
      );
    }

    const content = value || (isEditable ? placeholder : null);
    if (!content && !isEditable) return null;

    return (
      <div
        onClick={isEditable ? () => setEditingField(field) : undefined}
        className={`${displayClass} ${isEditable ? 'cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors group' : ''} ${!value ? 'text-gray-400 italic' : ''}`}
      >
        {content}
        {isEditable && (
          <svg className="inline-block w-4 h-4 ml-2 opacity-0 group-hover:opacity-40 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <header
      className="bg-white rounded-xl shadow-sm p-8"
      style={{ borderLeft: `4px solid ${themeAccent}` }}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Photo */}
        <div className="flex-shrink-0">
          {editingPhotoUrl ? (
            <div className="text-center">
              {/* Upload Zone */}
              <div
                onDrop={handlePhotoDrop}
                onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setPhotoDragOver(false); }}
                onClick={() => photoInputRef.current?.click()}
                className={`relative w-28 h-28 rounded-full overflow-hidden mx-auto cursor-pointer transition-all ${
                  photoDragOver
                    ? 'ring-4 ring-blue-500 bg-blue-50'
                    : 'ring-2 ring-gray-200 bg-gray-100'
                }`}
              >
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                  className="hidden"
                />

                {uploadingPhoto ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : tempPhotoUrl ? (
                  <>
                    <Image src={tempPhotoUrl} alt="" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Changer</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px]">Glissez ou cliquez</span>
                  </div>
                )}
              </div>

              {/* URL input + buttons */}
              <div className="mt-3 w-52">
                <input
                  type="text"
                  value={tempPhotoUrl}
                  onChange={(e) => setTempPhotoUrl(e.target.value)}
                  placeholder="Ou collez une URL"
                  className="w-full text-xs border rounded px-2 py-1.5 text-center"
                />
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={handlePhotoSave}
                    disabled={uploadingPhoto}
                    className="flex-1 text-xs bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700 disabled:opacity-50"
                  >
                    Valider
                  </button>
                  {tempPhotoUrl && (
                    <button
                      onClick={() => setTempPhotoUrl('')}
                      className="px-2 text-xs bg-red-100 text-red-600 rounded py-1.5 hover:bg-red-200"
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingPhotoUrl(false);
                      setTempPhotoUrl(photoUrl);
                    }}
                    className="flex-1 text-xs bg-gray-200 text-gray-700 rounded py-1.5 hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={isEditable ? () => setEditingPhotoUrl(true) : undefined}
              className={`relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100 ${isEditable ? 'cursor-pointer group' : ''}`}
            >
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={values.display_name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
              {isEditable && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          {renderEditableText('display_name', 'text-2xl font-bold text-gray-900', 'Votre nom')}
          {renderEditableText('title', 'text-gray-500 mt-1', 'Votre titre')}
          {renderEditableText('bio', 'text-gray-600 text-sm mt-2 max-w-md', 'Votre bio...', true)}

          {/* CTAs */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
            {ctas.map((cta, index) => {
              const isPrimary = cta.variant === 'primary' || index === 0;
              const IconComponent = cta.icon ? CTAIcons[cta.icon] : null;

              return (
                <div key={cta.id} className="relative group">
                  <a
                    href={isEditable ? undefined : cta.url}
                    onClick={isEditable ? (e) => {
                      e.preventDefault();
                      setEditingCta(cta);
                    } : undefined}
                    target={!isEditable && !cta.url.startsWith('mailto:') ? '_blank' : undefined}
                    rel={!isEditable && !cta.url.startsWith('mailto:') ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                      isPrimary
                        ? 'text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    } ${isEditable ? 'cursor-pointer' : ''}`}
                    style={isPrimary ? { backgroundColor: themeAccent } : undefined}
                  >
                    {IconComponent && <IconComponent className="w-4 h-4" />}
                    {cta.label}
                  </a>
                  {isEditable && (
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add CTA button */}
            {isEditable && ctas.length < 8 && (
              <button
                onClick={() => setEditingCta({
                  id: `new-${Date.now()}`,
                  profile_id: '',
                  label: '',
                  url: '',
                  icon: null,
                  variant: 'secondary',
                  sort_order: ctas.length,
                })}
                className="inline-flex items-center gap-1 px-3 py-2 text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CTA Edit Modal */}
      {editingCta && (
        <CTAEditModal
          cta={editingCta}
          onSave={handleCtaSave}
          onDelete={handleCtaDelete}
          onClose={() => setEditingCta(null)}
        />
      )}
    </header>
  );
}

// CTA Edit Modal Component
interface CTAEditModalProps {
  cta: VerifolioCTA;
  onSave: (cta: VerifolioCTA) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function CTAEditModal({ cta, onSave, onDelete, onClose }: CTAEditModalProps) {
  const [values, setValues] = useState(cta);
  const isNew = cta.id.startsWith('new-');

  const iconOptions: { value: VerifolioCTAIcon | ''; label: string }[] = [
    { value: '', label: 'Aucune icône' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Téléphone' },
    { value: 'website', label: 'Site web' },
    { value: 'portfolio', label: 'Portfolio' },
    { value: 'calendar', label: 'Calendrier' },
    { value: 'download', label: 'Télécharger' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'github', label: 'GitHub' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">
          {isNew ? 'Ajouter un bouton' : 'Modifier le bouton'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte</label>
            <input
              type="text"
              value={values.label}
              onChange={(e) => setValues({ ...values, label: e.target.value })}
              placeholder="Ex: Me contacter"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="text"
              value={values.url}
              onChange={(e) => setValues({ ...values, url: e.target.value })}
              placeholder="Ex: mailto:email@example.com"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icône</label>
            <select
              value={values.icon || ''}
              onChange={(e) => setValues({ ...values, icon: (e.target.value || null) as VerifolioCTAIcon | null })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {iconOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
            <div className="flex gap-2">
              <button
                onClick={() => setValues({ ...values, variant: 'primary' })}
                className={`flex-1 py-2 rounded-lg border transition-colors ${
                  values.variant === 'primary'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Principal
              </button>
              <button
                onClick={() => setValues({ ...values, variant: 'secondary' })}
                className={`flex-1 py-2 rounded-lg border transition-colors ${
                  values.variant === 'secondary'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Secondaire
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {!isNew && !cta.id.startsWith('legacy-') && (
            <button
              onClick={() => onDelete(cta.id)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Supprimer
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(values)}
            disabled={!values.label || !values.url}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNew ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
