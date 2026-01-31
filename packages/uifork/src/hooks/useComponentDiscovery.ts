import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getMountedComponents, getAllComponentsWithVersions, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo } from "../types";

interface UseComponentDiscoveryOptions {
  port: number;
}

export function useComponentDiscovery({ port: _port }: UseComponentDiscoveryOptions) {
  // WebSocket-provided components (has file paths)
  const [wsComponents, setWsComponents] = useState<ComponentInfo[]>([]);
  // Local registry components (built from ForkedComponent registrations)
  const [localComponents, setLocalComponents] = useState<Array<{ name: string; versions: string[] }>>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "uifork-selected-component",
    "",
    true,
  );

  // Build effective components list: prefer WebSocket data if available, fallback to local registry
  // WebSocket data has file paths, local registry only has names and versions
  const components: ComponentInfo[] = wsComponents.length > 0
    ? wsComponents
    : localComponents.map((c) => ({ name: c.name, path: "", versions: c.versions }));

  // Filter components to only show mounted ones
  const mountedComponents = components.filter((c) => mountedComponentIds.includes(c.name));

  // Handle components update from WebSocket
  const handleComponentsUpdate = useCallback(
    (
      newWsComponents: Array<{
        name: string;
        path: string;
        versions: string[];
      }>,
    ) => {
      setWsComponents(newWsComponents);

      // If no component selected yet, select the first one
      if (!selectedComponent && newWsComponents.length > 0) {
        setSelectedComponent(newWsComponents[0].name);
      }
    },
    [selectedComponent, setSelectedComponent],
  );

  // Subscribe to component registry changes (for both mounted IDs and local versions)
  useEffect(() => {
    const updateFromRegistry = () => {
      setMountedComponentIds(getMountedComponents());
      setLocalComponents(getAllComponentsWithVersions());
    };

    // Initialize with current mounted components
    updateFromRegistry();

    // Subscribe to changes
    const unsubscribe = subscribe(updateFromRegistry);

    return unsubscribe;
  }, []);

  // Auto-select first mounted component if current selection is not mounted
  useEffect(() => {
    if (
      selectedComponent &&
      mountedComponentIds.length > 0 &&
      !mountedComponentIds.includes(selectedComponent)
    ) {
      // Current selection is not mounted, switch to first mounted component
      const firstMounted = components.find((c) => mountedComponentIds.includes(c.name));
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    } else if (!selectedComponent && mountedComponentIds.length > 0 && components.length > 0) {
      // No selection yet, select first mounted component
      const firstMounted = components.find((c) => mountedComponentIds.includes(c.name));
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    }
  }, [selectedComponent, mountedComponentIds, components, setSelectedComponent]);

  return {
    components,
    mountedComponents,
    mountedComponentIds,
    selectedComponent,
    setSelectedComponent,
    onComponentsUpdate: handleComponentsUpdate,
  };
}
