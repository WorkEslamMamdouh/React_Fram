'use client';

import { useEffect, useRef, useState } from "react";

// =====================================================================================
//  useInfiniteSentinel — تحميل الصفحة اللي بعدها لما "العلامة" (sentinel) تقرب من الظهور
//  الاستخدام:
//     const sentinelRef = useInfiniteSentinel({ enabled: hasMore && !busy, onLoadMore, rootRef, watch: items.length });
//     ...  <div ref={sentinelRef} />   // آخر القايمة
//  - watch: أي قيمة بتتغير بعد كل تحميل (مثلاً عدد الصفوف) عشان لو العلامة لسه ظاهرة نحمّل تاني
// =====================================================================================

export function useInfiniteSentinel(opts: {
  enabled: boolean;
  onLoadMore: () => void;
  rootRef?: React.RefObject<Element | null>;
  rootMargin?: string;
  watch?: unknown;
}): (node: Element | null) => void {
  const { enabled, onLoadMore, rootRef, rootMargin = "300px", watch } = opts;
  const [node, setNode] = useState<Element | null>(null);
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled || !node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) cbRef.current();
      },
      { root: rootRef?.current ?? null, rootMargin }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [enabled, node, rootMargin, watch, rootRef]);

  return setNode;
}
