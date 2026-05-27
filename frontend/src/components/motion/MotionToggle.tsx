'use client';
import { useMotion } from '@/lib/animation/preferences';

export default function MotionToggle({ className = '' }: { className?: string }) {
  const { mode, toggle } = useMotion();
  const powered = mode === 'powered';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={powered}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '0.5rem 0.75rem',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        fontSize: 12,
        width: '100%',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <span>Motion</span>
      <span style={{ color: powered ? 'var(--primary-light)' : 'var(--text-muted)' }}>
        {powered ? 'Powered' : 'Classic'}
      </span>
    </button>
  );
}
