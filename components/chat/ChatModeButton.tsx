'use client';

import { useState, useRef, useEffect } from 'react';
import { useContextStore } from '@/lib/stores/context-store';
import { useCurrentContext } from '@/lib/hooks/useCurrentContext';
import { getModeConfig, type ChatMode } from '@/lib/chat/modes';

interface ChatModeButtonProps {
  compact?: boolean;
}

export function ChatModeButton({ compact = false }: ChatModeButtonProps) {
  // Hydration guard
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { mode } = useCurrentContext();
  const { cycleMode } = useContextStore();

  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const config = getModeConfig(mode);

  // Fermer le tooltip si on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer pour afficher le tooltip au survol
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHovering && !showTooltip) {
      timer = setTimeout(() => setShowTooltip(true), 500);
    }
    return () => clearTimeout(timer);
  }, [isHovering, showTooltip]);

  const handleClick = () => {
    cycleMode();

    // Flash visuel immédiat
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);

    // Affiche le tooltip plus longtemps pour montrer le nouveau mode
    setShowTooltip(true);
    setTimeout(() => {
      if (!isHovering) setShowTooltip(false);
    }, 2500);
  };

  // Skeleton pendant l'hydratation
  if (!isHydrated) {
    if (compact) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted animate-pulse">
          <span className="w-3 h-3 bg-muted-foreground/20 rounded" />
          <span className="w-8 h-3 bg-muted-foreground/20 rounded" />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted animate-pulse">
        <span className="w-4 h-4 bg-muted-foreground/20 rounded" />
        <span className="w-10 h-4 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  return (
    <>
      {/* Tooltip - fixed position to escape overflow:hidden */}
      {showTooltip && buttonRef.current && (
        <div
          ref={tooltipRef}
          className="fixed w-72 p-3 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            left: buttonRef.current.getBoundingClientRect().left + buttonRef.current.offsetWidth / 2 - 144,
            bottom: window.innerHeight - buttonRef.current.getBoundingClientRect().top + 8,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{config.icon}</span>
            <span className="font-semibold">{config.label}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.description}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 pt-2 border-t border-border">
            Cliquez pour changer de mode
          </p>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover" />
        </div>
      )}

      <div className="relative">

      {/* Button - Compact or Regular */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setShowTooltip(false);
        }}
        aria-label={`Mode de chat: ${config.label}. Cliquez pour changer.`}
        className={`
          relative flex items-center gap-1 rounded-full font-medium
          border transition-all duration-200
          ${compact ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1.5 text-sm gap-1.5'}
          ${config.bgColor} ${config.color}
          hover:opacity-90
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
        `}
      >
        {/* Flash overlay */}
        {showFlash && (
          <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
        )}
        <span aria-hidden="true" className={compact ? 'text-sm' : ''}>{config.icon}</span>
        <span>{config.labelShort}</span>
      </button>
      </div>
    </>
  );
}

// Composant alternatif avec tous les modes visibles
export function ChatModeSelector() {
  // Hydration guard
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { mode } = useCurrentContext();
  const { setMode } = useContextStore();
  const [showTooltip, setShowTooltip] = useState<ChatMode | null>(null);

  const modes: ChatMode[] = ['plan', 'auto', 'demander'];

  if (!isHydrated) {
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full animate-pulse">
        <div className="w-16 h-6 bg-gray-200 rounded-full" />
        <div className="w-16 h-6 bg-gray-200 rounded-full" />
        <div className="w-16 h-6 bg-gray-200 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full">
      {modes.map((m) => {
        const config = getModeConfig(m);
        const isActive = mode === m;

        return (
          <div key={m} className="relative">
            {showTooltip === m && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-gray-900 text-white rounded-lg shadow-lg z-50">
                <div className="flex items-center gap-2 mb-1">
                  <span>{config.icon}</span>
                  <span className="font-medium text-sm">{config.label}</span>
                </div>
                <p className="text-xs text-gray-300">{config.description}</p>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900" />
              </div>
            )}
            <button
              onClick={() => setMode(m)}
              onMouseEnter={() => setShowTooltip(m)}
              onMouseLeave={() => setShowTooltip(null)}
              aria-label={`${config.label}: ${config.description}`}
              aria-pressed={isActive}
              className={`
                flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                transition-all duration-200
                ${
                  isActive
                    ? `${config.bgColor} ${config.color} shadow-sm`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span aria-hidden="true">{config.icon}</span>
              <span>{config.labelShort}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
