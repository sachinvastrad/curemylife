'use client';
import { useEffect, useRef } from 'react';
import type { DependencyList } from 'react';
import { gsap, ScrollTrigger, registerGSAP } from './gsap';
import { useMotion } from './preferences';

type Builder = (ctx: {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  root: HTMLElement;
}) => void;

export function useScrollTriggerTimeline<T extends HTMLElement = HTMLDivElement>(
  build: Builder,
  deps: DependencyList = []
) {
  const ref = useRef<T | null>(null);
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled || !ref.current) return;
    registerGSAP();
    const root = ref.current;

    const ctx = gsap.context(() => build({ gsap, ScrollTrigger, root }), ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return ref;
}
