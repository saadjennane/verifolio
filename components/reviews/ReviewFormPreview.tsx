'use client';

import { useState } from 'react';
import type { RatingCriterion, CheckboxField } from '@/lib/reviews/types';

interface ReviewFormPreviewProps {
  ratingCriteria: RatingCriterion[];
  textPlaceholder: string;
  lowRatingPlaceholder: string;
  showTextField: boolean;
  showLowRatingField: boolean;
  checkboxes: CheckboxField[];
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label || 'Critère sans nom'}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <svg
              className={`w-6 h-6 ${
                star <= (hovered || value)
                  ? 'text-yellow-400'
                  : 'text-gray-200'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewFormPreview({
  ratingCriteria,
  textPlaceholder,
  lowRatingPlaceholder,
  showTextField,
  showLowRatingField,
  checkboxes,
}: ReviewFormPreviewProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [lowRatingComment, setLowRatingComment] = useState('');
  const [checkedBoxes, setCheckedBoxes] = useState<Record<string, boolean>>({});

  const hasLowRating = Object.values(ratings).some((r) => r > 0 && r <= 2);
  const visibleCheckboxes = checkboxes.filter((c) => c.is_visible);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Votre avis compte</h2>
        <p className="text-sm text-gray-500 mt-1">
          Merci de prendre quelques instants pour partager votre expérience
        </p>
      </div>

      {/* Rating Criteria */}
      {ratingCriteria.length > 0 ? (
        <div className="space-y-1">
          {ratingCriteria.map((criterion) => (
            <StarRating
              key={criterion.id}
              label={criterion.label}
              value={ratings[criterion.id] || 0}
              onChange={(value) =>
                setRatings({ ...ratings, [criterion.id]: value })
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          Ajoutez des critères d&apos;évaluation
        </div>
      )}

      {/* Low rating field (conditional) */}
      {showLowRatingField && hasLowRating && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <label className="block text-sm font-medium text-orange-800 mb-2">
            {lowRatingPlaceholder}
          </label>
          <textarea
            value={lowRatingComment}
            onChange={(e) => setLowRatingComment(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm text-gray-900 caret-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
        </div>
      )}

      {/* Text field */}
      {showTextField && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {textPlaceholder}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 caret-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Checkboxes */}
      {visibleCheckboxes.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          {visibleCheckboxes.map((checkbox) => (
            <div key={checkbox.id} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={`preview-${checkbox.id}`}
                checked={checkedBoxes[checkbox.id] || false}
                onChange={(e) =>
                  setCheckedBoxes({ ...checkedBoxes, [checkbox.id]: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor={`preview-${checkbox.id}`}
                className="text-sm text-gray-700 cursor-pointer"
              >
                {checkbox.label}
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Submit button (disabled in preview) */}
      <button
        type="button"
        disabled
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
      >
        Envoyer mon avis
      </button>

      <p className="text-xs text-center text-gray-400">
        Ceci est une prévisualisation. Le formulaire réel sera envoyé aux clients.
      </p>
    </div>
  );
}
