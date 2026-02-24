import { useCallback, useEffect, useState } from "react";
import { useDragControls } from "motion/react";
import { ANIMATION_DURATION } from "../components/constants";
import type { Position } from "../utils/positioning";

interface UseDragToCornerOptions {
  isOpen: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  setPosition: (position: Position) => void;
}

/**
 * Hook to handle dragging a container element and snapping it to the nearest corner.
 * Implements a drag threshold to prevent accidental drags on clicks.
 */
export function useDragToCorner({
  isOpen,
  containerRef,
  setPosition,
}: UseDragToCornerOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [resetDrag, setResetDrag] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [pointerStart, setPointerStart] = useState<{
    x: number;
    y: number;
    event: PointerEvent | null;
  } | null>(null);

  // Drag controls for manual drag initiation
  const dragControls = useDragControls();

  // Drag threshold in pixels
  const DRAG_THRESHOLD = 5;

  // Calculate nearest corner based on position
  const getNearestCorner = useCallback(
    (x: number, y: number): Position => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight / 2;

      if (x < centerX && y < centerY) {
        return "top-left";
      } else if (x >= centerX && y < centerY) {
        return "top-right";
      } else if (x < centerX && y >= centerY) {
        return "bottom-left";
      } else {
        return "bottom-right";
      }
    },
    [],
  );

  // Handle drag end - snap to nearest corner
  const handleDragEnd = useCallback(
    (_event: PointerEvent, _info: { point: { x: number; y: number } }) => {
      setIsDragging(false);
      setDragEnabled(false);
      setPointerStart(null);

      // Reset cursor on document body and container
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
      if (containerRef.current) {
        containerRef.current.style.removeProperty("cursor");
        containerRef.current.removeAttribute("data-drag-tracking");
        containerRef.current.removeAttribute("data-dragging");
      }

      // Get current container position (includes drag transforms)
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate nearest corner based on center of container
      const nearestCorner = getNearestCorner(centerX, centerY);

      // Update position (will save to localStorage automatically)
      setPosition(nearestCorner);

      // Trigger reset of drag transforms
      setResetDrag(true);
    },
    [getNearestCorner, setPosition, containerRef],
  );

  // Handle pointer down - start tracking for drag threshold
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isOpen) return; // Don't allow dragging when open
      const pointerEvent = e.nativeEvent as PointerEvent;
      setPointerStart({ x: e.clientX, y: e.clientY, event: pointerEvent });
      setDragEnabled(false);
      // Add data attribute to container for CSS targeting
      if (containerRef.current) {
        containerRef.current.setAttribute("data-drag-tracking", "true");
      }
    },
    [isOpen, containerRef],
  );

  // Global pointer move handler to check threshold
  useEffect(() => {
    if (!pointerStart || isOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = Math.abs(e.clientX - pointerStart.x);
      const deltaY = Math.abs(e.clientY - pointerStart.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > DRAG_THRESHOLD && !dragEnabled) {
        setDragEnabled(true);
        setResetDrag(false);
        // Start drag manually using the current pointer event
        // This ensures drag starts from the current position, not causing a jump
        dragControls.start(e, { snapToCursor: true });
      }
    };

    const handlePointerUp = () => {
      if (!dragEnabled) {
        // If drag wasn't enabled, reset everything
        setPointerStart(null);
        setDragEnabled(false);
        // Reset cursor on document body and container
        document.body.style.removeProperty("cursor");
        if (containerRef.current) {
          containerRef.current.style.removeProperty("cursor");
          containerRef.current.removeAttribute("data-drag-tracking");
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [pointerStart, isOpen, dragEnabled, dragControls, containerRef]);

  // Handle drag start (only called after threshold is crossed)
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setResetDrag(false);
    // Set cursor on document body and container to ensure it stays grabbing
    // Use !important to override any CSS cursor styles
    document.body.style.setProperty("cursor", "grabbing", "important");
    document.body.style.userSelect = "none";
    if (containerRef.current) {
      containerRef.current.style.setProperty("cursor", "grabbing", "important");
      containerRef.current.setAttribute("data-dragging", "true");
    }
  }, [containerRef]);

  // Reset drag transforms after position update
  useEffect(() => {
    if (resetDrag && !isDragging) {
      // Reset flag after animation completes
      const timer = setTimeout(
        () => {
          setResetDrag(false);
        },
        ANIMATION_DURATION * 1000 + 50,
      );
      return () => clearTimeout(timer);
    }
  }, [resetDrag, isDragging]);

  // Cleanup: Reset cursor when dropdown opens or component unmounts
  useEffect(() => {
    if (isOpen && (isDragging || dragEnabled)) {
      // Reset drag state when dropdown opens
      setIsDragging(false);
      setDragEnabled(false);
      setPointerStart(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [isOpen, isDragging, dragEnabled]);

  // Cleanup: Reset cursor on unmount
  useEffect(() => {
    return () => {
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
      if (containerRef.current) {
        containerRef.current.style.removeProperty("cursor");
        containerRef.current.removeAttribute("data-drag-tracking");
        containerRef.current.removeAttribute("data-dragging");
      }
    };
  }, [containerRef]);

  return {
    isDragging,
    resetDrag,
    dragEnabled,
    dragControls,
    handlePointerDown,
    handleDragStart,
    handleDragEnd,
  };
}
