export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  expoOut: 'expo.out',
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const DURATION = {
  fast: 0.4,
  base: 0.8,
  slow: 1.2,
} as const;

export const STAGGER = {
  tight: 0.04,
  base: 0.07,
  loose: 0.12,
} as const;

export const LENIS_OPTIONS = {
  duration: 1.1,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.2,
} as const;
