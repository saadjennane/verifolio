'use client';

import React from 'react';
import { useTabsStore } from '@/lib/stores/tabs-store';
import type { Tab as TabType } from '@/lib/types/tabs';

interface TabProps {
  tab: TabType;
}

export function Tab({ tab }: TabProps) {
  const { activeTabId, setActiveTab, closeTab, makeTabPermanent, tabs, reorderTabs } = useTabsStore();
  const [isDragging, setIsDragging] = React.useState(false);
  const isActive = tab.id === activeTabId;

  const handleClick = () => {
    setActiveTab(tab.id);
  };

  const handleDoubleClick = () => {
    if (tab.isPreview) {
      makeTabPermanent(tab.id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tab.id);
  };

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1 && !tab.pinned) {
      e.preventDefault();
      closeTab(tab.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedTabId = e.dataTransfer.getData('text/plain');
    const draggedIndex = tabs.findIndex((t) => t.id === draggedTabId);
    const dropIndex = tabs.findIndex((t) => t.id === tab.id);

    if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== dropIndex) {
      reorderTabs(draggedIndex, dropIndex);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMiddleClick}
      className={`
        group flex items-center gap-2 px-3 py-2 text-sm
        border-r border-border min-w-0 max-w-[180px]
        ${isDragging ? 'cursor-grabbing opacity-50' : 'cursor-grab'}
        ${isActive
          ? 'bg-background border-b-2 border-b-primary -mb-[1px]'
          : 'bg-muted/50 hover:bg-accent'
        }
      `}
    >
      {/* Icon */}
      <TabIcon type={tab.type} />

      {/* Title */}
      <span
        className={`
          truncate flex-1
          ${tab.isPreview ? 'italic text-muted-foreground' : 'text-foreground'}
          ${tab.isDirty ? 'font-medium' : ''}
        `}
      >
        {tab.title}
      </span>

      {/* Dirty indicator or close button (sauf si pinned) */}
      {!tab.pinned && (
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {tab.isDirty ? (
            <span className="w-2 h-2 rounded-full bg-primary" />
          ) : (
            <button
              onClick={handleClose}
              className="hidden group-hover:flex items-center justify-center w-4 h-4 rounded hover:bg-accent"
            >
              <svg
                className="w-3 h-3 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TabIcon({ type }: { type: TabType['type'] }) {
  const iconClass = 'w-4 h-4 text-muted-foreground flex-shrink-0';

  switch (type) {
    case 'dashboard':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'clients':
    case 'client':
    case 'new-client':
    case 'edit-client':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'quotes':
    case 'quote':
    case 'new-quote':
    case 'edit-quote':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'invoices':
    case 'invoice':
    case 'new-invoice':
    case 'edit-invoice':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
  }
}
