'use client';

import { DailyReportCard } from '@/components/dashboard/DailyReportCard';
import { CreateButton } from '@/components/dashboard/CreateButton';
import { RecentItemsCard } from '@/components/dashboard/RecentItemsCard';

export function DashboardTab() {
  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonjour</h1>
            <p className="text-gray-500 mt-1">Voici votre rapport du jour</p>
          </div>
          <CreateButton />
        </div>

        {/* Rapport du jour */}
        <DailyReportCard />

        {/* Éléments récents */}
        <RecentItemsCard />
      </div>
    </div>
  );
}
