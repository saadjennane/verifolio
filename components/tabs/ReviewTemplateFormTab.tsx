'use client';

import { useState, useEffect } from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { Button, Input, Textarea } from '@/components/ui';
import type { RatingCriterion, ReviewTemplate, CheckboxField } from '@/lib/reviews/types';
import {
  DEFAULT_TEXT_PLACEHOLDER,
  DEFAULT_LOW_RATING_PLACEHOLDER,
  DEFAULT_RATING_CRITERIA,
  DEFAULT_CHECKBOXES,
} from '@/lib/reviews/types';
import { ReviewFormPreview } from '@/components/reviews/ReviewFormPreview';

interface ReviewTemplateFormTabProps {
  templateId?: string;
}

export function ReviewTemplateFormTab({ templateId }: ReviewTemplateFormTabProps) {
  const { closeTab, getActiveTab } = useTabsStore();
  const isEditing = !!templateId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ratingCriteria, setRatingCriteria] = useState<RatingCriterion[]>(
    DEFAULT_RATING_CRITERIA.map((c) => ({ ...c, id: crypto.randomUUID() }))
  );
  const [textPlaceholder, setTextPlaceholder] = useState(DEFAULT_TEXT_PLACEHOLDER);
  const [lowRatingPlaceholder, setLowRatingPlaceholder] = useState(DEFAULT_LOW_RATING_PLACEHOLDER);
  const [showTextField, setShowTextField] = useState(true);
  const [showLowRatingField, setShowLowRatingField] = useState(true);
  const [checkboxes, setCheckboxes] = useState<CheckboxField[]>(
    DEFAULT_CHECKBOXES.map((c) => ({ ...c, id: crypto.randomUUID() }))
  );
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  async function fetchTemplate() {
    try {
      const res = await fetch(`/api/settings/review-templates/${templateId}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Template non trouvé');
        return;
      }

      const template: ReviewTemplate = json.data;
      setName(template.name);
      setDescription(template.description || '');
      setRatingCriteria(template.rating_criteria);
      setTextPlaceholder(template.text_placeholder);
      setLowRatingPlaceholder(template.low_rating_placeholder);
      setShowTextField(template.show_text_field);
      setShowLowRatingField(template.show_low_rating_field);
      setCheckboxes(template.checkboxes || DEFAULT_CHECKBOXES.map((c) => ({ ...c, id: crypto.randomUUID() })));
      setIsDefault(template.is_default);
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }

  // Criteria management
  function addCriterion() {
    if (ratingCriteria.length >= 4) return;
    const newCriterion: RatingCriterion = {
      id: crypto.randomUUID(),
      label: '',
      order: ratingCriteria.length,
    };
    setRatingCriteria([...ratingCriteria, newCriterion]);
  }

  function removeCriterion(criterionId: string) {
    if (ratingCriteria.length <= 1) return;
    const updated = ratingCriteria
      .filter((c) => c.id !== criterionId)
      .map((c, idx) => ({ ...c, order: idx }));
    setRatingCriteria(updated);
  }

  function updateCriterionLabel(criterionId: string, label: string) {
    const updated = ratingCriteria.map((c) =>
      c.id === criterionId ? { ...c, label } : c
    );
    setRatingCriteria(updated);
  }

  function moveCriterion(criterionId: string, direction: 'up' | 'down') {
    const idx = ratingCriteria.findIndex((c) => c.id === criterionId);
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === ratingCriteria.length - 1)
    ) {
      return;
    }

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...ratingCriteria];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setRatingCriteria(updated.map((c, i) => ({ ...c, order: i })));
  }

  // Checkbox management
  function addCheckbox() {
    if (checkboxes.length >= 4) return;
    const newCheckbox: CheckboxField = {
      id: crypto.randomUUID(),
      label: '',
      order: checkboxes.length,
      is_visible: true,
    };
    setCheckboxes([...checkboxes, newCheckbox]);
  }

  function removeCheckbox(checkboxId: string) {
    if (checkboxes.length <= 1) return;
    const updated = checkboxes
      .filter((c) => c.id !== checkboxId)
      .map((c, idx) => ({ ...c, order: idx }));
    setCheckboxes(updated);
  }

  function updateCheckboxLabel(checkboxId: string, label: string) {
    const updated = checkboxes.map((c) =>
      c.id === checkboxId ? { ...c, label } : c
    );
    setCheckboxes(updated);
  }

  function toggleCheckboxVisibility(checkboxId: string) {
    const updated = checkboxes.map((c) =>
      c.id === checkboxId ? { ...c, is_visible: !c.is_visible } : c
    );
    setCheckboxes(updated);
  }

  function moveCheckbox(checkboxId: string, direction: 'up' | 'down') {
    const idx = checkboxes.findIndex((c) => c.id === checkboxId);
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === checkboxes.length - 1)
    ) {
      return;
    }

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...checkboxes];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setCheckboxes(updated.map((c, i) => ({ ...c, order: i })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/settings/review-templates/${templateId}`
        : '/api/settings/review-templates';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          rating_criteria: ratingCriteria,
          text_placeholder: textPlaceholder.trim(),
          low_rating_placeholder: lowRatingPlaceholder.trim(),
          show_text_field: showTextField,
          show_low_rating_field: showLowRatingField,
          checkboxes: checkboxes,
          is_default: isDefault,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Erreur lors de la sauvegarde');
        return;
      }

      // Close this tab
      const activeTab = getActiveTab();
      if (activeTab) {
        closeTab(activeTab.id);
      }
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    const activeTab = getActiveTab();
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !name && isEditing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleCancel}>Fermer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Modifier le template' : 'Nouveau template de review'}
            </h1>
            <p className="text-gray-500 mt-1">
              Configurez les critères d&apos;évaluation et les textes
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Masquer la prévisualisation' : 'Prévisualiser'}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            {/* Name */}
            <Input
              label="Nom du template"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Avis prestation événementielle"
              required
            />

            {/* Description */}
            <Textarea
              label="Description (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Une courte description de ce template"
              rows={2}
            />

            {/* Rating Criteria */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Critères d&apos;évaluation par étoiles
                </label>
                <span className="text-xs text-gray-500">
                  {ratingCriteria.length}/4 critères
                </span>
              </div>
              <div className="space-y-2">
                {ratingCriteria.map((criterion, idx) => (
                  <div key={criterion.id} className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveCriterion(criterion.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCriterion(criterion.id, 'down')}
                        disabled={idx === ratingCriteria.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={criterion.label}
                      onChange={(e) => updateCriterionLabel(criterion.id, e.target.value)}
                      placeholder={`Critère ${idx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 caret-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(criterion.id)}
                      disabled={ratingCriteria.length <= 1}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {ratingCriteria.length < 4 && (
                <button
                  type="button"
                  onClick={addCriterion}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Ajouter un critère
                </button>
              )}
            </div>

            {/* Text Placeholder */}
            <div>
              <Input
                label="Placeholder du champ texte libre"
                value={textPlaceholder}
                onChange={(e) => setTextPlaceholder(e.target.value)}
                placeholder={DEFAULT_TEXT_PLACEHOLDER}
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="show_text_field"
                  checked={showTextField}
                  onChange={(e) => setShowTextField(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="show_text_field" className="text-sm text-gray-700">
                  Afficher le champ de texte libre
                </label>
              </div>
            </div>

            {/* Low Rating Placeholder */}
            <div>
              <Input
                label="Placeholder pour notes basses (1-2 étoiles)"
                value={lowRatingPlaceholder}
                onChange={(e) => setLowRatingPlaceholder(e.target.value)}
                placeholder={DEFAULT_LOW_RATING_PLACEHOLDER}
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="show_low_rating_field"
                  checked={showLowRatingField}
                  onChange={(e) => setShowLowRatingField(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="show_low_rating_field" className="text-sm text-gray-700">
                  Afficher le champ conditionnel pour notes basses
                </label>
              </div>
            </div>

            {/* Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cases à cocher
                </label>
                <span className="text-xs text-gray-500">
                  {checkboxes.length}/4 cases
                </span>
              </div>

              <div className="space-y-2">
                {checkboxes.map((checkbox, idx) => (
                  <div key={checkbox.id} className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveCheckbox(checkbox.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCheckbox(checkbox.id, 'down')}
                        disabled={idx === checkboxes.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCheckboxVisibility(checkbox.id)}
                      className={`p-1.5 rounded ${checkbox.is_visible ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}
                      title={checkbox.is_visible ? 'Visible' : 'Masqué'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {checkbox.is_visible ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        )}
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={checkbox.label}
                      onChange={(e) => updateCheckboxLabel(checkbox.id, e.target.value)}
                      placeholder={`Case ${idx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 caret-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeCheckbox(checkbox.id)}
                      disabled={checkboxes.length <= 1}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {checkboxes.length < 4 && (
                <button
                  type="button"
                  onClick={addCheckbox}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Ajouter une case
                </button>
              )}
            </div>

            {/* Is Default */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">
                Définir comme template par défaut
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Annuler
              </Button>
              <Button type="submit" loading={saving}>
                {isEditing ? 'Enregistrer' : 'Créer le template'}
              </Button>
            </div>
          </form>

          {/* Preview */}
          {showPreview && (
            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Prévisualisation du formulaire</h3>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <ReviewFormPreview
                  ratingCriteria={ratingCriteria}
                  textPlaceholder={textPlaceholder}
                  lowRatingPlaceholder={lowRatingPlaceholder}
                  showTextField={showTextField}
                  showLowRatingField={showLowRatingField}
                  checkboxes={checkboxes}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
