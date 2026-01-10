'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/Badge';
import type { VerifolioProfile, VerifolioActivity } from '@/lib/verifolio/types';

export default function VerifolioSettingsPage() {
  const [profile, setProfile] = useState<VerifolioProfile | null>(null);
  const [activities, setActivities] = useState<VerifolioActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [cta1Label, setCta1Label] = useState('');
  const [cta1Url, setCta1Url] = useState('');
  const [cta2Label, setCta2Label] = useState('');
  const [cta2Url, setCta2Url] = useState('');
  const [showActivities, setShowActivities] = useState(true);
  const [showReviews, setShowReviews] = useState(true);
  const [reviewsMinRating, setReviewsMinRating] = useState<string>('');

  // New activity form
  const [showNewActivityForm, setShowNewActivityForm] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [newActivityImageUrl, setNewActivityImageUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch('/api/verifolio');
      const data = await res.json();

      if (data.profile) {
        setProfile(data.profile);
        setDisplayName(data.profile.display_name);
        setSlug(data.profile.slug);
        setTitle(data.profile.title || '');
        setBio(data.profile.bio || '');
        setPhotoUrl(data.profile.photo_url || '');
        setCta1Label(data.profile.cta1_label || '');
        setCta1Url(data.profile.cta1_url || '');
        setCta2Label(data.profile.cta2_label || '');
        setCta2Url(data.profile.cta2_url || '');
        setShowActivities(data.profile.show_activities);
        setShowReviews(data.profile.show_reviews);
        setReviewsMinRating(data.profile.reviews_min_rating?.toString() || '');

        // Load activities
        const activitiesRes = await fetch('/api/verifolio/activities');
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.activities || []);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createProfile() {
    if (!displayName.trim()) {
      alert('Le nom est requis');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/verifolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      await loadProfile();
    } catch (error) {
      console.error('Error creating profile:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          slug,
          title: title || null,
          bio: bio || null,
          photo_url: photoUrl || null,
          cta1_label: cta1Label || null,
          cta1_url: cta1Url || null,
          cta2_label: cta2Label || null,
          cta2_url: cta2Url || null,
          show_activities: showActivities,
          show_reviews: showReviews,
          reviews_min_rating: reviewsMinRating ? Number(reviewsMinRating) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      await loadProfile();
      alert('Profil sauvegardé !');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    if (!profile) return;

    setSaving(true);
    try {
      const res = await fetch('/api/verifolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !profile.is_published }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      await loadProfile();
    } catch (error) {
      console.error('Error toggling published:', error);
      alert(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function addActivity() {
    if (!newActivityTitle.trim()) {
      alert('Le titre est requis');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/verifolio/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newActivityTitle,
          description: newActivityDescription || null,
          image_url: newActivityImageUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      setNewActivityTitle('');
      setNewActivityDescription('');
      setNewActivityImageUrl('');
      setShowNewActivityForm(false);
      await loadProfile();
    } catch (error) {
      console.error('Error adding activity:', error);
      alert(error instanceof Error ? error.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(activityId: string) {
    if (!confirm('Supprimer cette activité ?')) return;

    try {
      const res = await fetch(`/api/verifolio/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      await loadProfile();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert(error instanceof Error ? error.message : 'Erreur');
    }
  }

  async function toggleActivityVisibility(activityId: string, isVisible: boolean) {
    try {
      const res = await fetch(`/api/verifolio/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: !isVisible }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      await loadProfile();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  // No profile yet - show creation form
  if (!profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon Verifolio</h1>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Créer votre page publique</h2>
          <p className="text-gray-600 mb-6">
            Créez votre page Verifolio pour présenter vos activités et vos avis clients.
          </p>

          <div className="space-y-4">
            <Input
              label="Votre nom ou celui de votre entreprise"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jean Dupont"
            />

            <Button onClick={createProfile} disabled={saving}>
              {saving ? 'Création...' : 'Créer ma page'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verifolio/${slug}`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon Verifolio</h1>

        <div className="flex items-center gap-4">
          <Badge variant={profile.is_published ? 'green' : 'gray'}>
            {profile.is_published ? 'Publié' : 'Non publié'}
          </Badge>
          <Button
            variant={profile.is_published ? 'outline' : 'primary'}
            onClick={togglePublished}
            disabled={saving}
          >
            {profile.is_published ? 'Dépublier' : 'Publier'}
          </Button>
        </div>
      </div>

      {/* Public URL */}
      {profile.is_published && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">Votre page publique</p>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {publicUrl}
              </a>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              Copier
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Header Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">En-tête</h2>
          <div className="space-y-4">
            <Input
              label="Nom affiché"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              label="URL (slug)"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
            <Input
              label="Photo / Logo (URL)"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
            <Input
              label="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mentaliste & consultant innovation"
            />
            <Textarea
              label="Bio (2 lignes max)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Une courte description de ce que vous faites..."
            />
          </div>
        </Card>

        {/* CTAs Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Boutons d'action</h2>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">CTA 1 (principal)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label (ex: Me contacter)"
                  value={cta1Label}
                  onChange={(e) => setCta1Label(e.target.value)}
                />
                <Input
                  placeholder="URL (ex: mailto:...)"
                  value={cta1Url}
                  onChange={(e) => setCta1Url(e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">CTA 2 (secondaire)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label (ex: Mon portfolio)"
                  value={cta2Label}
                  onChange={(e) => setCta2Label(e.target.value)}
                />
                <Input
                  placeholder="URL (ex: https://...)"
                  value={cta2Url}
                  onChange={(e) => setCta2Url(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Sections Toggle */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sections</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Afficher mes activités</span>
              <Switch
                checked={showActivities}
                onCheckedChange={setShowActivities}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Afficher les avis clients</span>
              <Switch
                checked={showReviews}
                onCheckedChange={setShowReviews}
              />
            </div>
            {showReviews && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note minimum des avis affichés
                </label>
                <select
                  value={reviewsMinRating}
                  onChange={(e) => setReviewsMinRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les avis</option>
                  <option value="3">3+ étoiles</option>
                  <option value="4">4+ étoiles</option>
                  <option value="5">5 étoiles uniquement</option>
                </select>
              </div>
            )}
          </div>
        </Card>

        {/* Save Button */}
        <Card className="p-6 flex items-end">
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </Button>
        </Card>
      </div>

      {/* Activities Section */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mes activités</h2>
          <Button
            size="sm"
            onClick={() => setShowNewActivityForm(!showNewActivityForm)}
          >
            {showNewActivityForm ? 'Annuler' : 'Ajouter'}
          </Button>
        </div>

        {/* New activity form */}
        {showNewActivityForm && (
          <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-3">
            <Input
              label="Titre de l'activité"
              value={newActivityTitle}
              onChange={(e) => setNewActivityTitle(e.target.value)}
              placeholder="Ex: Consulting"
            />
            <Textarea
              label="Description (optionnel)"
              value={newActivityDescription}
              onChange={(e) => setNewActivityDescription(e.target.value)}
              rows={2}
              placeholder="1-2 phrases..."
            />
            <Input
              label="Image (URL, optionnel)"
              value={newActivityImageUrl}
              onChange={(e) => setNewActivityImageUrl(e.target.value)}
              placeholder="https://..."
            />
            <Button onClick={addActivity} disabled={saving}>
              {saving ? 'Ajout...' : 'Ajouter l\'activité'}
            </Button>
          </div>
        )}

        {/* Activities list */}
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune activité ajoutée</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  activity.is_visible ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {activity.image_url && (
                    <img
                      src={activity.image_url}
                      alt={activity.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    {activity.description && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActivityVisibility(activity.id, activity.is_visible)}
                  >
                    {activity.is_visible ? 'Masquer' : 'Afficher'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteActivity(activity.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
