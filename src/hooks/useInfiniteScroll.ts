import { useEffect, useRef } from 'react';

export const useInfiniteScroll = (onReach: () => void, enabled: boolean) => {
  const target = useRef<HTMLDivElement>(null);
  const callback = useRef(onReach);

  useEffect(() => {
    callback.current = onReach;
  });

  useEffect(() => {
    const element = target.current;
    if (!element || !enabled) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && callback.current(), { rootMargin: '400px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return target;
};
