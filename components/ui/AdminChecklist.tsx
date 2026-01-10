'use client';

import { Badge } from '@/components/ui/Badge';

export interface ChecklistItem {
  label: string;
  checked: boolean;
  linkText?: string;
  onLinkClick?: () => void;
}

interface AdminChecklistProps {
  items: ChecklistItem[];
}

export function AdminChecklist({ items }: AdminChecklistProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
        >
          <div className="flex items-center gap-3">
            <Badge variant={item.checked ? 'green' : 'gray'}>
              {item.checked ? 'Oui' : 'Non'}
            </Badge>
            <span className="text-sm text-gray-700">{item.label}</span>
          </div>
          {item.checked && item.linkText && item.onLinkClick && (
            <button
              onClick={item.onLinkClick}
              className="text-sm text-blue-600 hover:underline"
            >
              {item.linkText}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
