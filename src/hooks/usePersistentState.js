import { useEffect, useState } from 'react';

export function usePersistentState(key, initialValue, legacyKeys = []) {
  const [value, setValue] = useState(() => {
    for (const storageKey of [key, ...legacyKeys]) {
      try {
        const storedValue = window.localStorage.getItem(storageKey);
        if (storedValue !== null) return JSON.parse(storedValue);
      } catch {
        // Try the next legacy key before falling back to the default.
      }
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not persist ${key}:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
