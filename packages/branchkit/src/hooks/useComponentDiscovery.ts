import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getMountedComponents, getAllComponentsWithVersions, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo, VersionInfo } from "../types";

interface UseComponentDiscoveryOptions {
  port: number;
}

type WsTarget = {
  targetId: string;
  name: string;
  kind?: "page" | "component";
  path: string;
  versions: string[];
};

export function useComponentDiscovery({ port: _port }: UseComponentDiscoveryOptions) {
  const [wsComponents, setWsComponents] = useState<WsTarget[]>([]);
  const [localComponents, setLocalComponents] = useState<Array<{ targetId: string; versions: VersionInfo[] }>>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "branchkit-selected-component",
    "",
    true,
  );

  const components: ComponentInfo[] = useMemo(() => {
    if (wsComponents.length > 0) {
      return wsComponents.map((wsComp) => {
        const localCompById = localComponents.find((lc) => lc.targetId === wsComp.targetId);
        const localCompByName = localComponents.find((lc) => lc.targetId === wsComp.name);
        const localComp = localCompById || localCompByName;

        const versionsWithLabels: VersionInfo[] = wsComp.versions.map((key) => {
          const localVersion = localComp?.versions.find((v) => v.key === key);
          return {
            key,
            label: localVersion?.label,
          };
        });

        return {
          targetId: wsComp.targetId,
          name: wsComp.name,
          kind: wsComp.kind,
          path: wsComp.path,
          versions: versionsWithLabels,
        };
      });
    }

    return localComponents.map((c) => ({
      targetId: c.targetId,
      name: c.targetId.split("/").pop() || c.targetId,
      kind: undefined,
      path: "",
      versions: c.versions,
    }));
  }, [wsComponents, localComponents]);

  const mountedComponents = useMemo(
    () =>
      components.filter(
        (c) => mountedComponentIds.includes(c.targetId) || mountedComponentIds.includes(c.name),
      ),
    [components, mountedComponentIds],
  );

  const handleComponentsUpdate = useCallback(
    (newWsComponents: WsTarget[]) => {
      setWsComponents(newWsComponents);

      if (!selectedComponent && newWsComponents.length > 0) {
        setSelectedComponent(newWsComponents[0].targetId);
      }
    },
    [selectedComponent, setSelectedComponent],
  );

  useEffect(() => {
    const updateFromRegistry = () => {
      setMountedComponentIds(getMountedComponents());
      setLocalComponents(getAllComponentsWithVersions());
    };

    updateFromRegistry();
    const unsubscribe = subscribe(updateFromRegistry);

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (
      selectedComponent &&
      mountedComponentIds.length > 0 &&
      !mountedComponentIds.includes(selectedComponent)
    ) {
      const firstMounted = components.find(
        (c) => mountedComponentIds.includes(c.targetId) || mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.targetId);
      }
    } else if (!selectedComponent && mountedComponentIds.length > 0 && components.length > 0) {
      const firstMounted = components.find(
        (c) => mountedComponentIds.includes(c.targetId) || mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.targetId);
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
