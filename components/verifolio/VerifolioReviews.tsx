'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { VerifolioPublicReview, VerifolioPublicActivity } from '@/lib/verifolio/types';

interface VerifolioReviewsProps {
  reviews: VerifolioPublicReview[];
  activities: VerifolioPublicActivity[];
  isEditable?: boolean;
  onActivityClick?: (activity: VerifolioPublicActivity) => void;
  onUpdate?: () => void;
  themeAccent?: string;
}

export function VerifolioReviews({
  reviews,
  activities,
  isEditable = false,
  onActivityClick,
  onUpdate,
  themeAccent = '#3b82f6',
}: VerifolioReviewsProps) {
  if (reviews.length === 0 && !isEditable) {
    return null;
  }

  return (
    <section>
      {/* Section title with lines */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gray-300" />
        <h2
          className="text-lg font-medium"
          style={{ color: themeAccent }}
        >
          Ils m'ont fait confiance
        </h2>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      {/* Reviews grid - 3 columns on desktop */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => {
          const activity = activities.find(a => a.id === review.activity_id);
          return (
            <ReviewCard
              key={review.id}
              review={review}
              activity={activity}
              isEditable={isEditable}
              onActivityClick={onActivityClick}
              onUpdate={onUpdate}
              themeAccent={themeAccent}
            />
          );
        })}
      </div>
    </section>
  );
}

interface ReviewCardProps {
  review: VerifolioPublicReview;
  activity?: VerifolioPublicActivity;
  isEditable?: boolean;
  onActivityClick?: (activity: VerifolioPublicActivity) => void;
  onUpdate?: () => void;
  themeAccent?: string;
}

function ReviewCard({
  review,
  activity,
  isEditable = false,
  onActivityClick,
  onUpdate,
  themeAccent = '#3b82f6',
}: ReviewCardProps) {
  const [editingLogo, setEditingLogo] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState(review.reviewer_company_logo_url || '');

  const handleLogoSave = async () => {
    try {
      await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_company_logo_url: tempLogoUrl || null }),
      });
      onUpdate?.();
      setEditingLogo(false);
    } catch (error) {
      console.error('Logo save error:', error);
    }
  };

  const handleViewActivity = () => {
    if (activity && activity.details_enabled && onActivityClick) {
      onActivityClick(activity);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
      {/* Large quote mark */}
      <div className="text-4xl text-gray-200 font-serif leading-none mb-2">"</div>

      {/* Comment */}
      <blockquote className="text-gray-700 leading-relaxed italic flex-1 mb-4">
        {review.comment}
      </blockquote>

      {/* Author section */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        {/* Company logo */}
        {editingLogo ? (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
              {tempLogoUrl && (
                <Image src={tempLogoUrl} alt="" width={40} height={40} className="object-contain" />
              )}
            </div>
            <input
              type="text"
              value={tempLogoUrl}
              onChange={(e) => setTempLogoUrl(e.target.value)}
              placeholder="URL du logo"
              className="w-32 text-xs border rounded px-1 py-0.5 mt-1"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleLogoSave}
                className="text-xs bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700"
              >
                OK
              </button>
              <button
                onClick={() => {
                  setEditingLogo(false);
                  setTempLogoUrl(review.reviewer_company_logo_url || '');
                }}
                className="text-xs bg-gray-200 text-gray-700 rounded px-2 py-0.5 hover:bg-gray-300"
              >
                X
              </button>
            </div>
          </div>
        ) : review.reviewer_company_logo_url ? (
          <div
            onClick={isEditable ? () => setEditingLogo(true) : undefined}
            className={`relative w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden ${
              isEditable ? 'cursor-pointer group' : ''
            }`}
          >
            <Image
              src={review.reviewer_company_logo_url}
              alt={review.reviewer_company || ''}
              width={40}
              height={40}
              className="object-contain"
            />
            {isEditable && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            )}
          </div>
        ) : isEditable ? (
          <button
            onClick={() => setEditingLogo(true)}
            className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex-shrink-0 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        ) : null}

        {/* Author info */}
        <div className="flex-1 min-w-0">
          {review.consent_display_identity && review.reviewer_name ? (
            <>
              <p className="font-medium text-gray-900 truncate">{review.reviewer_name}</p>
              {(review.reviewer_role || review.reviewer_company) && (
                <p className="text-sm text-gray-500 truncate">
                  {review.reviewer_role}
                  {review.reviewer_role && review.reviewer_company && ', '}
                  {review.reviewer_company}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic text-sm">Client vérifié</p>
          )}
        </div>

        {/* Rating stars */}
        {review.rating_overall && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon key={star} filled={star <= review.rating_overall!} size="sm" />
            ))}
          </div>
        )}
      </div>

      {/* View activity link */}
      {activity && activity.details_enabled && (
        <button
          onClick={handleViewActivity}
          className="mt-3 text-sm flex items-center gap-1 group"
          style={{ color: themeAccent }}
        >
          Voir la prestation
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Neutral mention for personal email */}
      {review.is_professional_email === false && (
        <p className="mt-2 text-xs text-gray-400">
          Témoignage rédigé via email personnel
        </p>
      )}
    </div>
  );
}

function StarIcon({ filled, size = 'md' }: { filled: boolean; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <svg
      className={`${sizeClass} ${filled ? 'text-yellow-400' : 'text-gray-200'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
