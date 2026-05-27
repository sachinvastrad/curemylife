'use client';
import { useSplitTextAnimation, SplitTextOptions } from '@/lib/animation/useSplitTextAnimation';

interface Props extends SplitTextOptions {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function AnimatedText({
  as: Tag = 'h2', className, style, children, ...rest
}: Props) {
  const ref = useSplitTextAnimation<HTMLElement>(rest);
  // @ts-expect-error — dynamic tag with ref
  return <Tag ref={ref} className={className} style={style}>{children}</Tag>;
}
