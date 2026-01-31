import { useEffect, useMemo, useState, RefObject } from "react";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import {
  getContainerPosition,
  getTransformOrigin,
  type Position,
  type ContainerPosition,
} from "../utils/positioning";

interface UseContainerPositioningProps {
  position: Position;
  isComponentSelectorOpen: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  componentSelectorRef: RefObject<HTMLDivElement | null>;
}

interface UseContainerPositioningReturn {
  containerPosition: ContainerPosition;
  transformOrigin: string;
  componentSelectorPosition: { x: number; y: number };
}

/**
 * Hook that manages container positioning and component selector dropdown positioning.
 * Combines the memoized container position calculations with the floating-ui
 * positioning for the component selector dropdown.
 */
export function useContainerPositioning({
  position,
  isComponentSelectorOpen,
  containerRef,
  componentSelectorRef,
}: UseContainerPositioningProps): UseContainerPositioningReturn {
  const [componentSelectorPosition, setComponentSelectorPosition] = useState({
    x: 0,
    y: 0,
  });

  // Calculate container position based on settings
  const containerPosition = useMemo(() => getContainerPosition(position), [position]);
  const transformOrigin = useMemo(() => getTransformOrigin(position), [position]);

  // Position component selector dropdown using floating-ui
  useEffect(() => {
    if (!isComponentSelectorOpen || !containerRef.current || !componentSelectorRef.current) return;

    const updatePosition = async () => {
      try {
        const { x, y } = await computePosition(
          containerRef.current!,
          componentSelectorRef.current!,
          {
            placement: "left-start",
            strategy: "fixed",
            middleware: [offset(4), flip(), shift({ padding: 8 })],
          },
        );
        setComponentSelectorPosition({ x, y });
        if (componentSelectorRef.current) componentSelectorRef.current.style.visibility = "visible";
      } catch {
        // Error positioning component selector
      }
    };

    if (componentSelectorRef.current) componentSelectorRef.current.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(containerRef.current, componentSelectorRef.current, updatePosition);
    return cleanup;
  }, [isComponentSelectorOpen, containerRef, componentSelectorRef]);

  return {
    containerPosition,
    transformOrigin,
    componentSelectorPosition,
  };
}
