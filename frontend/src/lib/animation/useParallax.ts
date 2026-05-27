'use client';
import { useEffect, useRef } from 'react';
import { gsap, registerGSAP } from './gsap';
import { useMotion } from './preferences';

export interface ParallaxOptions {
  distance?: number;
  scrub?: number | boolean;
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(opts: ParallaxOptions = {}) {
  const ref = useRef<T | null>(null);
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled || !ref.current) return;
    registerGSAP();
    const el = ref.current;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 0, force3D: true, willChange: 'transform' },
        {
          y: opts.distance ?? -80,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: opts.scrub ?? 0.6,
          },
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [enabled, opts.distance, opts.scrub]);

  return ref;
}
