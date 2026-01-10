'use client';

import { useTabsStore } from '@/lib/stores/tabs-store';
import { pathToTabConfig } from '@/lib/types/tabs';

interface TabLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function TabLink({ href, children, className, title }: TabLinkProps) {
  const { openTab } = useTabsStore();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const config = pathToTabConfig(href);
    if (config) {
      const permanent = e.ctrlKey || e.metaKey;
      openTab(config, permanent);
    }
  };

  const handleDoubleClick = () => {
    const config = pathToTabConfig(href);
    if (config) {
      openTab(config, true);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={className}
      title={title}
    >
      {children}
    </a>
  );
}
