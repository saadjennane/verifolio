'use client';

import { Badge } from '@/components/ui/Badge';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { MissionListItem } from '@/lib/missions';

interface MissionCardProps {
  mission: MissionListItem;
  onClick: () => void;
  isDragging?: boolean;
}

export function MissionCard({ mission, onClick, isDragging = false }: MissionCardProps) {
  function formatAmount(amount: number | null | undefined, currency: string = 'EUR') {
    if (!amount) return '-';
    const symbol = getCurrencySymbol(currency);
    return `${Number(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${symbol}`;
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${
        isDragging
          ? 'opacity-0 scale-95'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-lg active:scale-[0.98]'
      }`}
    >
      {/* Badges en premier */}
      {mission.badges && mission.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {mission.badges.map((badge, idx) => (
            <Badge key={idx} variant={badge.variant as any || 'gray'} className="text-xs font-semibold">
              {badge.badge}
            </Badge>
          ))}
        </div>
      )}

      {/* Nom de la mission */}
      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
        {mission.title}
      </h3>

      {/* Client */}
      <p className="text-sm text-gray-600 mb-2">
        {mission.client?.nom || 'Sans client'}
      </p>

      {/* Deal lié (si existe) */}
      {mission.deal && (
        <p className="text-xs text-blue-600 mb-3">
          📋 {mission.deal.title}
        </p>
      )}

      {/* Montant */}
      <p className="text-lg font-semibold text-gray-900 mb-3">
        {formatAmount(mission.estimated_amount, 'EUR')}
      </p>

      {/* Tags */}
      {mission.tags && mission.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mission.tags.map((tag, idx) => (
            <span
              key={idx}
              className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs"
            >
              {tag.tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
