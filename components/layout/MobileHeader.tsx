'use client';

import { Menu, MessageCircle } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';

export function MobileHeader() {
  const { tabs, activeTabId, toggleMobileSidebar, toggleMobileChat } = useTabsStore();

  // Trouver l'onglet actif pour afficher son titre
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const pageTitle = activeTab?.title || 'Verifolio';

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-background border-b border-border shrink-0">
      {/* Hamburger menu */}
      <button
        onClick={toggleMobileSidebar}
        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Title */}
      <div className="flex-1 text-center">
        <h1 className="text-base font-semibold text-foreground truncate px-2">
          {pageTitle}
        </h1>
      </div>

      {/* Chat button */}
      <button
        onClick={toggleMobileChat}
        className="flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Ouvrir l'assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </header>
  );
}
