'use client';
import { useEffect, useRef } from 'react';
import { gsap, SplitText, registerGSAP } from './gsap';
import { DURATION, EASE, STAGGER } from './constants';
import { useMotion } from './preferences';

export type SplitMode = 'lines' | 'words' | 'chars';
export type RevealStyle = 'up' | 'blur' | 'mask';

export interface SplitTextOptions {
  by?: SplitMode;
  revealStyle?: RevealStyle;
  duration?: number;
  stagger?: number;
  delay?: number;
  ease?: string;
  start?: string;
  trigger?: boolean;
}

export function useSplitTextAnimation<T extends HTMLElement = HTMLHeadingElement>(opts: SplitTextOptions = {}) {
  const ref = useRef<T | null>(null);
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled || !ref.current) return;
    registerGSAP();

    const by = opts.by ?? 'lines';
    const style = opts.revealStyle ?? 'up';
    const el = ref.current;

    const ctx = gsap.context(() => {
      let split: InstanceType<typeof SplitText> | null = null;
      let rafId = 0;

      const build = () => {
        split?.revert();
        split = new SplitText(el, {
          type: by,
          linesClass: 'st-line',
          wordsClass: 'st-word',
          charsClass: 'st-char',
          mask: style === 'mask' ? 'lines' : undefined,
        });

        const targets =
          by === 'lines' ? split.lines :
          by === 'words' ? split.words :
                           split.chars;

        const from: gsap.TweenVars =
          style === 'blur'
            ? { yPercent: 60, opacity: 0, filter: 'blur(12px)' }
            : { yPercent: 110, opacity: style === 'mask' ? 1 : 0 };

        gsap.from(targets, {
          ...from,
          duration: opts.duration ?? DURATION.base,
          delay: opts.delay ?? 0,
          ease: opts.ease ?? EASE.expoOut,
          stagger: opts.stagger ?? (by === 'chars' ? STAGGER.tight : STAGGER.base),
          scrollTrigger: opts.trigger === false ? undefined : {
            trigger: el,
            start: opts.start ?? 'top 85%',
            once: true,
          },
        });
      };

      build();

      const ro = new ResizeObserver(() => {
        if (by !== 'lines') return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(build);
      });
      ro.observe(el);

      return () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        split?.revert();
      };
    }, ref);

    return () => ctx.revert();
  }, [enabled, opts.by, opts.revealStyle, opts.duration, opts.stagger, opts.delay, opts.ease, opts.start, opts.trigger]);

  return ref;
}
