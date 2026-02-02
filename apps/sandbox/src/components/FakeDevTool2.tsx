import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { motion, useDragControls } from "motion/react";
import { IconX } from "@tabler/icons-react";

type Position =
  | "top-left"
  | "top-middle"
  | "top-right"
  | "left-middle"
  | "right-middle"
  | "bottom-left"
  | "bottom-middle"
  | "bottom-right";

const ANIMATION_DURATION = 0.2;
const ANIMATION_EASING = [0.04, 1.02, 0.13, 1.02] as const;
const DRAG_THRESHOLD = 5;
const DEFAULT_OFFSET = 20;
const STORAGE_KEY = "fake-dev-tool-2-position";

function getContainerPosition(
  position: Position,
  offset: number = DEFAULT_OFFSET,
): React.CSSProperties {
  // Use calc() for centering to avoid transform conflicts with drag
  const positions: Record<Position, React.CSSProperties> = {
    "top-left": {
      top: `${offset}px`,
      left: `${offset}px`,
      bottom: "auto",
      right: "auto",
    },
    "top-middle": {
      top: `${offset}px`,
      left: "calc(50% - 16px)", // Center horizontally (assuming ~32px width)
      bottom: "auto",
      right: "auto",
    },
    "top-right": {
      top: `${offset}px`,
      right: `${offset}px`,
      bottom: "auto",
      left: "auto",
    },
    "left-middle": {
      top: "calc(50% - 16px)", // Center vertically
      left: `${offset}px`,
      bottom: "auto",
      right: "auto",
    },
    "right-middle": {
      top: "calc(50% - 16px)", // Center vertically
      right: `${offset}px`,
      bottom: "auto",
      left: "auto",
    },
    "bottom-left": {
      bottom: `${offset}px`,
      left: `${offset}px`,
      top: "auto",
      right: "auto",
    },
    "bottom-middle": {
      bottom: `${offset}px`,
      left: "calc(50% - 16px)", // Center horizontally
      top: "auto",
      right: "auto",
    },
    "bottom-right": {
      bottom: `${offset}px`,
      right: `${offset}px`,
      top: "auto",
      left: "auto",
    },
  };
  return positions[position];
}

function getNearestPosition(x: number, y: number): Position {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;

  const positions: Array<{ pos: Position; distance: number }> = [
    {
      pos: "top-left",
      distance: Math.sqrt(
        (x - DEFAULT_OFFSET) * (x - DEFAULT_OFFSET) + (y - DEFAULT_OFFSET) * (y - DEFAULT_OFFSET),
      ),
    },
    {
      pos: "top-middle",
      distance: Math.sqrt(
        (x - centerX) * (x - centerX) + (y - DEFAULT_OFFSET) * (y - DEFAULT_OFFSET),
      ),
    },
    {
      pos: "top-right",
      distance: Math.sqrt(
        (x - (viewportWidth - DEFAULT_OFFSET)) * (x - (viewportWidth - DEFAULT_OFFSET)) +
          (y - DEFAULT_OFFSET) * (y - DEFAULT_OFFSET),
      ),
    },
    {
      pos: "left-middle",
      distance: Math.sqrt(
        (x - DEFAULT_OFFSET) * (x - DEFAULT_OFFSET) + (y - centerY) * (y - centerY),
      ),
    },
    {
      pos: "right-middle",
      distance: Math.sqrt(
        (x - (viewportWidth - DEFAULT_OFFSET)) * (x - (viewportWidth - DEFAULT_OFFSET)) +
          (y - centerY) * (y - centerY),
      ),
    },
    {
      pos: "bottom-left",
      distance: Math.sqrt(
        (x - DEFAULT_OFFSET) * (x - DEFAULT_OFFSET) +
          (y - (viewportHeight - DEFAULT_OFFSET)) * (y - (viewportHeight - DEFAULT_OFFSET)),
      ),
    },
    {
      pos: "bottom-middle",
      distance: Math.sqrt(
        (x - centerX) * (x - centerX) +
          (y - (viewportHeight - DEFAULT_OFFSET)) * (y - (viewportHeight - DEFAULT_OFFSET)),
      ),
    },
    {
      pos: "bottom-right",
      distance: Math.sqrt(
        (x - (viewportWidth - DEFAULT_OFFSET)) * (x - (viewportWidth - DEFAULT_OFFSET)) +
          (y - (viewportHeight - DEFAULT_OFFSET)) * (y - (viewportHeight - DEFAULT_OFFSET)),
      ),
    },
  ];

  return positions.reduce((min, current) => (current.distance < min.distance ? current : min)).pos;
}

function VercelToolbarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 3 Horizontal Lines */}
      {/* Shifted right (x=4) to align the circle (cx=4) with the left edge */}
      <rect x="4" y="4.5" width="10" height="1" fill="#EDEDED" rx="0.5" />
      <rect x="4" y="8.5" width="10" height="1" fill="#EDEDED" rx="0.5" />
      <rect x="4" y="12.5" width="10" height="1" fill="#EDEDED" rx="0.5" />

      {/* Circle overlay with Triangle */}
      {/* Centered at x=4 to align with left edge of lines */}
      <circle cx="4" cy="11.5" r="3.5" fill="white" stroke="black" strokeWidth="2" />
      {/* Triangle centered in the circle */}
      <path d="M4 9.5L6 12.5H2L4 9.5Z" fill="black" />
    </svg>
  );
}

// Self-contained draggable component that manages its own state
function DraggableToolContent() {
  console.log("DraggableToolContent: Rendering");
  const [position, setPosition] = useState<Position>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Position) : "right-middle";
    } catch {
      return "right-middle";
    }
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resetDrag, setResetDrag] = useState(false);
  const [pointerStart, setPointerStart] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const isDraggingRef = useRef(false);

  // Save position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      // Ignore localStorage errors
    }
  }, [position]);

  const containerPosition = getContainerPosition(position);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    setPointerStart(null);

    document.body.style.removeProperty("cursor");
    document.body.style.userSelect = "";
    if (containerRef.current) {
      containerRef.current.style.removeProperty("cursor");
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const nearestPosition = getNearestPosition(centerX, centerY);
    setPosition(nearestPosition);
    setResetDrag(true);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-close-button]")) {
      return;
    }
    setPointerStart({ x: e.clientX, y: e.clientY });
    isDraggingRef.current = false;
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    isDraggingRef.current = true;
    setResetDrag(false);
    document.body.style.setProperty("cursor", "grabbing", "important");
    document.body.style.userSelect = "none";
    if (containerRef.current) {
      containerRef.current.style.setProperty("cursor", "grabbing", "important");
    }
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(false);
  }, []);

  // Handle pointer move/up for drag detection
  useEffect(() => {
    if (!pointerStart) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) return;

      const deltaX = Math.abs(e.clientX - pointerStart.x);
      const deltaY = Math.abs(e.clientY - pointerStart.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > DRAG_THRESHOLD) {
        isDraggingRef.current = true;
        setIsDragging(true);
        setResetDrag(false);
        document.body.style.setProperty("cursor", "grabbing", "important");
        document.body.style.userSelect = "none";
        dragControls.start(e, { snapToCursor: true });
      }
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) {
        // Click - toggle expanded
        setIsExpanded((prev) => !prev);
      }
      setPointerStart(null);
      isDraggingRef.current = false;
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [pointerStart, dragControls]);

  useEffect(() => {
    if (resetDrag && !isDragging) {
      const timer = setTimeout(
        () => {
          setResetDrag(false);
        },
        ANIMATION_DURATION * 1000 + 50,
      );
      return () => clearTimeout(timer);
    }
  }, [resetDrag, isDragging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
    };
  }, []);

  const motionStyle: React.CSSProperties = {
    ...containerPosition,
    position: "fixed",
    touchAction: "none",
  };

  return (
    <motion.div
      ref={containerRef}
      style={motionStyle}
      layout
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      dragListener={false}
      onPointerDown={handlePointerDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={resetDrag ? { x: 0, y: 0 } : {}}
      transition={{
        layout: { duration: ANIMATION_DURATION, ease: ANIMATION_EASING },
        x: { duration: ANIMATION_DURATION, ease: ANIMATION_EASING },
        y: { duration: ANIMATION_DURATION, ease: ANIMATION_EASING },
      }}
    >
        <motion.div
          className={`h-9 rounded-full border-none cursor-grab active:cursor-grabbing shadow-lg transition-transform hover:scale-110 hover:shadow-xl flex items-center justify-center gap-2 ${
            isExpanded ? "bg-black pl-3 pr-3" : "bg-black px-2.5"
          }`}
          style={{
            // Increased inset shadow opacity for clearer border
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.3) inset, 0 6px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.5)",
          }}
          role="button"
          aria-label="Vercel Live Feedback"
          tabIndex={0}
          draggable={false}
          animate={{ width: isExpanded ? "auto" : "36px" }}
          transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASING }}
        >
        <span className="flex-shrink-0 flex items-center justify-center">
          <VercelToolbarIcon />
        </span>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: ANIMATION_DURATION }}
            className="text-white text-xs font-medium whitespace-nowrap"
          >
            Live Feedback
          </motion.span>
        )}
        {isExpanded && (
          <motion.div
            data-close-button
            onClick={handleClose}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            role="button"
            aria-label="Close"
            tabIndex={0}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: ANIMATION_DURATION }}
          >
            <IconX size={14} stroke={2} />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Main component that creates the shadow DOM and renders the self-contained component into it
export function FakeDevTool2() {
  const customElementRef = useRef<HTMLElement | null>(null);
  const reactRootRef = useRef<Root | null>(null);

  useEffect(() => {
    console.log("FakeDevTool2: useEffect running, customElementRef:", customElementRef.current);

    // Check if element exists AND is still in the DOM
    if (customElementRef.current && customElementRef.current.parentNode) {
      console.log("FakeDevTool2: Already has element in DOM, skipping");
      return;
    }

    // Create custom element
    console.log("FakeDevTool2: Creating vercel-live-feedback element");
    const customElement = document.createElement("vercel-live-feedback");
    customElement.style.position = "absolute";
    customElement.style.top = "0px";
    customElement.style.left = "0px";
    customElement.style.zIndex = "2147483647";
    document.body.appendChild(customElement);
    customElementRef.current = customElement;

    // Create shadow root
    const shadowRoot = customElement.attachShadow({ mode: "closed" });

    // Inject styles into shadow root
    const style = document.createElement("style");
    let cssText = `
      :host {
        all: initial;
      }
    `;

    // Try to copy styles from the main document
    try {
      const styleSheets = Array.from(document.styleSheets);
      styleSheets.forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          cssText += "\n" + rules.map((rule) => rule.cssText).join("\n");
        } catch {
          // Cross-origin stylesheets can't be accessed
        }
      });
    } catch {
      // Ignore errors
    }

    style.textContent = cssText;
    shadowRoot.appendChild(style);

    // Create container and React root
    const shadowContainer = document.createElement("div");
    shadowContainer.id = "shadow-container";
    shadowRoot.appendChild(shadowContainer);

    // Render the self-contained component once
    console.log("FakeDevTool2: Creating React root and rendering");
    const root = createRoot(shadowContainer);
    reactRootRef.current = root;
    root.render(<DraggableToolContent />);
    console.log("FakeDevTool2: Rendered DraggableToolContent");

    return () => {
      console.log("FakeDevTool2: Cleanup running");
      // Store refs locally for cleanup
      const root = reactRootRef.current;
      const element = customElementRef.current;

      // Clear refs immediately so next mount can create new ones
      reactRootRef.current = null;
      customElementRef.current = null;

      // Cleanup asynchronously to avoid issues with StrictMode
      requestAnimationFrame(() => {
        if (root) {
          try {
            root.unmount();
          } catch {
            // Ignore errors
          }
        }
        if (element?.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, []);

  return null;
}
