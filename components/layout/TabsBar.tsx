'use client';

import { useTabsStore } from '@/lib/stores/tabs-store';
import { Tab } from './Tab';

export function TabsBar() {
  const { tabs, chatPanelOpen, toggleChatPanel, historyPanelOpen, toggleHistoryPanel } =
    useTabsStore();

  return (
    <div className="flex items-center justify-between bg-gray-100 border-b border-gray-200">
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
        {tabs.length === 0 ? (
          <div className="px-4 py-2 text-sm text-gray-500 italic">
            Aucun onglet ouvert
          </div>
        ) : (
          tabs.map((tab) => <Tab key={tab.id} tab={tab} />)
        )}
      </div>

      {/* Right side buttons */}
      <div className="flex items-center">
        {/* History toggle button */}
        <button
          onClick={toggleHistoryPanel}
          className={`
            flex items-center justify-center w-10 h-10 border-l border-gray-200
            hover:bg-gray-200 transition-colors
            ${historyPanelOpen ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}
          `}
          title={historyPanelOpen ? "Fermer l'historique" : "Ouvrir l'historique"}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Chat toggle button */}
        <button
          onClick={toggleChatPanel}
          className={`
            flex items-center justify-center w-10 h-10 border-l border-gray-200
            hover:bg-gray-200 transition-colors
            ${chatPanelOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}
          `}
          title={chatPanelOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
