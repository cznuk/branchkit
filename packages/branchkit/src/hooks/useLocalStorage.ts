import { useCallback, useEffect, useState } from "react";

/**
 * A hook for persisting state in localStorage with optional cross-tab synchronization.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  syncAcrossTabs = false,
): [T, (value: T | ((val: T) => T)) => void] {
  const dispatchStorageSyncEvent = useCallback(
    (nextValue: string | null) => {
      if (!syncAcrossTabs || typeof window === "undefined") return;
      // Dispatch asynchronously to avoid triggering React state updates mid-render.
      setTimeout(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: nextValue,
          }),
        );
      }, 0);
    },
    [key, syncAcrossTabs],
  );

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      // Error reading localStorage key
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore = value instanceof Function ? value(currentValue) : value;
          if (typeof window !== "undefined") {
            // Remove the key if value is empty string (for string types)
            if (valueToStore === "" && typeof initialValue === "string") {
              window.localStorage.removeItem(key);
              dispatchStorageSyncEvent(null);
            } else {
              const serialized = JSON.stringify(valueToStore);
              window.localStorage.setItem(key, serialized);
              dispatchStorageSyncEvent(serialized);
            }
          }
          return valueToStore;
        });
      } catch {
        // Error setting localStorage key
      }
    },
    [key, dispatchStorageSyncEvent, initialValue],
  );

  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          if (e.newValue === null) {
            setStoredValue(initialValue);
            return;
          }
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // Error parsing localStorage value
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, syncAcrossTabs, initialValue]);

  return [storedValue, setValue];
}
