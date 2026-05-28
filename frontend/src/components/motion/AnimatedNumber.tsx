'use client';
import { useEffect, useRef } from 'react';
import { gsap, registerGSAP } from '@/lib/animation/gsap';
import { useMotion } from '@/lib/animation/preferences';

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Counts up to `value` using GSAP. When motion is disabled (toggle off /
 * reduced-motion), renders the final value immediately with no animation.
 */
export default function AnimatedNumber({
  value, duration = 1.1, decimals = 0, prefix = '', suffix = '', className, style,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const { enabled } = useMotion();
  const fmt = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    if (!ref.current) return;
    if (!enabled) {
      ref.current.textContent = fmt(value);
      return;
    }
    registerGSAP();
    const obj = { n: 0 };
    const node = ref.current;
    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => { if (node) node.textContent = fmt(obj.n); },
    });
    return () => { tween.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  return <span ref={ref} className={className} style={style}>{fmt(0)}</span>;
}
