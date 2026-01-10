'use client';

import type { VerifolioPublicProfile } from '@/lib/verifolio/types';
import { VerifolioHeader } from './VerifolioHeader';
import { VerifolioActivities } from './VerifolioActivities';
import { VerifolioReviews } from './VerifolioReviews';

interface VerifolioPublicViewProps {
  profile: VerifolioPublicProfile;
}

export function VerifolioPublicView({ profile }: VerifolioPublicViewProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <VerifolioHeader
        photoUrl={profile.photo_url}
        displayName={profile.display_name}
        title={profile.title}
        bio={profile.bio}
        cta1Label={profile.cta1_label}
        cta1Url={profile.cta1_url}
        cta2Label={profile.cta2_label}
        cta2Url={profile.cta2_url}
      />

      {/* Activities Section */}
      {profile.show_activities && profile.activities.length > 0 && (
        <VerifolioActivities activities={profile.activities} />
      )}

      {/* Reviews Section */}
      {profile.show_reviews && profile.reviews.length > 0 && (
        <VerifolioReviews
          reviews={profile.reviews}
          activities={profile.activities}
        />
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 text-sm">
        <p>Propulsé par Verifolio</p>
      </footer>
    </div>
  );
}
