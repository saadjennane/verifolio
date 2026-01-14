'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { VerifolioProfile, VerifolioActivity, VerifolioPublicReview } from '@/lib/verifolio/types';
import type { VerifolioThemeColor } from '@/lib/verifolio/themes';
import { getVerifolioTheme } from '@/lib/verifolio/themes';
import { VerifolioThemeSelector } from './VerifolioThemeSelector';

// ============================================================================
// Types
// ============================================================================

interface EditorState {
  profile: VerifolioProfile | null;
  activities: VerifolioActivity[];
  reviews: VerifolioPublicReview[];
}

// ============================================================================
// Main Editor Component
// ============================================================================

export function VerifolioEditor() {
  const [state, setState] = useState<EditorState>({
    profile: null,
    activities: [],
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/verifolio');
      const data = await res.json();

      if (data.profile) {
        // Load activities
        const activitiesRes = await fetch('/api/verifolio/activities');
        const activitiesData = await activitiesRes.json();

        // Load reviews
        const reviewsRes = await fetch('/api/verifolio/reviews');
        const reviewsData = await reviewsRes.json();

        setState({
          profile: data.profile,
          activities: activitiesData.activities || [],
          reviews: reviewsData.reviews || [],
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Create profile
  async function handleCreate() {
    if (!createName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/verifolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: createName }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setCreating(false);
    }
  }

  // Toggle publish
  async function togglePublish() {
    if (!state.profile) return;

    setSaving(true);
    try {
      await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !state.profile.is_published }),
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  // Handle theme change
  async function handleThemeChange(color: VerifolioThemeColor) {
    if (!state.profile) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, theme_color: color } : null,
    }));

    await fetch('/api/verifolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_color: color }),
    });
  }

  // Handle show logo change
  async function handleShowLogoChange(show: boolean) {
    if (!state.profile) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, show_company_logo: show } : null,
    }));

    await fetch('/api/verifolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_company_logo: show }),
    });
  }

  // Get current theme
  const currentTheme = state.profile ? getVerifolioTheme(state.profile.theme_color) : null;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  // No profile - creation screen
  if (!state.profile) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Créez votre page publique</h2>
          <p className="text-gray-600">
            Présentez vos activités et vos témoignages clients sur une page professionnelle.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Votre nom ou celui de votre entreprise
          </label>
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button
            onClick={handleCreate}
            disabled={creating || !createName.trim()}
            className="w-full mt-4"
          >
            {creating ? 'Création...' : 'Créer ma page'}
          </Button>
        </div>
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verifolio/${state.profile.slug}`;

  return (
    <div className="min-h-full">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Mon Verifolio</h1>
            <Badge variant={state.profile.is_published ? 'green' : 'gray'}>
              {state.profile.is_published ? 'Publié' : 'Brouillon'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {state.profile.is_published && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 mr-2"
              >
                Voir la page
              </a>
            )}
            <button
              onClick={() => setShowDesign(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Design"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Paramètres"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <Button
              onClick={togglePublish}
              disabled={saving}
              variant={state.profile.is_published ? 'outline' : 'primary'}
              size="sm"
            >
              {state.profile.is_published ? 'Dépublier' : 'Publier'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content - WYSIWYG Preview */}
      <div className="bg-gray-50 min-h-[calc(100vh-200px)]">
        <div className="max-w-4xl mx-auto py-8">
          {/* Preview Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Section */}
            <EditableHeader
              profile={state.profile}
              onUpdate={loadData}
            />

            {/* Activities Section */}
            {state.profile.show_activities && (
              <EditableActivities
                activities={state.activities}
                onUpdate={loadData}
              />
            )}

            {/* Reviews Section */}
            {state.profile.show_reviews && (
              <EditableReviews
                reviews={state.reviews.filter(r => r.comment)}
                showSection={state.profile.show_reviews}
              />
            )}

            {/* Footer */}
            <footer className="py-6 text-center text-gray-400 text-sm border-t border-gray-100">
              Propulsé par Verifolio
            </footer>
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <SettingsDrawer
          profile={state.profile}
          onClose={() => setShowSettings(false)}
          onUpdate={loadData}
        />
      )}

      {/* Design Panel */}
      {showDesign && currentTheme && (
        <DesignPanel
          themeColor={state.profile.theme_color}
          showLogo={state.profile.show_company_logo}
          onThemeChange={handleThemeChange}
          onShowLogoChange={handleShowLogoChange}
          onClose={() => setShowDesign(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Editable Header Component
// ============================================================================

interface EditableHeaderProps {
  profile: VerifolioProfile;
  onUpdate: () => void;
}

function EditableHeader({ profile, onUpdate }: EditableHeaderProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState({
    display_name: profile.display_name,
    title: profile.title || '',
    bio: profile.bio || '',
    photo_url: profile.photo_url || '',
    cta1_label: profile.cta1_label || '',
    cta1_url: profile.cta1_url || '',
    cta2_label: profile.cta2_label || '',
    cta2_url: profile.cta2_url || '',
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave
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
      } catch (error) {
        console.error('Autosave error:', error);
      }
    }, 500);
  }, []);

  const handleChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    autosave(field, value);
  };

  const handleBlur = () => {
    setEditingField(null);
    // Don't call onUpdate - local state is already updated and autosave handles persistence
  };

  const hasAnyCTA = values.cta1_label || values.cta2_label;

  return (
    <header className="py-8 px-6">
      <div className="flex items-start gap-6 max-w-2xl mx-auto">
        {/* Photo - Left side */}
        <EditablePhoto
          photoUrl={values.photo_url}
          displayName={values.display_name}
          onChange={(url) => handleChange('photo_url', url)}
        />

        {/* Content - Right side */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          {editingField === 'display_name' ? (
            <input
              type="text"
              value={values.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              onBlur={handleBlur}
              autoFocus
              className="text-2xl font-bold text-gray-900 w-full bg-transparent border-b-2 border-blue-500 outline-none"
            />
          ) : (
            <h1
              onClick={() => setEditingField('display_name')}
              className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors group inline-flex items-center gap-2"
            >
              {values.display_name}
              <PencilIcon className="w-4 h-4 opacity-0 group-hover:opacity-40" />
            </h1>
          )}

          {/* Title */}
          <div className="mt-1">
            {editingField === 'title' ? (
              <input
                type="text"
                value={values.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={handleBlur}
                autoFocus
                placeholder="Votre titre professionnel"
                className="text-gray-600 w-full bg-transparent border-b-2 border-blue-500 outline-none"
              />
            ) : values.title ? (
              <p
                onClick={() => setEditingField('title')}
                className="text-gray-600 cursor-pointer hover:text-blue-600 transition-colors group inline-flex items-center gap-2"
              >
                {values.title}
                <PencilIcon className="w-3 h-3 opacity-0 group-hover:opacity-40" />
              </p>
            ) : (
              <button
                onClick={() => setEditingField('title')}
                className="text-sm text-gray-400 hover:text-blue-600 transition-colors"
              >
                + Titre
              </button>
            )}
          </div>

          {/* Bio */}
          <div className="mt-2">
            {editingField === 'bio' ? (
              <textarea
                value={values.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                onBlur={handleBlur}
                autoFocus
                placeholder="Une courte bio..."
                rows={2}
                className="text-sm text-gray-500 w-full bg-gray-50 border border-blue-500 rounded outline-none p-2 resize-none"
              />
            ) : values.bio ? (
              <p
                onClick={() => setEditingField('bio')}
                className="text-sm text-gray-500 leading-relaxed cursor-pointer hover:text-gray-700 transition-colors group"
              >
                {values.bio}
                <PencilIcon className="w-3 h-3 inline-block ml-1 opacity-0 group-hover:opacity-40" />
              </p>
            ) : (
              <button
                onClick={() => setEditingField('bio')}
                className="text-sm text-gray-400 hover:text-blue-600 transition-colors"
              >
                + Bio
              </button>
            )}
          </div>

          {/* CTAs - Inline */}
          <div className="mt-4 flex flex-wrap gap-2">
            <EditableCTA
              label={values.cta1_label}
              url={values.cta1_url}
              isPrimary={true}
              onLabelChange={(v) => handleChange('cta1_label', v)}
              onUrlChange={(v) => handleChange('cta1_url', v)}
              placeholder="CTA principal"
            />
            {(values.cta1_label || values.cta2_label) && (
              <EditableCTA
                label={values.cta2_label}
                url={values.cta2_url}
                isPrimary={false}
                onLabelChange={(v) => handleChange('cta2_label', v)}
                onUrlChange={(v) => handleChange('cta2_url', v)}
                placeholder="CTA secondaire"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Editable Photo Component
// ============================================================================

interface EditablePhotoProps {
  photoUrl: string;
  displayName: string;
  onChange: (url: string) => void;
}

function EditablePhoto({ photoUrl, displayName, onChange }: EditablePhotoProps) {
  const [editing, setEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(photoUrl);

  const handleSave = () => {
    onChange(tempUrl);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex-shrink-0">
        <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-blue-500 bg-gray-100 flex items-center justify-center">
          {tempUrl ? (
            <Image src={tempUrl} alt={displayName} fill className="object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="mt-2 w-48">
          <input
            type="text"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder="URL de l'image"
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              OK
            </button>
            <button
              onClick={() => { setTempUrl(photoUrl); setEditing(false); }}
              className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!photoUrl) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
      >
        <div className="text-center">
          <svg className="w-6 h-6 text-gray-400 mx-auto group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Photo</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex-shrink-0 relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-white shadow group"
    >
      <Image src={photoUrl} alt={displayName} fill className="object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <PencilIcon className="w-5 h-5 text-white" />
      </div>
    </button>
  );
}

// ============================================================================
// Editable CTA Component
// ============================================================================

interface EditableCTAProps {
  label: string;
  url: string;
  isPrimary: boolean;
  onLabelChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  placeholder: string;
}

function EditableCTA({ label, url, isPrimary, onLabelChange, onUrlChange, placeholder }: EditableCTAProps) {
  const [editing, setEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);
  const [tempUrl, setTempUrl] = useState(url);

  const handleSave = () => {
    onLabelChange(tempLabel);
    onUrlChange(tempUrl);
    setEditing(false);
  };

  const handleDelete = () => {
    onLabelChange('');
    onUrlChange('');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg">
        <input
          type="text"
          value={tempLabel}
          onChange={(e) => setTempLabel(e.target.value)}
          placeholder="Texte du bouton"
          className="w-full px-2 py-1 text-sm border-b border-gray-200 outline-none mb-2"
          autoFocus
        />
        <input
          type="text"
          value={tempUrl}
          onChange={(e) => setTempUrl(e.target.value)}
          placeholder="URL (https://... ou mailto:...)"
          className="w-full px-2 py-1 text-sm border-b border-gray-200 outline-none mb-2"
        />
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
            OK
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200">
            Annuler
          </button>
          {(label || url) && (
            <button onClick={handleDelete} className="px-3 py-1 text-red-600 text-xs hover:bg-red-50 rounded">
              Supprimer
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!label && !url) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`px-3 py-1.5 text-xs rounded border border-dashed transition-colors ${
          isPrimary
            ? 'border-blue-300 text-blue-500 hover:border-blue-400 hover:bg-blue-50'
            : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        + {placeholder}
      </button>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded transition-colors group ${
        isPrimary
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
      <PencilIcon className="ml-1.5 w-3 h-3 opacity-0 group-hover:opacity-60" />
    </button>
  );
}

// ============================================================================
// Editable Activities Section
// ============================================================================

interface EditableActivitiesProps {
  activities: VerifolioActivity[];
  onUpdate: () => void;
}

function EditableActivities({ activities, onUpdate }: EditableActivitiesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const visibleActivities = activities.filter(a => a.is_visible);

  async function handleAdd() {
    if (!newTitle.trim()) return;

    setSaving(true);
    try {
      await fetch('/api/verifolio/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          image_url: newImageUrl || null,
        }),
      });
      setNewTitle('');
      setNewDescription('');
      setNewImageUrl('');
      setShowAddForm(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  async function handleNewFileUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'activity');

      const res = await fetch('/api/verifolio/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setNewImageUrl(data.url);
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }

  function handleNewDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleNewFileUpload(file);
  }

  async function handleToggleVisibility(id: string, isVisible: boolean) {
    await fetch(`/api/verifolio/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: !isVisible }),
    });
    onUpdate();
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette activité ?')) return;

    await fetch(`/api/verifolio/activities/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  // Don't render section if no activities and not adding
  if (visibleActivities.length === 0 && !showAddForm && activities.length === 0) {
    return (
      <section className="py-8 px-6 border-t border-gray-100">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
        >
          + Ajouter votre première activité
        </button>
      </section>
    );
  }

  return (
    <section className="py-12 px-6 border-t border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
        Mes activités
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
        {activities.map((activity) => (
          <EditableActivityCard
            key={activity.id}
            activity={activity}
            onToggleVisibility={() => handleToggleVisibility(activity.id, activity.is_visible)}
            onDelete={() => handleDelete(activity.id)}
            onUpdate={onUpdate}
          />
        ))}

        {/* Add button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="min-h-[200px] border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une activité
            </div>
          </button>
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="border-2 border-blue-500 rounded-xl p-4 bg-blue-50">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre de l'activité"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
              autoFocus
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optionnel)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm resize-none"
            />

            {/* Image Upload Zone */}
            <div
              onDrop={handleNewDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              onClick={() => addFileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg mb-3 cursor-pointer transition-colors bg-white ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : newImageUrl
                  ? 'border-gray-200'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input
                ref={addFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleNewFileUpload(file);
                }}
                className="hidden"
              />

              {uploading ? (
                <div className="flex items-center justify-center py-6">
                  <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="ml-2 text-sm text-gray-600">Upload...</span>
                </div>
              ) : newImageUrl ? (
                <div className="relative">
                  <div className="relative h-24 rounded-lg overflow-hidden">
                    <Image src={newImageUrl} alt="Preview" fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <span className="text-white text-sm font-medium">Changer</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setNewImageUrl(''); }}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-500">Glissez une image ou cliquez</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newTitle.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewImageUrl(''); }}
                className="px-3 py-2 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-50 border border-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// Editable Activity Card
// ============================================================================

interface EditableActivityCardProps {
  activity: VerifolioActivity;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

function EditableActivityCard({ activity, onToggleVisibility, onDelete, onUpdate }: EditableActivityCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description || '');
  const [imageUrl, setImageUrl] = useState(activity.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    await fetch(`/api/verifolio/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        image_url: imageUrl || null,
      }),
    });
    setEditing(false);
    onUpdate();
  }

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'activity');

      const res = await fetch('/api/verifolio/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  if (editing) {
    return (
      <div className="border-2 border-blue-500 rounded-xl p-4 bg-white">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'activité"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm font-medium"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm resize-none"
        />

        {/* Image Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg mb-3 cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : imageUrl
              ? 'border-gray-200 bg-gray-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />

          {uploading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-2 text-sm text-gray-600">Upload en cours...</span>
            </div>
          ) : imageUrl ? (
            <div className="relative">
              <div className="relative h-32 rounded-lg overflow-hidden">
                <Image src={imageUrl} alt="Preview" fill className="object-cover" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                <span className="text-white text-sm font-medium">Changer l'image</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageUrl('');
                }}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                title="Supprimer l'image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-500">Glissez une image ou cliquez</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP jusqu'à 5 Mo</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Enregistrer
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden group relative ${!activity.is_visible ? 'opacity-50' : ''}`}>
      {/* Hover actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 bg-white/90 rounded-lg shadow hover:bg-white"
          title="Modifier"
        >
          <PencilIcon className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={onToggleVisibility}
          className="p-1.5 bg-white/90 rounded-lg shadow hover:bg-white"
          title={activity.is_visible ? 'Masquer' : 'Afficher'}
        >
          {activity.is_visible ? (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-white/90 rounded-lg shadow hover:bg-red-50"
          title="Supprimer"
        >
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Image */}
      {activity.image_url && (
        <div className="relative h-40 bg-gray-100">
          <Image src={activity.image_url} alt={activity.title} fill className="object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{activity.title}</h3>
        {activity.description && (
          <p className="text-gray-600 text-sm leading-relaxed">{activity.description}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Editable Reviews Section (Read-only, just display)
// ============================================================================

interface EditableReviewsProps {
  reviews: VerifolioPublicReview[];
  showSection: boolean;
}

function EditableReviews({ reviews, showSection }: EditableReviewsProps) {
  // Only show reviews with written comments
  const writtenReviews = reviews.filter(r => r.comment && r.comment.trim());

  if (!showSection || writtenReviews.length === 0) {
    return (
      <section className="py-8 px-6 bg-gray-50 border-t border-gray-100">
        <div className="text-center text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>Les témoignages apparaîtront ici</p>
          <p className="text-sm mt-1">Demandez des avis à vos clients via les reviews</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-6 bg-gray-50 border-t border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
        Témoignages
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
        {writtenReviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <blockquote className="text-gray-700 leading-relaxed mb-4 italic">
              "{review.comment}"
            </blockquote>

            <div className="flex items-center justify-between">
              <div>
                {review.consent_display_identity && review.reviewer_name ? (
                  <>
                    <p className="font-medium text-gray-900">{review.reviewer_name}</p>
                    {(review.reviewer_role || review.reviewer_company) && (
                      <p className="text-sm text-gray-500">
                        {[review.reviewer_role, review.reviewer_company].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 italic text-sm">Client vérifié</p>
                )}
              </div>

              {review.activity_title && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {review.activity_title}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Settings Drawer
// ============================================================================

interface SettingsDrawerProps {
  profile: VerifolioProfile;
  onClose: () => void;
  onUpdate: () => void;
}

function SettingsDrawer({ profile, onClose, onUpdate }: SettingsDrawerProps) {
  const [slug, setSlug] = useState(profile.slug);
  const [showActivities, setShowActivities] = useState(profile.show_activities);
  const [showReviews, setShowReviews] = useState(profile.show_reviews);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          show_activities: showActivities,
          show_reviews: showReviews,
        }),
      });
      onUpdate();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Paramètres de la page</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de la page
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/verifolio/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Sections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sections affichées
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mes activités</span>
                  <input
                    type="checkbox"
                    checked={showActivities}
                    onChange={(e) => setShowActivities(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Témoignages</span>
                  <input
                    type="checkbox"
                    checked={showReviews}
                    onChange={(e) => setShowReviews(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Design Panel
// ============================================================================

interface DesignPanelProps {
  themeColor: VerifolioThemeColor;
  showLogo: boolean;
  onThemeChange: (color: VerifolioThemeColor) => void;
  onShowLogoChange: (show: boolean) => void;
  onClose: () => void;
}

function DesignPanel({ themeColor, showLogo, onThemeChange, onShowLogoChange, onClose }: DesignPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Design</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <VerifolioThemeSelector
            selectedColor={themeColor}
            showLogo={showLogo}
            onColorChange={onThemeChange}
            onShowLogoChange={onShowLogoChange}
          />

          <p className="mt-6 text-xs text-gray-400 text-center">
            Les modifications sont sauvegardées automatiquement
          </p>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Icons
// ============================================================================

function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
