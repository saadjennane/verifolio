'use client';

import { useState } from 'react';
import type { VerifolioPublicReview, VerifolioPublicActivity } from '@/lib/verifolio/types';

interface VerifolioReviewsProps {
  reviews: VerifolioPublicReview[];
  activities: VerifolioPublicActivity[];
}

export function VerifolioReviews({ reviews, activities }: VerifolioReviewsProps) {
  const [filterActivity, setFilterActivity] = useState<string | null>(null);
  const [filterMinRating, setFilterMinRating] = useState<number | null>(null);

  if (reviews.length === 0) {
    return null;
  }

  // Get unique activities from reviews
  const reviewActivities = activities.filter((a) =>
    reviews.some((r) => r.activity_id === a.id)
  );

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (filterActivity && review.activity_id !== filterActivity) {
      return false;
    }
    if (filterMinRating && review.rating_overall && review.rating_overall < filterMinRating) {
      return false;
    }
    return true;
  });

  const hasFilters = reviewActivities.length > 0;

  return (
    <section className="py-12 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Avis clients
        </h2>

        {/* Filters */}
        {hasFilters && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {/* Activity filter */}
            {reviewActivities.length > 0 && (
              <select
                value={filterActivity || ''}
                onChange={(e) => setFilterActivity(e.target.value || null)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les activités</option>
                {reviewActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            )}

            {/* Rating filter */}
            <select
              value={filterMinRating || ''}
              onChange={(e) => setFilterMinRating(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les notes</option>
              <option value="5">5 étoiles</option>
              <option value="4">4+ étoiles</option>
              <option value="3">3+ étoiles</option>
            </select>
          </div>
        )}

        {/* Reviews grid */}
        {filteredReviews.length === 0 ? (
          <p className="text-center text-gray-500">
            Aucun avis correspondant aux critères
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: VerifolioPublicReview }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Rating */}
      {review.rating_overall && (
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              filled={star <= review.rating_overall!}
            />
          ))}
        </div>
      )}

      {/* Comment */}
      <blockquote className="text-gray-700 leading-relaxed mb-4">
        "{review.comment}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center justify-between">
        <div>
          {review.consent_display_identity && review.reviewer_name ? (
            <>
              <p className="font-medium text-gray-900">{review.reviewer_name}</p>
              {review.reviewer_role && review.reviewer_company && (
                <p className="text-sm text-gray-500">
                  {review.reviewer_role}, {review.reviewer_company}
                </p>
              )}
              {review.reviewer_role && !review.reviewer_company && (
                <p className="text-sm text-gray-500">{review.reviewer_role}</p>
              )}
              {!review.reviewer_role && review.reviewer_company && (
                <p className="text-sm text-gray-500">{review.reviewer_company}</p>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic text-sm">Client vérifié</p>
          )}
        </div>

        {/* Activity tag */}
        {review.activity_title && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
            {review.activity_title}
          </span>
        )}
      </div>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-gray-200'}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
