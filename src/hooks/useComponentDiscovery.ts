import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getMountedComponents, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo } from "../types";

interface UseComponentDiscoveryOptions {
  port: number;
}

export function useComponentDiscovery({ port }: UseComponentDiscoveryOptions) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "uifork-selected-component",
    "",
    true,
  );

  // Filter components to only show mounted ones
  const mountedComponents = components.filter((c) =>
    mountedComponentIds.includes(c.name),
  );

  // Fetch components from server
  const fetchComponents = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:${port}/components`);
      if (response.ok) {
        const data = await response.json();
        setComponents(data.components || []);

        // If no component selected yet, select the first one
        if (!selectedComponent && data.components?.length > 0) {
          setSelectedComponent(data.components[0].name);
        }
      }
    } catch (error) {
      console.error("[UIFork] Error fetching components:", error);
    }
  }, [port, selectedComponent, setSelectedComponent]);

  // Subscribe to component registry changes
  useEffect(() => {
    // Initialize with current mounted components
    setMountedComponentIds(getMountedComponents());

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      setMountedComponentIds(getMountedComponents());
    });

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
      const firstMounted = components.find((c) =>
        mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    } else if (
      !selectedComponent &&
      mountedComponentIds.length > 0 &&
      components.length > 0
    ) {
      // No selection yet, select first mounted component
      const firstMounted = components.find((c) =>
        mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    }
  }, [
    selectedComponent,
    mountedComponentIds,
    components,
    setSelectedComponent,
  ]);

  // Fetch components on mount
  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  return {
    components,
    mountedComponents,
    mountedComponentIds,
    selectedComponent,
    setSelectedComponent,
    fetchComponents,
  };
}
