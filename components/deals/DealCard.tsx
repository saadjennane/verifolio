'use client';

import { Badge } from '@/components/ui/Badge';
import { getTagColorClass } from '@/lib/constants/badges-tags';
import { getCurrencySymbol } from '@/lib/utils/currency';
import type { DealListItem } from '@/lib/deals';

interface DealCardProps {
  deal: DealListItem;
  onClick: () => void;
  isDragging?: boolean;
}

export function DealCard({ deal, onClick, isDragging = false }: DealCardProps) {
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
      {/* Badges en premier (priorité visuelle) */}
      {deal.badges && deal.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {deal.badges.map((badge, idx) => (
            <Badge key={idx} variant={badge.variant as any || 'gray'} className="text-xs font-semibold">
              {badge.badge}
            </Badge>
          ))}
        </div>
      )}

      {/* Nom du deal (gras, visible) */}
      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
        {deal.title}
      </h3>

      {/* Client */}
      <p className="text-sm text-gray-600 mb-3">
        {deal.client?.nom || 'Sans client'}
      </p>

      {/* Montant */}
      <p className="text-lg font-semibold text-gray-900 mb-3">
        {formatAmount(deal.estimated_amount, deal.currency || 'EUR')}
      </p>

      {/* Tags (secondaires, en bas) */}
      {deal.tags && deal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {deal.tags.map((tag, idx) => (
            <span
              key={idx}
              className={`${getTagColorClass(tag.color || 'gray')} px-2 py-0.5 rounded-full text-xs`}
            >
              {tag.tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
