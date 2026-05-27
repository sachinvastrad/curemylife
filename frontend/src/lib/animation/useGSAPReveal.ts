'use client';
import { useEffect, useRef } from 'react';
import { gsap, registerGSAP } from './gsap';
import { DURATION, EASE, STAGGER } from './constants';
import { useMotion } from './preferences';

export interface RevealOptions {
  y?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  stagger?: number;
  start?: string;
  once?: boolean;
  selector?: string;
}

export function useGSAPReveal<T extends HTMLElement = HTMLDivElement>(opts: RevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled || !ref.current) return;
    registerGSAP();

    const ctx = gsap.context(() => {
      const targets = opts.selector
        ? gsap.utils.toArray<HTMLElement>(opts.selector)
        : [ref.current as HTMLElement];

      gsap.from(targets, {
        y: opts.y ?? 32,
        opacity: opts.opacity ?? 0,
        duration: opts.duration ?? DURATION.base,
        delay: opts.delay ?? 0,
        ease: opts.ease ?? EASE.out,
        stagger: opts.stagger ?? (opts.selector ? STAGGER.base : 0),
        scrollTrigger: {
          trigger: ref.current,
          start: opts.start ?? 'top 85%',
          once: opts.once ?? true,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [
    enabled, opts.selector, opts.start, opts.once,
    opts.y, opts.opacity, opts.duration, opts.delay, opts.ease, opts.stagger,
  ]);

  return ref;
}
