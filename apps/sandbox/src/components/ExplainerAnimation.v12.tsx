import React from "react";

/**
 * ExplainerAnimation v12 - Simplified Content Layouts
 *
 * Timeline Summary:
 * 1. User moves mouse to BranchKit button and opens dropdown
 * 2. User clicks v2 version (switches to v2)
 * 3. User clicks v3 version (switches to v3)
 * 4. User hovers over v3 and clicks fork button (creates v4)
 * 5. v4 file appears in code editor sidebar
 * 6. v4 version appears in BranchKit dropdown
 * 7. User moves cursor to code editor and clicks v4 file
 * 8. Editor shows v4 file content
 *
 * Key improvements:
 * - useCursor hook: call cursor.moveTo(ref) or cursor.moveTo('[data-id="thing"]')
 * - Centralized state object: all state in one place
 * - Declarative timeline: reads like a script, easy to follow
 * - Code editor state nested in global state
 * - Version browsing: user clicks through v1, v2, v3 before forking
 * - Simplified browser content: consistent header/nav/tabs, different content layouts below
 */

// =============================================================================
// TYPES
// =============================================================================

type ElementTarget = React.RefObject<HTMLElement> | string;

type AnimationState = {
  cursor: {
    x: number;
    y: number;
    visible: boolean;
  };
  branchkit: {
    isOpen: boolean;
    hoveredVersion: string | null;
    activeVersion: string;
    versions: string[];
  };
  codeEditor: {
    activeFile: string;
    files: string[];
  };
  timeline: {
    isPlaying: boolean;
    currentStepIndex: number;
  };
};

type TimelineAction =
  | { type: "moveTo"; target: ElementTarget; duration?: number }
  | { type: "hover"; version: string | null }
  | { type: "click" }
  | { type: "wait"; duration: number }
  | { type: "setState"; changes: Partial<Omit<AnimationState, "cursor" | "timeline">> }
  | { type: "log"; message: string };

// =============================================================================
// CURSOR HOOK
// =============================================================================

function useCursor(containerRef: React.RefObject<HTMLElement>) {
  const [position, setPosition] = React.useState({ x: 50, y: 50 });
  const [visible, setVisible] = React.useState(true);
  const animationRef = React.useRef<number | null>(null);
  // Use a ref to track current position so it doesn't get stale in closures
  const positionRef = React.useRef({ x: 50, y: 50 });

  // Keep ref in sync with state
  React.useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const getTargetElement = React.useCallback(
    (target: ElementTarget): HTMLElement | null => {
      if (typeof target === "string") {
        // It's a selector
        return containerRef.current?.querySelector(target) ?? document.querySelector(target);
      }
      // It's a ref
      return target.current;
    },
    [containerRef],
  );

  const getElementCenter = React.useCallback(
    (element: HTMLElement): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const x = elementRect.left - containerRect.left + elementRect.width / 2;
      const y = elementRect.top - containerRect.top + elementRect.height / 2;

      return {
        x: (x / containerRect.width) * 100,
        y: (y / containerRect.height) * 100,
      };
    },
    [containerRef],
  );

  const moveTo = React.useCallback(
    async (target: ElementTarget, duration = 1000): Promise<void> => {
      const element = getTargetElement(target);
      if (!element) {
        console.warn("useCursor.moveTo: target element not found", target);
        return;
      }

      const targetPos = getElementCenter(element);
      if (!targetPos) return;

      // Use ref to get current position, not stale closure value
      const startPos = { ...positionRef.current };
      const startTime = Date.now();

      return new Promise((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Smooth easing (ease-in-out-cubic)
          const eased =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          const currentX = startPos.x + (targetPos.x - startPos.x) * eased;
          const currentY = startPos.y + (targetPos.y - startPos.y) * eased;

          const newPos = { x: currentX, y: currentY };
          positionRef.current = newPos;
          setPosition(newPos);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(animate);
      });
    },
    [getTargetElement, getElementCenter],
  );

  const click = React.useCallback(async (): Promise<void> => {
    // Find element at cursor position and click it
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const currentPos = positionRef.current;
    const x = containerRect.left + (currentPos.x / 100) * containerRect.width;
    const y = containerRect.top + (currentPos.y / 100) * containerRect.height;

    const element = document.elementFromPoint(x, y) as HTMLElement;
    if (element) {
      element.click();
    }
  }, [containerRef]);

  const reset = React.useCallback((x = 50, y = 50) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const newPos = { x, y };
    positionRef.current = newPos;
    setPosition(newPos);
    setVisible(true);
  }, []);

  const hide = React.useCallback(() => setVisible(false), []);
  const show = React.useCallback(() => setVisible(true), []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    position,
    visible,
    moveTo,
    click,
    reset,
    hide,
    show,
  };
}

// =============================================================================
// TIMELINE RUNNER HOOK
// =============================================================================

function useTimeline(
  timeline: TimelineAction[],
  cursor: ReturnType<typeof useCursor>,
  setState: React.Dispatch<React.SetStateAction<AnimationState>>,
) {
  const isRunningRef = React.useRef(false);

  const run = React.useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    setState((s) => ({ ...s, timeline: { ...s.timeline, isPlaying: true, currentStepIndex: 0 } }));

    for (let i = 0; i < timeline.length; i++) {
      if (!isRunningRef.current) break;

      setState((s) => ({ ...s, timeline: { ...s.timeline, currentStepIndex: i } }));
      const action = timeline[i];

      switch (action.type) {
        case "moveTo":
          await cursor.moveTo(action.target, action.duration ?? 1000);
          break;

        case "hover":
          setState((s) => ({
            ...s,
            branchkit: { ...s.branchkit, hoveredVersion: action.version },
          }));
          break;

        case "click":
          await cursor.click();
          await new Promise((r) => setTimeout(r, 50)); // Small delay for click to register
          break;

        case "wait":
          await new Promise((r) => setTimeout(r, action.duration));
          break;

        case "setState":
          setState((s) => {
            const newState = { ...s };
            if (action.changes.branchkit) {
              newState.branchkit = { ...s.branchkit, ...action.changes.branchkit };
            }
            if (action.changes.codeEditor) {
              newState.codeEditor = { ...s.codeEditor, ...action.changes.codeEditor };
            }
            return newState;
          });
          break;

        case "log":
          console.log(`[Timeline] ${action.message}`);
          break;
      }
    }

    isRunningRef.current = false;
    setState((s) => ({ ...s, timeline: { ...s.timeline, isPlaying: false } }));
  }, [timeline, cursor, setState]);

  const stop = React.useCallback(() => {
    isRunningRef.current = false;
  }, []);

  const reset = React.useCallback(() => {
    isRunningRef.current = false;
    cursor.reset(50, 50);
    setState((s) => ({
      ...s,
      timeline: { isPlaying: false, currentStepIndex: 0 },
    }));
  }, [cursor, setState]);

  return { run, stop, reset };
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function BrowserFrame({
  children,
  branchkit,
}: {
  children: React.ReactNode;
  branchkit?: React.ReactNode;
}) {
  return (
    <div className="w-full h-[360px] bg-white dark:bg-stone-900 rounded-lg border border-border overflow-hidden shadow-lg relative flex flex-col">
      {/* Browser Header */}
      <div className="h-8 bg-stone-100 dark:bg-stone-800 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
        </div>
        <div className="flex-1 mx-4 h-5 bg-white dark:bg-stone-900 border border-border rounded text-[10px] flex items-center px-2 text-muted-foreground">
          localhost:5173
        </div>
      </div>
      {/* Browser Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {children}
        {branchkit}
      </div>
    </div>
  );
}

function CodeEditor({ state }: { state: AnimationState["codeEditor"] }) {
  const placeholderRows = [
    { width: "60%" },
    { width: "45%", indent: 1 },
    { width: "50%", indent: 1 },
    { width: "55%", indent: 2 },
    { width: "40%", indent: 2 },
    { width: "65%", indent: 2 },
    { width: "50%", indent: 1 },
    { width: "45%", indent: 1 },
    { width: "70%", indent: 2 },
    { width: "55%", indent: 2 },
    { width: "60%", indent: 1 },
    { width: "50%", indent: 1 },
    { width: "45%" },
  ];

  return (
    <div className="w-full h-[360px] bg-card rounded-lg border border-border overflow-hidden shadow-lg flex flex-col">
      {/* Top Toolbar */}
      <div className="h-8 bg-muted border-b border-border flex items-center px-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">Cursor</span>
        </div>
        <div className="w-12" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer Sidebar */}
        <div className="w-48 bg-muted border-r border-border flex flex-col">
          <div className="flex-1 overflow-auto p-1">
            <div className="space-y-0.5">
              <div className="px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">src</div>
              <div className="pl-3 pr-1.5 py-0.5 text-[10px] text-muted-foreground">components</div>
              <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">Card.tsx</div>
              {state.files.map((file) => (
                <div
                  key={file}
                  data-file={file}
                  className={`pl-6 pr-1.5 py-0.5 text-[10px] cursor-pointer transition-all duration-300 ${
                    state.activeFile === file
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground"
                  }`}
                  style={{
                    animation: file === "DashboardContent.v4.tsx" ? "fadeIn 0.3s ease-in" : "none",
                  }}
                >
                  {file}
                </div>
              ))}
              <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">
                DashboardContent.versions.ts
              </div>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="h-8 bg-muted border-b border-border flex items-end px-2 gap-1">
            <div className="px-2 py-1 bg-card border border-b-0 border-border rounded-t text-[10px] text-card-foreground flex items-center gap-1.5 -mb-px">
              <span>{state.activeFile}</span>
              <svg
                className="w-3 h-3 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          {/* Editor Content */}
          <div className="flex-1 overflow-auto p-4 font-mono text-[10px] bg-card space-y-1.5">
            {placeholderRows.map((row, index) => (
              <div
                key={index}
                className="h-3 bg-muted rounded"
                style={{
                  width: row.width,
                  marginLeft: row.indent ? `${row.indent * 1.5}rem` : "0",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({ version }: { version: string }) {
  // Different content layouts for each version (below the tabs)
  const getVersionContent = () => {
    switch (version) {
      case "v1":
        return {
          layout: "single-column",
          itemCount: 3,
        };
      case "v2":
        return {
          layout: "two-column",
          itemCount: 4,
        };
      case "v3":
        return {
          layout: "three-column",
          itemCount: 6,
        };
      default:
        return {
          layout: "single-column",
          itemCount: 3,
        };
    }
  };

  const content = getVersionContent();

  const renderContent = () => {
    switch (content.layout) {
      case "single-column":
        return (
          <div className="space-y-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        );
      case "two-column":
        return (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        );
      case "three-column":
        return (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: content.itemCount }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Consistent Header/Nav */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 bg-muted rounded" />
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Consistent Tab Bar */}
      <div className="px-4 border-b border-border flex gap-4">
        <div className="h-8 w-16 bg-muted rounded" />
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-8 w-16 bg-muted rounded" />
      </div>

      {/* Changing Content Below Tabs */}
      <div className="flex-1 p-4 overflow-auto">{renderContent()}</div>
    </div>
  );
}

function MiniBranchKit({ state }: { state: AnimationState["branchkit"] }) {
  const formatVersionLabel = (version: string) => version.replace(/^v/, "V");

  return (
    <div
      data-branchkit
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <div className="bg-[#262626] dark:bg-white border border-[#2f2f2f] dark:border-gray-200 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden pointer-events-auto transition-all duration-200 rounded-xl">
        {!state.isOpen ? (
          <button
            data-branchkit-trigger
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-white dark:text-gray-900 cursor-pointer bg-transparent border-none whitespace-nowrap hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100"
            style={{ height: "24px" }}
          >
            <svg
              className="text-[#22c55e] dark:text-[#22c55e]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ width: "12px", height: "12px" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 7v6M16 7v6"
              />
            </svg>
            <span className="font-medium text-white dark:text-gray-900 whitespace-nowrap text-xs">
              DashboardContent
            </span>
            <span className="text-[#a3a3a3] dark:text-gray-500 whitespace-nowrap text-xs">
              {state.activeVersion.replace(/^v/, "V")}
            </span>
          </button>
        ) : (
          <div className="p-0.5 flex flex-col" style={{ minWidth: "auto" }}>
            {/* Component Selector */}
            <div className="flex items-center justify-between px-1.5 py-1">
              <button
                className="flex items-center gap-1 text-xs text-white dark:text-gray-900 bg-transparent border-none cursor-pointer rounded hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100 flex-1 justify-between"
                style={{ height: "24px" }}
              >
                <span className="font-medium text-white dark:text-gray-900 text-xs">
                  DashboardContent
                </span>
                <svg
                  className="w-3 h-3 text-[#a3a3a3] dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            <div className="h-px bg-[#2f2f2f] dark:bg-gray-200 my-0.5" />

            {/* Versions List */}
            <div className="flex flex-col">
              {[...state.versions].reverse().map((version) => {
                const isHovered = state.hoveredVersion === version;
                const isNewVersion = version === "v4";

                return (
                  <div
                    key={version}
                    data-version={version}
                    className={`flex items-center gap-1 px-1.5 py-1 text-xs text-white dark:text-gray-900 cursor-pointer rounded relative transition-all duration-200 ${
                      isHovered
                        ? "bg-[rgba(255,255,255,0.15)] dark:bg-gray-200"
                        : "hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100"
                    }`}
                    style={{
                      height: "24px",
                      minHeight: "24px",
                      animation: isNewVersion ? "fadeIn 0.3s ease-in" : "none",
                    }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      {version === state.activeVersion && (
                        <svg
                          className="w-2.5 h-2.5 text-white dark:text-gray-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-white dark:text-gray-900 text-xs">
                        {formatVersionLabel(version)}
                      </span>
                    </div>
                    {/* Fork button - not on v4 */}
                    {version !== "v4" && (
                      <div data-actions className="flex items-center">
                        <button
                          data-fork-button={version}
                          className="w-4 h-4 flex items-center justify-center text-[#a3a3a3] dark:text-gray-500 hover:text-white dark:hover:text-gray-900 rounded transition-colors"
                          style={{ width: "16px", height: "16px" }}
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ width: "12px", height: "12px" }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 7v6M16 7v6"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-[#2f2f2f] dark:bg-gray-200 my-0.5" />

            {/* New Version Button */}
            <button
              className="flex items-center gap-1 px-1.5 py-1 text-xs text-white dark:text-gray-900 bg-transparent border-none cursor-pointer rounded hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-gray-100"
              style={{ height: "24px" }}
            >
              <div className="w-3 h-3 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-white dark:text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span className="text-white dark:text-gray-900 text-xs">New version</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FakeCursorElement({
  position,
  visible,
}: {
  position: { x: number; y: number };
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(2px, 2px)",
        willChange: "left, top",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6" />
        <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5" />
        <rect
          x="12.5"
          y="13.6"
          transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)"
          width="2"
          height="8"
        />
        <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5" />
      </svg>
    </div>
  );
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors pointer-events-auto"
      aria-label="Replay"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const INITIAL_STATE: AnimationState = {
  cursor: { x: 50, y: 50, visible: true },
  branchkit: {
    isOpen: false,
    hoveredVersion: null,
    activeVersion: "v1",
    versions: ["v1", "v2", "v3"],
  },
  codeEditor: {
    activeFile: "DashboardContent.v1.tsx",
    files: ["DashboardContent.v1.tsx", "DashboardContent.v2.tsx", "DashboardContent.v3.tsx"],
  },
  timeline: {
    isPlaying: false,
    currentStepIndex: 0,
  },
};

// =============================================================================
// TIMELINE DEFINITION
// =============================================================================

const ANIMATION_TIMELINE: TimelineAction[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Move cursor to BranchKit button and open dropdown
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Moving to BranchKit button" },
  { type: "moveTo", target: "[data-branchkit-trigger]", duration: 1200 },
  { type: "wait", duration: 200 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      branchkit: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v1",
        versions: ["v1", "v2", "v3"],
      },
    },
  },
  { type: "wait", duration: 300 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Click v2 version
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Moving to v2" },
  { type: "moveTo", target: '[data-version="v2"]', duration: 400 },
  { type: "hover", version: "v2" },
  { type: "wait", duration: 200 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      branchkit: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v2",
        versions: ["v1", "v2", "v3"],
      },
    },
  },
  { type: "wait", duration: 400 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Click v3 version
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Moving to v3" },
  { type: "moveTo", target: '[data-version="v3"]', duration: 400 },
  { type: "hover", version: "v3" },
  { type: "wait", duration: 200 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      branchkit: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v3",
        versions: ["v1", "v2", "v3"],
      },
    },
  },
  { type: "wait", duration: 400 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Hover over v3 version and click fork button
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Hovering over v3 fork button" },
  { type: "moveTo", target: '[data-version="v3"]', duration: 300 },
  {
    type: "setState",
    changes: {
      branchkit: {
        isOpen: true,
        hoveredVersion: "v3",
        activeVersion: "v3",
        versions: ["v1", "v2", "v3"],
      },
    },
  },
  { type: "wait", duration: 300 },
  { type: "log", message: "Clicking fork button" },
  { type: "moveTo", target: '[data-fork-button="v3"]', duration: 300 },
  { type: "wait", duration: 200 },
  { type: "click" },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. v4 file appears in code editor sidebar
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "v4 file appears in sidebar" },
  { type: "wait", duration: 300 },
  {
    type: "setState",
    changes: {
      codeEditor: {
        activeFile: "DashboardContent.v3.tsx",
        files: [
          "DashboardContent.v1.tsx",
          "DashboardContent.v2.tsx",
          "DashboardContent.v3.tsx",
          "DashboardContent.v4.tsx",
        ],
      },
    },
  },
  { type: "wait", duration: 300 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. v4 version appears in BranchKit dropdown
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "v4 appears in BranchKit" },
  {
    type: "setState",
    changes: {
      branchkit: {
        isOpen: true,
        hoveredVersion: null,
        activeVersion: "v3",
        versions: ["v1", "v2", "v3", "v4"],
      },
    },
  },
  { type: "wait", duration: 500 },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Move cursor to code editor and click v4 file
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Moving to v4 file in editor" },
  { type: "moveTo", target: '[data-file="DashboardContent.v4.tsx"]', duration: 900 },
  { type: "wait", duration: 200 },
  { type: "click" },
  {
    type: "setState",
    changes: {
      codeEditor: {
        activeFile: "DashboardContent.v4.tsx",
        files: [
          "DashboardContent.v1.tsx",
          "DashboardContent.v2.tsx",
          "DashboardContent.v3.tsx",
          "DashboardContent.v4.tsx",
        ],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Done
  // ─────────────────────────────────────────────────────────────────────────────
  { type: "log", message: "Animation complete" },
  { type: "wait", duration: 500 },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ExplainerAnimation() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<AnimationState>(INITIAL_STATE);

  const cursor = useCursor(containerRef);
  const timeline = useTimeline(ANIMATION_TIMELINE, cursor, setState);

  // Auto-start on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      timeline.run();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleReplay = React.useCallback(() => {
    // Reset all state
    setState(INITIAL_STATE);
    cursor.reset(50, 50);
    // Start fresh after a tick
    setTimeout(() => {
      timeline.run();
    }, 100);
  }, [cursor, timeline]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[456px] bg-muted rounded-lg border border-border p-4 overflow-hidden relative"
    >
      {/* Replay button - above overlay so it's clickable */}
      <ReplayButton onClick={handleReplay} />

      <div className="w-full h-full grid grid-cols-2 gap-4 pt-12 pb-4">
        {/* Left: Code Editor */}
        <div className="h-full">
          <CodeEditor state={state.codeEditor} />
        </div>

        {/* Right: Browser Frame with Dashboard */}
        <div className="h-full relative flex items-start">
          <BrowserFrame
            branchkit={
              <div
                className="absolute bottom-4 right-4 z-10"
                style={{ maxWidth: "calc(100% - 2rem)" }}
              >
                <MiniBranchKit state={state.branchkit} />
              </div>
            }
          >
            <div className="bg-stone-50 dark:bg-stone-950 h-full overflow-hidden relative">
              <div className="scale-75 origin-top-left w-[133.33%] h-[133.33%] overflow-hidden">
                <DashboardContent version={state.branchkit.activeVersion} />
              </div>
            </div>
          </BrowserFrame>
        </div>
      </div>

      {/* Transparent overlay to block user interaction */}
      <div className="absolute inset-0 z-40 pointer-events-auto" />

      {/* Cursor - above overlay */}
      <FakeCursorElement position={cursor.position} visible={cursor.visible} />
    </div>
  );
}
