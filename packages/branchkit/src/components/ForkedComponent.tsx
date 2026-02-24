"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { registerComponent, unregisterComponent } from "../utils/componentRegistry";
import { BRANCHKIT_TARGET_ATTRS, createTargetMetadata } from "../utils/targetAttributes";
import { COMPONENT_VERSION_STORAGE_PREFIX } from "./constants";
import type { ForkedComponentProps } from "../types";

/**
 * A component that renders a specific version based on localStorage state.
 * Used to wrap components that have multiple versions managed by branchkit.
 *
 * The BranchKit component controls which version is active by writing to localStorage.
 * ForkedComponent reads from localStorage and renders the appropriate version.
 *
 * For now, each version file must default-export its component. Named exports are
 * being considered for the future.
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

  // Create version info array with keys and labels for the registry
  const versionInfos = useMemo(
    () =>
      Object.entries(versions).map(([key, version]) => ({
        key,
        label: version.label,
      })),
    [versions],
  );

  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    `${COMPONENT_VERSION_STORAGE_PREFIX}${id}`,
    initialVersion,
    true, // sync across tabs
  );
  const targetMetadata = useMemo(
    () => createTargetMetadata(id, activeVersion || initialVersion),
    [id, activeVersion, initialVersion],
  );

  // Register/unregister this component when it mounts/unmounts
  // Pass version info (including labels) so they're available for offline mode
  useEffect(() => {
    registerComponent(id, versionInfos);
    return () => {
      unregisterComponent(id);
    };
  }, [id, versionInfos]);

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

  return (
    <div
      style={{ display: "contents" }}
      {...{
        [BRANCHKIT_TARGET_ATTRS.targetId]: targetMetadata.targetId,
        [BRANCHKIT_TARGET_ATTRS.targetName]: targetMetadata.targetName,
        [BRANCHKIT_TARGET_ATTRS.targetKind]: targetMetadata.targetKind,
        [BRANCHKIT_TARGET_ATTRS.activeVersion]: targetMetadata.activeVersion || "",
      }}
    >
      {/* @ts-ignore */}
      <VersionComponent {...props} />
    </div>
  );
}
