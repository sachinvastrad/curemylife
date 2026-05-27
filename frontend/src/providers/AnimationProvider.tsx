'use client';
import { MotionProvider } from '@/lib/animation/preferences';
import SmoothScrollProvider from './SmoothScrollProvider';
import FloatingMotionToggle from '@/components/motion/FloatingMotionToggle';

export default function AnimationProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <SmoothScrollProvider>
        {children}
        <FloatingMotionToggle />
      </SmoothScrollProvider>
    </MotionProvider>
  );
}
