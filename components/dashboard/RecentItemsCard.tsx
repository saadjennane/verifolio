'use client';

import { useTabsStore } from '@/lib/stores/tabs-store';
import {
  Clock,
  FileText,
  Users,
  Handshake,
  Briefcase,
  Receipt,
  Star,
  ClipboardList,
  User,
  Truck,
} from 'lucide-react';

const DETAIL_TAB_TYPES = [
  'client',
  'deal',
  'mission',
  'quote',
  'invoice',
  'proposal',
  'brief',
  'review',
  'contact',
  'delivery-note',
];

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  client: { icon: <Users className="w-4 h-4" />, label: 'Client' },
  deal: { icon: <Handshake className="w-4 h-4" />, label: 'Deal' },
  mission: { icon: <Briefcase className="w-4 h-4" />, label: 'Mission' },
  quote: { icon: <FileText className="w-4 h-4" />, label: 'Devis' },
  invoice: { icon: <Receipt className="w-4 h-4" />, label: 'Facture' },
  proposal: { icon: <FileText className="w-4 h-4" />, label: 'Proposition' },
  brief: { icon: <ClipboardList className="w-4 h-4" />, label: 'Brief' },
  review: { icon: <Star className="w-4 h-4" />, label: 'Avis' },
  contact: { icon: <User className="w-4 h-4" />, label: 'Contact' },
  'delivery-note': { icon: <Truck className="w-4 h-4" />, label: 'Bon de livraison' },
};

export function RecentItemsCard() {
  const { tabs, setActiveTab } = useTabsStore();

  const recentItems = tabs
    .filter((tab) => DETAIL_TAB_TYPES.includes(tab.type) && tab.entityId)
    .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
    .slice(0, 6);

  if (recentItems.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Récent
        </h3>
        <p className="text-sm text-gray-500">Aucun élément consulté récemment</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Récent
      </h3>
      <div className="space-y-1">
        {recentItems.map((item) => {
          const config = TYPE_CONFIG[item.type] || {
            icon: <FileText className="w-4 h-4" />,
            label: item.type,
          };
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-gray-400">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-500">{config.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
