'use client';
import AnimatedText from './AnimatedText';

interface Props {
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export default function RevealText({ as = 'h2', className, children, delay }: Props) {
  return (
    <AnimatedText as={as} by="lines" revealStyle="mask" delay={delay} className={className}>
      {children}
    </AnimatedText>
  );
}
