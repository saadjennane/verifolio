'use client';

import { useRef, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';

// ============================================================================
// Types
// ============================================================================

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  className?: string;
  overscan?: number;
  threshold?: number; // Minimum items to enable virtualization (default: 20)
}

// ============================================================================
// Component
// ============================================================================

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className = '',
  overscan = 5,
  threshold = 20,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  // Measure container height
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Don't virtualize small lists
  if (items.length < threshold) {
    return (
      <div className={className}>
        {items.map((item, index) => renderItem(item, index, {}))}
      </div>
    );
  }

  const Row = ({ index, style }: ListChildComponentProps) => {
    return renderItem(items[index], index, style);
  };

  return (
    <div ref={containerRef} className={`h-full ${className}`}>
      <FixedSizeList
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={overscan}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}

// ============================================================================
// Auto-sizing variant for variable height items
// ============================================================================

interface AutoHeightVirtualizedListProps<T> {
  items: T[];
  estimatedItemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  threshold?: number;
}

export function AutoHeightVirtualizedList<T>({
  items,
  estimatedItemHeight,
  renderItem,
  className = '',
  threshold = 20,
}: AutoHeightVirtualizedListProps<T>) {
  // For variable height items, we use a simpler approach:
  // - Below threshold: render all items normally
  // - Above threshold: use fixed size with estimated height

  if (items.length < threshold) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <VirtualizedList
      items={items}
      itemHeight={estimatedItemHeight}
      renderItem={(item, index, style) => (
        <div style={style}>{renderItem(item, index)}</div>
      )}
      className={className}
      threshold={threshold}
    />
  );
}
