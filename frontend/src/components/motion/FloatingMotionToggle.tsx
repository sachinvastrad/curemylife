'use client';
import { useMotion } from '@/lib/animation/preferences';
import { Sparkles, MousePointer2 } from 'lucide-react';

export default function FloatingMotionToggle() {
  const { mode, toggle } = useMotion();
  const powered = mode === 'powered';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={powered}
      title={powered ? 'Switch to existing UI' : 'Switch to powered UI'}
      className="glass"
      style={{
        position: 'fixed',
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        zIndex: 60,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '0.5rem 0.75rem',
        borderRadius: 999,
        fontSize: 12,
        color: 'var(--text-primary)',
        cursor: 'pointer',
      }}
    >
      {powered ? <Sparkles className="w-3.5 h-3.5" /> : <MousePointer2 className="w-3.5 h-3.5" />}
      <span>{powered ? 'Powered UI' : 'Existing UI'}</span>
    </button>
  );
}
