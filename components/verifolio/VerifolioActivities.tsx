'use client';

import Image from 'next/image';
import type { VerifolioPublicActivity } from '@/lib/verifolio/types';

interface VerifolioActivitiesProps {
  activities: VerifolioPublicActivity[];
}

export function VerifolioActivities({ activities }: VerifolioActivitiesProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Mes activités
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityCard({ activity }: { activity: VerifolioPublicActivity }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      {activity.image_url && (
        <div className="relative h-40 bg-gray-100">
          <Image
            src={activity.image_url}
            alt={activity.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {activity.title}
        </h3>
        {activity.description && (
          <p className="text-gray-600 text-sm leading-relaxed">
            {activity.description}
          </p>
        )}
      </div>
    </div>
  );
}
