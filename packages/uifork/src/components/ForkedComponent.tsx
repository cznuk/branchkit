"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { registerComponent, unregisterComponent } from "../utils/componentRegistry";
import type { ForkedComponentProps } from "../types";

/**
 * A component2 that renders a specific version based on localStorage state.
 * Used to wrap components that have multiple versions managed by uifork.
 *
 * The UIFork component controls which version is active by writing to localStorage.
 * ForkedComponent reads from localStorage and renders the appropriate version.
 */
export function ForkedComponent<T extends Record<string, unknown>>({
  id,
  versions,
  props,
  defaultVersion,
}: ForkedComponentProps<T>) {
  const [isMounted, setIsMounted] = useState(false);
  const versionKeys = Object.keys(versions);
  const initialVersion = defaultVersion || versionKeys[0];

  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    id,
    initialVersion,
    true, // sync across tabs
  );

  // Register/unregister this component when it mounts/unmounts
  // Pass version keys so they're available for offline mode
  useEffect(() => {
    registerComponent(id, versionKeys);
    return () => {
      unregisterComponent(id);
    };
  }, [id, versionKeys.join(",")]);

  const [lastValidVersion, setLastValidVersion] = useState<string>(
    versionKeys.includes(activeVersion) ? activeVersion : initialVersion,
  );

  // Update last valid version when active version is found in versions
  useEffect(() => {
    if (versions[activeVersion]) {
      setLastValidVersion(activeVersion);
    }
  }, [activeVersion, versions]);

  // If active version no longer exists in versions, fall back to first version
  useEffect(() => {
    if (versionKeys.length > 0 && !versionKeys.includes(activeVersion)) {
      // Debounce the fallback to prevent race conditions during HMR/updates
      // where the version in localStorage might be newer than the props received.
      // 2500ms allows for slow HMR updates without reverting state
      const timer = setTimeout(() => {
        // Double check after delay
        if (!versionKeys.includes(activeVersion)) {
          setActiveVersion(versionKeys[0]);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeVersion, versionKeys, setActiveVersion]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get the version component - prefer active, then last valid, then default
  const VersionComponent =
    versions[activeVersion]?.render ??
    versions[lastValidVersion]?.render ??
    versions[versionKeys[0]]?.render;

  if (!VersionComponent || !isMounted) {
    return null;
  }

  // @ts-ignore
  return <VersionComponent {...props} />;
}
