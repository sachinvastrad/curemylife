'use client';
import { useGSAPReveal, RevealOptions } from '@/lib/animation/useGSAPReveal';

interface Props extends RevealOptions {
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
}

export default function FadeSection({ as: Tag = 'section', className, children, ...rest }: Props) {
  const ref = useGSAPReveal<HTMLElement>(rest);
  // @ts-expect-error — dynamic tag with ref
  return <Tag ref={ref} className={className}>{children}</Tag>;
}
