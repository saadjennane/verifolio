'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // md breakpoint Tailwind

/**
 * Hook pour détecter si l'écran est en mode mobile
 * Retourne true si la largeur est inférieure à 768px
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check initial
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}
