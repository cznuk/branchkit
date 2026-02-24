/**
 * Registry to track which components are currently mounted in the React tree.
 * This allows BranchKit to only show components that are actually being used.
 * Also stores version information (including labels) for offline mode support.
 */

import type { VersionInfo } from "../types";

// Map of component id -> { versions, refCount }
// refCount tracks how many instances of this component are mounted
const mountedComponents = new Map<string, { versions: VersionInfo[]; refCount: number }>();
const listeners = new Set<() => void>();

/**
 * Register a component as mounted with its available versions and labels.
 * Uses reference counting to handle multiple instances of the same component.
 */
export function registerComponent(id: string, versions: VersionInfo[] = []): void {
  const existing = mountedComponents.get(id);
  if (existing) {
    // Increment reference count for additional instances
    mountedComponents.set(id, { versions, refCount: existing.refCount + 1 });
  } else {
    // First instance of this component
    mountedComponents.set(id, { versions, refCount: 1 });
    // Only notify listeners when a new component is added
    notifyListeners();
  }
}

/**
 * Unregister a component (when it unmounts).
 * Only removes from registry when the last instance unmounts.
 */
export function unregisterComponent(id: string): void {
  const existing = mountedComponents.get(id);
  if (!existing) return;

  if (existing.refCount > 1) {
    // Still have other instances mounted, just decrement
    mountedComponents.set(id, { versions: existing.versions, refCount: existing.refCount - 1 });
  } else {
    // Last instance unmounting, remove from registry
    mountedComponents.delete(id);
    // Only notify listeners when a component is fully removed
    notifyListeners();
  }
}

/**
 * Check if a component is currently mounted
 */
export function isComponentMounted(id: string): boolean {
  return mountedComponents.has(id);
}

/**
 * Get all currently mounted component IDs
 */
export function getMountedComponents(): string[] {
  return Array.from(mountedComponents.keys());
}

/**
 * Get version info for a specific component
 */
export function getComponentVersions(id: string): VersionInfo[] {
  return mountedComponents.get(id)?.versions || [];
}

/**
 * Get all mounted components with their versions (including labels)
 * Returns array of { targetId, versions } objects for offline mode
 */
export function getAllComponentsWithVersions(): Array<{ targetId: string; versions: VersionInfo[] }> {
  return Array.from(mountedComponents.entries()).map(([targetId, { versions }]) => ({
    targetId,
    versions,
  }));
}

/**
 * Subscribe to changes in the mounted components registry
 * Returns an unsubscribe function
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}
