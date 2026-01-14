'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { VerifolioPublicActivity, VerifolioPublicReview } from '@/lib/verifolio/types';

interface ActivityDetailModalProps {
  activity: VerifolioPublicActivity;
  reviews: VerifolioPublicReview[];
  onClose: () => void;
}

export function ActivityDetailModal({
  activity,
  reviews,
  onClose,
}: ActivityDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative">
          {activity.image_url ? (
            <div className="relative h-48 md:h-64 bg-gray-100">
              <Image
                src={activity.image_url}
                alt={activity.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title overlay */}
          <div className={`absolute bottom-0 left-0 right-0 p-6 ${activity.image_url ? 'text-white' : 'text-white'}`}>
            <h2 className="text-2xl md:text-3xl font-bold">{activity.title}</h2>
            {activity.description && (
              <p className={`mt-2 ${activity.image_url ? 'text-white/90' : 'text-white/80'}`}>
                {activity.description}
              </p>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Details text */}
          {activity.details_text && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Détails</h3>
              <div className="prose prose-sm max-w-none text-gray-600">
                {activity.details_text.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          {/* Media gallery */}
          {activity.medias && activity.medias.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Galerie</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {activity.medias.map((media) => (
                  <MediaItem key={media.id} media={media} />
                ))}
              </div>
            </section>
          )}

          {/* Related reviews */}
          {reviews.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Témoignages ({reviews.length})
              </h3>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewItem key={review.id} review={review} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!activity.details_text && (!activity.medias || activity.medias.length === 0) && reviews.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun détail disponible pour cette prestation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Media item component
function MediaItem({ media }: { media: { id: string; media_type: 'image' | 'video'; url: string; caption: string | null } }) {
  if (media.media_type === 'video') {
    // Handle YouTube/Vimeo embeds
    const videoUrl = getEmbedUrl(media.url);
    if (videoUrl) {
      return (
        <div className="rounded-lg overflow-hidden bg-gray-100">
          <div className="relative pt-[56.25%]">
            <iframe
              src={videoUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {media.caption && (
            <p className="text-sm text-gray-500 px-3 py-2">{media.caption}</p>
          )}
        </div>
      );
    }
    // Fallback for direct video URLs
    return (
      <div className="rounded-lg overflow-hidden bg-gray-100">
        <video controls className="w-full">
          <source src={media.url} />
        </video>
        {media.caption && (
          <p className="text-sm text-gray-500 px-3 py-2">{media.caption}</p>
        )}
      </div>
    );
  }

  // Image
  return (
    <div className="rounded-lg overflow-hidden bg-gray-100">
      <div className="relative aspect-video">
        <Image
          src={media.url}
          alt={media.caption || ''}
          fill
          className="object-cover"
        />
      </div>
      {media.caption && (
        <p className="text-sm text-gray-500 px-3 py-2">{media.caption}</p>
      )}
    </div>
  );
}

// Review item component
function ReviewItem({ review }: { review: VerifolioPublicReview }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {/* Rating */}
      {review.rating_overall && (
        <div className="flex items-center gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${star <= review.rating_overall! ? 'text-yellow-400' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {/* Comment */}
      <blockquote className="text-gray-700 italic mb-3">
        "{review.comment}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        {review.reviewer_company_logo_url && (
          <div className="relative w-8 h-8 rounded-lg bg-white overflow-hidden flex-shrink-0">
            <Image
              src={review.reviewer_company_logo_url}
              alt={review.reviewer_company || ''}
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        )}
        <div>
          {review.consent_display_identity && review.reviewer_name ? (
            <>
              <p className="font-medium text-gray-900 text-sm">{review.reviewer_name}</p>
              {(review.reviewer_role || review.reviewer_company) && (
                <p className="text-xs text-gray-500">
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
      </div>
    </div>
  );
}

// Helper to convert YouTube/Vimeo URLs to embed URLs
function getEmbedUrl(url: string): string | null {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Already an embed URL
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/')) {
    return url;
  }

  return null;
}
