'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Mode = 'powered' | 'classic';
const STORAGE_KEY = 'ho:motion';

interface Ctx {
  mode: Mode;
  enabled: boolean;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const MotionContext = createContext<Ctx | null>(null);

function readInitialMode(): Mode {
  if (typeof window === 'undefined') return 'powered';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Mode | null;
  if (stored === 'powered' || stored === 'classic') return stored;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced ? 'classic' : 'powered';
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('powered');

  useEffect(() => { setModeState(readInitialMode()); }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try { window.localStorage.setItem(STORAGE_KEY, m); } catch {}
    document.documentElement.dataset.motion = m;
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'powered' ? 'classic' : 'powered');
  }, [mode, setMode]);

  useEffect(() => { document.documentElement.dataset.motion = mode; }, [mode]);

  return (
    <MotionContext.Provider value={{ mode, enabled: mode === 'powered', toggle, setMode }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotion(): Ctx {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error('useMotion must be used within <MotionProvider>');
  return ctx;
}
