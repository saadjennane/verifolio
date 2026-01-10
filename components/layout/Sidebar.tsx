'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { TabType } from '@/lib/types/tabs';

interface NavItem {
  type: TabType;
  path: string;
  title: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    type: 'dashboard',
    path: '/',
    title: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    type: 'clients',
    path: '/clients',
    title: 'Clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    type: 'contacts',
    path: '/contacts',
    title: 'Contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    type: 'deals',
    path: '/deals',
    title: 'Deals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    type: 'missions',
    path: '/missions',
    title: 'Missions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'reviews',
    path: '/reviews',
    title: 'Reviews',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    type: 'documents',
    path: '/documents',
    title: 'Documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'todos',
    path: '/todos',
    title: 'Todos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const router = useRouter();
  const { tabs, activeTabId, openTab, sidebarCollapsed, toggleSidebar } = useTabsStore();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleNavClick = (
    e: React.MouseEvent,
    item: NavItem
  ) => {
    e.preventDefault();
    // Ctrl/Cmd + click ou double-click = permanent
    const permanent = e.ctrlKey || e.metaKey;
    openTab({ type: item.type, path: item.path, title: item.title }, permanent);
  };

  const handleNavDoubleClick = (item: NavItem) => {
    openTab({ type: item.type, path: item.path, title: item.title }, true);
  };

  // Déterminer quel item est actif basé sur l'onglet actif
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const getIsActive = (item: NavItem): boolean => {
    if (!activeTab) return false;
    if (item.type === 'dashboard') {
      return activeTab.type === 'dashboard';
    }
    // Pour les listes, vérifier si l'onglet actif est du même type ou un sous-type
    const typeMap: Record<string, string[]> = {
      clients: ['clients', 'client', 'new-client', 'edit-client'],
      contacts: ['contacts', 'contact', 'new-contact', 'edit-contact'],
      deals: ['deals', 'deal', 'new-deal', 'edit-deal'],
      missions: ['missions', 'mission', 'new-mission', 'edit-mission'],
      reviews: ['reviews', 'review', 'review-request', 'new-review-request'],
      documents: [
        'documents', 'quotes', 'quote', 'new-quote', 'edit-quote',
        'invoices', 'invoice', 'new-invoice', 'edit-invoice',
        'proposals', 'proposal', 'new-proposal', 'edit-proposal', 'proposal-templates', 'edit-proposal-template',
        'briefs', 'brief', 'new-brief', 'edit-brief', 'brief-templates', 'edit-brief-template',
        // Suppliers & Expenses
        'suppliers', 'supplier', 'new-supplier', 'edit-supplier',
        'supplier-consultations', 'supplier-consultation', 'new-supplier-consultation',
        'supplier-quotes', 'supplier-quote', 'new-supplier-quote',
        'supplier-invoices', 'supplier-invoice', 'new-supplier-invoice',
        'expenses', 'expense', 'new-expense',
      ],
      todos: ['todos', 'todo', 'new-todo'],
    };
    return typeMap[item.type]?.includes(activeTab.type) || false;
  };

  return (
    <aside
      className={`
        ${sidebarCollapsed ? 'w-14' : 'w-64'}
        bg-white border-r border-gray-200 flex flex-col
        transition-all duration-200 ease-in-out
      `}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-gray-200 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-6'}`}>
        <button
          onClick={(e) => handleNavClick(e, navItems[0])}
          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
          title={sidebarCollapsed ? 'Verifolio' : undefined}
        >
          {sidebarCollapsed ? 'V' : 'Verifolio'}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => {
          const isActive = getIsActive(item);

          return (
            <button
              key={item.path}
              onClick={(e) => handleNavClick(e, item)}
              onDoubleClick={() => handleNavDoubleClick(item)}
              title={sidebarCollapsed ? item.title : undefined}
              className={`
                w-full flex items-center rounded-lg text-sm font-medium
                transition-colors duration-150 text-left
                ${sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'}
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {item.icon}
              {!sidebarCollapsed && item.title}
            </button>
          );
        })}
      </nav>

      {/* Hint - only when expanded */}
      {!sidebarCollapsed && (
        <div className="px-4 py-2 text-xs text-gray-400">
          Double-clic = onglet permanent
        </div>
      )}

      {/* User section */}
      <div className={`border-t border-gray-200 space-y-1 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
        <button
          onClick={(e) => {
            e.preventDefault();
            const permanent = e.ctrlKey || e.metaKey;
            openTab({ type: 'settings', path: '/settings', title: 'Paramètres' }, permanent);
          }}
          onDoubleClick={() => {
            openTab({ type: 'settings', path: '/settings', title: 'Paramètres' }, true);
          }}
          title={sidebarCollapsed ? 'Paramètres' : undefined}
          className={`w-full flex items-center rounded-lg text-sm transition-colors ${
            sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
          } ${
            activeTab?.type === 'settings'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!sidebarCollapsed && 'Paramètres'}
        </button>
        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Déconnexion' : undefined}
          className={`w-full flex items-center rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors ${
            sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!sidebarCollapsed && 'Déconnexion'}
        </button>

        {/* Collapse/Expand button */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Agrandir' : 'Réduire'}
          className={`w-full flex items-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors ${
            sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
          }`}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!sidebarCollapsed && 'Réduire'}
        </button>
      </div>
    </aside>
  );
}
