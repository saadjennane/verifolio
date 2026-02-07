'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { useTheme } from 'next-themes';
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
    type: 'companies',
    path: '/companies',
    title: 'Entreprises',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

export function MobileSidebarDrawer() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const {
    tabs,
    activeTabId,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    openTab,
  } = useTabsStore();

  // Fermer le drawer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  const handleNavClick = (item: NavItem) => {
    openTab({ type: item.type, path: item.path, title: item.title }, true);
    setMobileSidebarOpen(false);
  };

  const handleSettingsClick = () => {
    openTab({ type: 'settings', path: '/settings', title: 'Paramètres' }, true);
    setMobileSidebarOpen(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileSidebarOpen(false);
    router.push('/login');
    router.refresh();
  };

  // Déterminer quel item est actif
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const getIsActive = (item: NavItem): boolean => {
    if (!activeTab) return false;
    if (item.type === 'dashboard') {
      return activeTab.type === 'dashboard';
    }
    const typeMap: Record<string, string[]> = {
      companies: ['companies', 'clients', 'client', 'suppliers', 'supplier'],
      contacts: ['contacts', 'contact'],
      deals: ['deals', 'deal'],
      missions: ['missions', 'mission'],
      reviews: ['reviews', 'review', 'review-request'],
      documents: ['documents', 'quotes', 'quote', 'invoices', 'invoice', 'proposals', 'proposal', 'briefs', 'brief'],
      todos: ['todos', 'todo'],
    };
    return typeMap[item.type]?.includes(activeTab.type) || false;
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-5 h-5" />;
    if (theme === 'dark') return <Moon className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'Clair';
    if (theme === 'dark') return 'Sombre';
    return 'Auto';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border transform transition-transform duration-300 ease-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <span className="text-xl font-bold text-foreground">Verifolio</span>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = getIsActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  {item.title}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-1">
          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab?.type === 'settings'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Paramètres
          </button>

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {getThemeIcon()}
            Thème: {getThemeLabel()}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
