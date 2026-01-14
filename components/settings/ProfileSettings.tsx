'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Input, PhoneInput } from '@/components/ui';
import { useSettingsCompletionStore } from '@/lib/stores/settings-completion-store';

interface UserProfile {
  id?: string;
  user_id: string;
  prenom: string | null;
  nom: string | null;
  fonction: string | null;
  telephone: string | null;
  date_anniversaire: string | null;
  photo_url: string | null;
  email: string | null;
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invalidateCache = useSettingsCompletionStore((state) => state.invalidateCache);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: profile.prenom,
          nom: profile.nom,
          fonction: profile.fonction,
          telephone: profile.telephone,
          date_anniversaire: profile.date_anniversaire,
          photo_url: profile.photo_url,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
        // Refresh completion widget
        invalidateCache();
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde du profil' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pour l'instant, on utilise une URL de données locale
    // Dans une vraie implémentation, on uploadrait vers Supabase Storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => prev ? { ...prev, photo_url: reader.result as string } : null);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">Mon profil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez vos informations personnelles
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo de profil */}
        <div className="flex items-center gap-6">
          <div
            onClick={handlePhotoClick}
            className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border-2 border-border"
          >
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt="Photo de profil"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Photo de profil</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cliquez sur l'image pour modifier
            </p>
            {profile?.photo_url && (
              <button
                type="button"
                onClick={() => setProfile(prev => prev ? { ...prev, photo_url: null } : null)}
                className="text-xs text-destructive hover:underline mt-1"
              >
                Supprimer la photo
              </button>
            )}
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Prénom"
            value={profile?.prenom || ''}
            onChange={(e) => setProfile(prev => prev ? { ...prev, prenom: e.target.value } : null)}
            placeholder="Votre prénom"
          />
          <Input
            label="Nom"
            value={profile?.nom || ''}
            onChange={(e) => setProfile(prev => prev ? { ...prev, nom: e.target.value } : null)}
            placeholder="Votre nom"
          />
        </div>

        <Input
          label="Fonction"
          value={profile?.fonction || ''}
          onChange={(e) => setProfile(prev => prev ? { ...prev, fonction: e.target.value } : null)}
          placeholder="Ex: Développeur freelance, Designer UX..."
        />

        <div className="grid grid-cols-2 gap-4">
          <PhoneInput
            label="Téléphone"
            value={profile?.telephone || ''}
            onChange={(value) => setProfile(prev => prev ? { ...prev, telephone: value } : null)}
            defaultCountry="FR"
          />
          <Input
            label="Date d'anniversaire"
            type="date"
            value={profile?.date_anniversaire || ''}
            onChange={(e) => setProfile(prev => prev ? { ...prev, date_anniversaire: e.target.value } : null)}
          />
        </div>

        {/* Email (lecture seule - vient de l'auth) */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <span className="text-xs text-muted-foreground">
              (via compte Google)
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
