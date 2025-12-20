
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, style: React.CSSProperties) => React.ReactNode;
  itemHeight: number;
  className?: string;
  containerHeight?: number; // Optional: Force height if not using flex-grow
  overscan?: number;
}

function VirtualList<T>({ 
  items, 
  renderItem, 
  itemHeight, 
  className = '', 
  overscan = 5 
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    // Initial measure
    handleResize();

    window.addEventListener('resize', handleResize);
    // Also use ResizeObserver if available for more robustness
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const visible: React.ReactNode[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const item = items[i];
      const style: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: itemHeight,
        transform: `translateY(${i * itemHeight}px)`,
      };
      visible.push(<React.Fragment key={i}>{renderItem(item, style)}</React.Fragment>);
    }
    return visible;
  }, [items, startIndex, endIndex, itemHeight, renderItem]);

  return (
    <div 
      ref={containerRef}
      className={`overflow-y-auto relative ${className}`}
      onScroll={handleScroll}
      style={{ willChange: 'transform' }} // Perf hint
    >
      <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
        {visibleItems}
      </div>
    </div>
  );
}

export default VirtualList;
