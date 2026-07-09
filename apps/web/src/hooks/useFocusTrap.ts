'use client';
import { useEffect, useRef } from 'react';

/**
 * Traps Tab/Shift+Tab focus within the ref element.
 * Saves and restores the previously focused element.
 * @param active — only activate when true (default: true)
 */
export function useFocusTrap(active = true) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (el) el.focus({ preventScroll: true });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return;
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      prev?.focus();
    };
  }, [active]);

  return ref;
}
