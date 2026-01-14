'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { VerifolioPublicActivity, VerifolioPublicReview } from '@/lib/verifolio/types';

interface VerifolioActivitiesProps {
  activities: VerifolioPublicActivity[];
  reviews?: VerifolioPublicReview[];
  isEditable?: boolean;
  onActivityClick?: (activity: VerifolioPublicActivity) => void;
  onUpdate?: () => void;
  themeAccent?: string;
}

export function VerifolioActivities({
  activities,
  reviews = [],
  isEditable = false,
  onActivityClick,
  onUpdate,
  themeAccent = '#3b82f6',
}: VerifolioActivitiesProps) {
  if (activities.length === 0 && !isEditable) {
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
          Mes Activités
        </h2>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            reviewCount={reviews.filter(r => r.activity_id === activity.id).length}
            isEditable={isEditable}
            onClick={onActivityClick}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  );
}

interface ActivityCardProps {
  activity: VerifolioPublicActivity;
  reviewCount: number;
  isEditable?: boolean;
  onClick?: (activity: VerifolioPublicActivity) => void;
  onUpdate?: () => void;
}

function ActivityCard({
  activity,
  reviewCount,
  isEditable = false,
  onClick,
  onUpdate,
}: ActivityCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [values, setValues] = useState({
    title: activity.title,
    description: activity.description || '',
  });
  const [editingImage, setEditingImage] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(activity.image_url || '');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autosave = useCallback(async (field: string, value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/verifolio/activities/${activity.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value || null }),
        });
        onUpdate?.();
      } catch (error) {
        console.error('Autosave error:', error);
      }
    }, 500);
  }, [activity.id, onUpdate]);

  const handleChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (isEditable) {
      autosave(field, value);
    }
  };

  const handleImageSave = async () => {
    try {
      await fetch(`/api/verifolio/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: tempImageUrl || null }),
      });
      onUpdate?.();
      setEditingImage(false);
    } catch (error) {
      console.error('Image save error:', error);
    }
  };

  const handleCardClick = () => {
    if (!isEditable && activity.details_enabled && onClick) {
      onClick(activity);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-lg shadow-sm overflow-hidden ${
        !isEditable && activity.details_enabled ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        {editingImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gray-50">
            <input
              type="text"
              value={tempImageUrl}
              onChange={(e) => setTempImageUrl(e.target.value)}
              placeholder="URL de l'image"
              className="w-full text-sm border rounded px-2 py-1 mb-2"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageSave();
                }}
                className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700"
              >
                OK
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingImage(false);
                  setTempImageUrl(activity.image_url || '');
                }}
                className="text-xs bg-gray-200 text-gray-700 rounded px-3 py-1 hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : activity.image_url ? (
          <>
            <Image
              src={activity.image_url}
              alt={activity.title}
              fill
              className="object-cover"
            />
            {isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingImage(true);
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </>
        ) : isEditable ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingImage(true);
            }}
            className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-xs">Ajouter une image</span>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        {isEditable && editingField === 'title' ? (
          <input
            type="text"
            value={values.title}
            onChange={(e) => handleChange('title', e.target.value)}
            onBlur={() => setEditingField(null)}
            autoFocus
            className="w-full text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            onClick={isEditable ? (e) => {
              e.stopPropagation();
              setEditingField('title');
            } : undefined}
            className={`text-lg font-semibold text-gray-900 mb-2 ${
              isEditable ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors' : ''
            }`}
          >
            {values.title}
            {isEditable && (
              <svg className="inline-block w-4 h-4 ml-1 opacity-0 group-hover:opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </h3>
        )}

        {/* Description */}
        {isEditable && editingField === 'description' ? (
          <textarea
            value={values.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onBlur={() => setEditingField(null)}
            autoFocus
            rows={3}
            placeholder="Description..."
            className="w-full text-sm text-gray-600 bg-transparent border-b-2 border-blue-500 focus:outline-none resize-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            onClick={isEditable ? (e) => {
              e.stopPropagation();
              setEditingField('description');
            } : undefined}
            className={`text-sm text-gray-600 leading-relaxed ${
              isEditable ? 'cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors min-h-[3rem]' : ''
            } ${!values.description && isEditable ? 'text-gray-400 italic' : ''}`}
          >
            {values.description || (isEditable ? 'Ajouter une description...' : '')}
          </p>
        )}

        {/* Review count indicator */}
        {reviewCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {reviewCount} témoignage{reviewCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
