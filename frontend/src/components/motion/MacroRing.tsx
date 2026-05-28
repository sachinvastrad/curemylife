'use client';
import { useEffect, useRef } from 'react';
import { gsap, registerGSAP } from '@/lib/animation/gsap';
import { useMotion } from '@/lib/animation/preferences';
import AnimatedNumber from './AnimatedNumber';

interface Props {
  /** Current value (in the same units as `target`). */
  value: number;
  /** Maximum/target value; ring fills proportionally. */
  target?: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;     // px
  stroke?: number;   // px
}

/**
 * Circular progress ring. SVG with a stroke-dashoffset animation driven by
 * GSAP. Ring fills to `value/target` on mount; counter inside also animates.
 */
export default function MacroRing({
  value, target, label, unit = 'g', color = 'var(--primary-light)', size = 110, stroke = 8,
}: Props) {
  const ringRef = useRef<SVGCircleElement | null>(null);
  const { enabled } = useMotion();

  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = target ? Math.min(1, Math.max(0, value / target)) : 0;
  const finalOffset = C * (1 - pct);

  useEffect(() => {
    if (!ringRef.current) return;
    if (!enabled) {
      ringRef.current.style.strokeDashoffset = String(finalOffset);
      return;
    }
    registerGSAP();
    const node = ringRef.current;
    node.style.strokeDashoffset = String(C);
    const tween = gsap.to(node, {
      strokeDashoffset: finalOffset,
      duration: 1.2,
      ease: 'expo.out',
    });
    return () => { tween.kill(); };
  }, [finalOffset, C, enabled]);

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--bg-surface)"
            strokeWidth={stroke}
          />
          <circle
            ref={ringRef}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <AnimatedNumber
            value={value}
            decimals={0}
            className="font-bold text-lg"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        </div>
      </div>
      <span className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}
