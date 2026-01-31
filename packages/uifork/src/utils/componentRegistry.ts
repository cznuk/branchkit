/**
 * Registry to track which components are currently mounted in the React tree.
 * This allows UIFork to only show components that are actually being used.
 * Also stores version information for offline mode support.
 */

// Map of component id -> version keys array
const mountedComponents = new Map<string, string[]>();
const listeners = new Set<() => void>();

/**
 * Register a component as mounted with its available versions
 */
export function registerComponent(id: string, versions: string[] = []): void {
  mountedComponents.set(id, versions);
  notifyListeners();
}

/**
 * Unregister a component (when it unmounts)
 */
export function unregisterComponent(id: string): void {
  mountedComponents.delete(id);
  notifyListeners();
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
 * Get version keys for a specific component
 */
export function getComponentVersions(id: string): string[] {
  return mountedComponents.get(id) || [];
}

/**
 * Get all mounted components with their versions
 * Returns array of { name, versions } objects for offline mode
 */
export function getAllComponentsWithVersions(): Array<{ name: string; versions: string[] }> {
  return Array.from(mountedComponents.entries()).map(([name, versions]) => ({
    name,
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
