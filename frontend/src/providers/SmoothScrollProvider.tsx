'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, registerGSAP } from '@/lib/animation/gsap';
import { LENIS_OPTIONS } from '@/lib/animation/constants';
import { useMotion } from '@/lib/animation/preferences';

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    registerGSAP();

    const lenis = new Lenis(LENIS_OPTIONS);

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    lenis.on('scroll', ScrollTrigger.update);

    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);

    return () => {
      window.removeEventListener('load', refresh);
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, [enabled]);

  return <>{children}</>;
}
