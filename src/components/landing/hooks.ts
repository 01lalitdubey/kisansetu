import { useEffect, useRef, useState } from 'react';

/** True when the user asked for reduced motion. Updates live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** True on a fine pointer + wide viewport — used to gate desktop-only motion. */
export function useDesktopPointer(): boolean {
  const [ok, setOk] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine) and (min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(pointer: fine) and (min-width: 1024px)');
    const on = () => setOk(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ok;
}

/**
 * IntersectionObserver reveal. Returns a ref to attach and whether it has
 * entered the viewport (latched). Adds the `is-in` class automatically so
 * plain elements can use the `.lp-reveal` CSS without React state.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(opts?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === 'undefined' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      el.classList.add('is-in');
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add('is-in');
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: opts?.threshold ?? 0.16, rootMargin: opts?.rootMargin ?? '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts?.threshold, opts?.rootMargin]);

  return { ref, shown };
}

/**
 * 0 → 1 progress of an element travelling through the viewport.
 * 0 when the element top hits the viewport bottom, 1 when its bottom hits the top.
 * rAF-throttled; cleans up.
 */
export function useSectionProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [p, setP] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const measure = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = r.height + vh;
      const seen = vh - r.top;
      setP(Math.min(1, Math.max(0, seen / total)));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf.current = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return { ref, progress: p };
}

/** Count 0 → `to` over `ms` once `run` flips true. rAF, cleaned up. */
export function useCountUp(to: number, run: boolean, ms = 1200): number {
  const [n, setN] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!run) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * to));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, run, ms]);
  return n;
}

/** Live window scrollY (rAF-throttled). */
export function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const on = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setY(window.scrollY);
        ticking = false;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return y;
}
