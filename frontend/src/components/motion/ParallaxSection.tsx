'use client';
import { useParallax, ParallaxOptions } from '@/lib/animation/useParallax';

interface Props extends ParallaxOptions {
  className?: string;
  children: React.ReactNode;
}

export default function ParallaxSection({ className, children, ...rest }: Props) {
  const ref = useParallax<HTMLDivElement>(rest);
  return <div ref={ref} className={className}>{children}</div>;
}
