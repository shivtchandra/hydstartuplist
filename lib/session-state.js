import { useCallback, useRef, useSyncExternalStore } from 'react';

// Browser-session drafts survive route changes and reloads. In-flight work uses
// memory only: a reload must not restore a spinner for a request that no longer exists.
export function createSessionState({ storage = () => typeof window === 'undefined' ? null : window.sessionStorage, prefix = 'mapping_hyd_session_v1:' } = {}) {
  const values = new Map();
  const listeners = new Map();
  function get(key, fallback, persist = true) {
    if (values.has(key)) return values.get(key);
    let value = fallback;
    if (persist) {
      try {
        const raw = storage()?.getItem(prefix + key);
        if (raw != null) {
          const saved = JSON.parse(raw);
          if (fallback === null || (Array.isArray(fallback) ? Array.isArray(saved) : saved !== null && typeof saved === typeof fallback)) {
            value = fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? { ...fallback, ...saved } : saved;
          }
        }
      } catch {}
    }
    values.set(key, value);
    return value;
  }
  function set(key, next, fallback, persist = true) {
    const previous = get(key, fallback, persist);
    const value = typeof next === 'function' ? next(previous) : next;
    if (Object.is(previous, value)) return value;
    values.set(key, value);
    if (persist) {
      try { storage()?.setItem(prefix + key, JSON.stringify(value)); } catch {}
    }
    for (const listener of listeners.get(key) || []) listener();
    return value;
  }
  function subscribe(key, listener) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
      if (!listeners.get(key)?.size) listeners.delete(key);
    };
  }
  return { get, set, subscribe };
}

export const sessionState = createSessionState();

export function useSessionState(key, initial, { persist = true } = {}) {
  const seed = useRef(null);
  if (!seed.current || seed.current.key !== key) {
    seed.current = { key, value: typeof initial === 'function' ? initial() : initial };
  }
  const fallback = seed.current.value;
  const subscribe = useCallback(listener => sessionState.subscribe(key, listener), [key]);
  const snapshot = useCallback(() => sessionState.get(key, fallback, persist), [key, fallback, persist]);
  const serverSnapshot = useCallback(() => fallback, [fallback]);
  const set = useCallback(next => sessionState.set(key, next, fallback, persist), [key, fallback, persist]);
  return [useSyncExternalStore(subscribe, snapshot, serverSnapshot), set];
}
