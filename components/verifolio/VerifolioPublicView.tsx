'use client';

import { useState } from 'react';
import type { VerifolioPublicProfile, VerifolioPublicActivity } from '@/lib/verifolio/types';
import { getVerifolioTheme } from '@/lib/verifolio/themes';
import { VerifolioHeader } from './VerifolioHeader';
import { VerifolioActivities } from './VerifolioActivities';
import { VerifolioReviews } from './VerifolioReviews';
import { ActivityDetailModal } from './ActivityDetailModal';

interface VerifolioPublicViewProps {
  profile: VerifolioPublicProfile;
  isEditable?: boolean;
  onProfileUpdate?: () => void;
}

export function VerifolioPublicView({
  profile,
  isEditable = false,
  onProfileUpdate,
}: VerifolioPublicViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<VerifolioPublicActivity | null>(null);

  const handleActivityClick = (activity: VerifolioPublicActivity) => {
    if (activity.details_enabled) {
      setSelectedActivity(activity);
    }
  };

  // Get theme based on profile color
  const theme = getVerifolioTheme(profile.theme_color);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.background }}
    >
      {/* Content container with max width */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header Card */}
        <VerifolioHeader
          profile={profile}
          isEditable={isEditable}
          themeAccent={theme.accent}
        />

        {/* Activities Section */}
        {profile.show_activities && profile.activities.length > 0 && (
          <VerifolioActivities
            activities={profile.activities}
            reviews={profile.reviews}
            isEditable={isEditable}
            onActivityClick={handleActivityClick}
            onUpdate={onProfileUpdate}
            themeAccent={theme.accent}
          />
        )}

        {/* Reviews Section */}
        {profile.show_reviews && profile.reviews.length > 0 && (
          <VerifolioReviews
            reviews={profile.reviews}
            activities={profile.activities}
            isEditable={isEditable}
            onActivityClick={handleActivityClick}
            onUpdate={onProfileUpdate}
            themeAccent={theme.accent}
          />
        )}

        {/* Footer */}
        <footer className="py-4 text-center text-gray-400 text-sm">
          <p>Propulsé par Verifolio</p>
        </footer>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          reviews={profile.reviews.filter(r => r.activity_id === selectedActivity.id)}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
}
