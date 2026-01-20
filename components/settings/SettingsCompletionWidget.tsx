'use client';

import { useState, useEffect } from 'react';
import { useSettingsCompletion, type SettingsSection } from '@/lib/hooks/useSettingsCompletion';
import { useSettingsCompletionStore } from '@/lib/stores/settings-completion-store';
import { useTabsStore } from '@/lib/stores/tabs-store';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface Props {
  collapsed: boolean;
}

// Section navigation config
const SECTION_PATHS: Record<string, { path: string; title: string }> = {
  profile: { path: '/settings?section=profile', title: 'Profil' },
  company: { path: '/settings?section=entreprise&tab=infos', title: 'Entreprise' },
  templates: { path: '/settings?section=templates&tab=documents', title: 'Templates' },
  emails: { path: '/settings?section=email', title: 'Emails' },
};

export function SettingsCompletionWidget({ collapsed }: Props) {
  const { data, loading } = useSettingsCompletion();
  const { dismissed, celebrationShown, dismiss, markCelebrationShown } = useSettingsCompletionStore();
  const { openTab } = useTabsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Celebration toast when reaching 100%
  useEffect(() => {
    if (mounted && data?.allComplete && !celebrationShown) {
      toast.success('Félicitations !', {
        description: 'Votre compte est configuré à 100%. Vous êtes prêt !',
        duration: 5000,
      });
      markCelebrationShown();
    }
  }, [mounted, data?.allComplete, celebrationShown, markCelebrationShown]);

  // Don't render until mounted (hydration)
  if (!mounted) {
    return null;
  }

  // Don't render if complete (100%) - unless user hasn't dismissed yet (to show celebration)
  // After dismiss, it stays hidden permanently
  if (data?.allComplete && dismissed) {
    return null;
  }

  // Loading skeleton
  if (loading) {
    return collapsed ? (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse mx-auto" />
    ) : (
      <div className="px-3 py-2">
        <div className="h-2 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { percentage, sections } = data;
  const sectionEntries = Object.entries(sections) as [string, SettingsSection][];

  // Navigate to settings section
  const handleSectionClick = (key: string) => {
    const config = SECTION_PATHS[key];
    if (config) {
      openTab({ type: 'settings', path: config.path, title: config.title }, true);
      setIsOpen(false);
    }
  };

  // Dismiss widget
  const handleDismiss = () => {
    dismiss();
    setIsOpen(false);
  };

  // ----- Collapsed Mode: Circular Progress -----
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="relative w-8 h-8 mx-auto block focus:outline-none">
                  <CircularProgress percentage={percentage} size={32} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Configuration : {percentage}%</p>
            </TooltipContent>
            <DropdownMenuContent side="right" align="center" className="w-56">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Configuration du compte
              </div>
              <DropdownMenuSeparator />
              <CompletionChecklist
                sections={sectionEntries}
                onSectionClick={handleSectionClick}
              />
              {data.allComplete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDismiss}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Masquer ce widget
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // ----- Expanded Mode: Progress Bar -----
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="w-full px-3 py-2 text-left hover:bg-accent rounded-lg transition-colors focus:outline-none">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Configuration</span>
            <span className="text-xs font-medium text-primary">{percentage}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Configuration du compte
        </div>
        <DropdownMenuSeparator />
        <CompletionChecklist
          sections={sectionEntries}
          onSectionClick={handleSectionClick}
        />
        {data.allComplete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDismiss}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Masquer ce widget
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----- Sub-components -----

function CircularProgress({ percentage, size }: { percentage: number; size: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-all duration-500 ease-out"
      />
    </svg>
  );
}

function CompletionChecklist({
  sections,
  onSectionClick,
}: {
  sections: [string, SettingsSection][];
  onSectionClick: (key: string) => void;
}) {
  return (
    <>
      {sections.map(([key, section]) => (
        <DropdownMenuItem
          key={key}
          onClick={() => onSectionClick(key)}
          className="flex items-center gap-2 cursor-pointer"
        >
          {section.complete ? (
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
            </svg>
          )}
          <span className={section.complete ? 'text-muted-foreground' : ''}>
            {section.label}
          </span>
          {!section.complete && (
            <svg className="w-3 h-3 ml-auto text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}
