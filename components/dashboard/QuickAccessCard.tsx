'use client';

import {
  Users,
  Handshake,
  FileText,
  Receipt,
  Briefcase,
  ClipboardList,
  Star,
} from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface QuickLink {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  tabType: 'clients' | 'deals' | 'quotes' | 'invoices' | 'missions' | 'briefs' | 'reviews';
}

const quickLinks: QuickLink[] = [
  {
    id: 'clients',
    label: 'Clients',
    icon: <Users className="w-4 h-4" />,
    path: '/clients',
    tabType: 'clients',
  },
  {
    id: 'deals',
    label: 'Deals',
    icon: <Handshake className="w-4 h-4" />,
    path: '/deals',
    tabType: 'deals',
  },
  {
    id: 'quotes',
    label: 'Devis',
    icon: <FileText className="w-4 h-4" />,
    path: '/quotes',
    tabType: 'quotes',
  },
  {
    id: 'invoices',
    label: 'Factures',
    icon: <Receipt className="w-4 h-4" />,
    path: '/invoices',
    tabType: 'invoices',
  },
  {
    id: 'missions',
    label: 'Missions',
    icon: <Briefcase className="w-4 h-4" />,
    path: '/missions',
    tabType: 'missions',
  },
  {
    id: 'briefs',
    label: 'Briefs',
    icon: <ClipboardList className="w-4 h-4" />,
    path: '/briefs',
    tabType: 'briefs',
  },
  {
    id: 'reviews',
    label: 'Avis',
    icon: <Star className="w-4 h-4" />,
    path: '/reviews',
    tabType: 'reviews',
  },
];

export function QuickAccessCard() {
  const { openTab } = useTabsStore();

  const handleClick = (link: QuickLink) => {
    openTab(
      {
        type: link.tabType,
        path: link.path,
        title: link.label,
      },
      true
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Acces rapide</h3>
      <div className="grid grid-cols-2 gap-2">
        {quickLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => handleClick(link)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <span className="text-gray-400">{link.icon}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
