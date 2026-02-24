import React from "react";

/**
 * ExplainerAnimation Component - Narrative Flow
 * 
 * This component demonstrates the BranchKit workflow through an animated sequence:
 * 
 * 1. Mouse moves and opens BranchKit UI
 *    - Cursor starts in the middle of the browser frame
 *    - Moves smoothly to the BranchKit button in the bottom right
 *    - Clicks to open the dropdown
 * 
 * 2. Hovers over v3 and clicks the fork icon button
 *    - Cursor moves to hover over version v3 in the versions list
 *    - Cursor clicks the small fork icon button (matching VersionItem.tsx style)
 *    - This triggers creation of a new version (v4)
 * 
 * 3. New version file appears in file system
 *    - DashboardContent.v4.tsx appears in the code editor sidebar
 *    - File appears with a smooth animation
 * 
 * 4. Version appears in BranchKit versions list
 *    - After a slight delay, v4 appears in the BranchKit dropdown versions list
 *    - Version appears with a smooth animation
 * 
 * 5. Mouse moves to code editor and selects v4 file
 *    - Cursor moves from the browser to the code editor
 *    - Hovers over DashboardContent.v4.tsx in the sidebar
 *    - Clicks to select the file
 * 
 * 6. Editor shows the v4 file content
 *    - The editor tab updates to show DashboardContent.v4.tsx
 *    - Editor content updates to show the file
 */

// Card Component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card text-card-foreground rounded-lg border border-border p-6 ${className}`}
    >
      {children}
    </div>
  );
}

// Browser Frame Component
function BrowserFrame({
  children,
  branchkit,
  cursorRef,
}: {
  children: React.ReactNode;
  branchkit?: React.ReactNode;
  cursorRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={cursorRef}
      className="w-full h-full bg-white dark:bg-stone-900 rounded-lg border border-border overflow-hidden shadow-lg relative"
    >
      {/* Browser Header */}
      <div className="h-8 bg-stone-100 dark:bg-stone-800 border-b border-border flex items-center px-3 gap-2">
        {/* Window Controls - Three Dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
        </div>
        {/* Address Bar */}
        <div className="flex-1 mx-4 h-5 bg-white dark:bg-stone-900 border border-border rounded text-[10px] flex items-center px-2 text-muted-foreground">
          localhost:5173
        </div>
      </div>
      {/* Browser Content */}
      <div className="h-[calc(100%-2rem)] overflow-auto relative">
        {children}
        {branchkit}
      </div>
    </div>
  );
}

// Code Editor Component
function CodeEditor({
  selectedFile,
  showV4,
  onFileSelect,
}: {
  selectedFile?: string;
  showV4?: boolean;
  onFileSelect?: (fileName: string) => void;
}) {
  // Generate placeholder rows
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

  const currentFile = selectedFile || "DashboardContent.v3.tsx";

  return (
    <div className="w-full h-full bg-card rounded-lg border border-border overflow-hidden shadow-lg flex flex-col">
      {/* Top Toolbar */}
      <div className="h-8 bg-muted border-b border-border flex items-center px-3">
        {/* Three Dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
          <div className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-600"></div>
        </div>
        {/* Centered App Name */}
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] text-muted-foreground font-medium">Cursor</span>
        </div>
        {/* Spacer for balance */}
        <div className="w-12"></div>
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
              <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">
                DashboardContent.v1.tsx
              </div>
              <div className="pl-6 pr-1.5 py-0.5 text-[10px] text-muted-foreground">
                DashboardContent.v2.tsx
              </div>
              <div
                className={`pl-6 pr-1.5 py-0.5 text-[10px] cursor-pointer ${
                  currentFile === "DashboardContent.v3.tsx"
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground"
                }`}
                onClick={() => onFileSelect?.("DashboardContent.v3.tsx")}
              >
                DashboardContent.v3.tsx
              </div>
              {showV4 && (
                <div
                  className={`pl-6 pr-1.5 py-0.5 text-[10px] cursor-pointer transition-all duration-300 ${
                    currentFile === "DashboardContent.v4.tsx"
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => onFileSelect?.("DashboardContent.v4.tsx")}
                  style={{
                    animation: showV4 ? "fadeIn 0.3s ease-in" : "none",
                  }}
                >
                  DashboardContent.v4.tsx
                </div>
              )}
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
              <span>{currentFile}</span>
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

// Dashboard Content Component - Skeleton Placeholder
function DashboardContent() {
  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="p-4">
          <div className="h-2.5 w-32 bg-muted rounded  mb-2"></div>
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-muted rounded "></div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-muted rounded "></div>
              <div className="h-5 w-28 bg-muted rounded "></div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="px-4 border-b border-border flex gap-4">
          <div className="h-6 w-16 bg-muted rounded "></div>
          <div className="h-6 w-20 bg-muted rounded "></div>
          <div className="h-6 w-16 bg-muted rounded "></div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-4 overflow-auto">
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-2.5 w-32 bg-muted rounded "></div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 bg-muted rounded "></div>
                  <div className="flex items-end gap-0.5 h-4">
                    <div className="w-1 h-3 bg-muted rounded "></div>
                    <div className="w-1 h-3 bg-muted rounded "></div>
                    <div className="w-1 h-2 bg-muted rounded "></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid Skeleton */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <div className="space-y-2">
                  <div>
                    <div className="h-3 w-32 bg-muted rounded  mb-0.5"></div>
                    <div className="h-2.5 w-48 bg-muted rounded  mt-2"></div>
                  </div>
                  <div className="h-24 bg-muted rounded "></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Animation state type
type AnimationState = {
  cursorPosition: { x: number; y: number };
  branchkitOpen: boolean;
  timestamp: number;
};

// Mini BranchKit Component - Styled to match BranchKit but simplified
function MiniBranchKit({
  onStateChange,
  isControlled,
  controlledOpen,
  showV4,
  hoveredVersion,
  onForkVersion,
}: {
  onStateChange?: (isOpen: boolean) => void;
  isControlled?: boolean;
  controlledOpen?: boolean;
  showV4?: boolean;
  hoveredVersion?: string | null;
  onForkVersion?: (version: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const versionRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const forkButtonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  const actualIsOpen = isControlled ? controlledOpen ?? false : isOpen;

  const handleToggle = React.useCallback(() => {
    const newState = !actualIsOpen;
    if (!isControlled) {
      setIsOpen(newState);
    }
    onStateChange?.(newState);
  }, [actualIsOpen, isControlled, onStateChange]);
  const [activeVersion, setActiveVersion] = React.useState("v2");

  // Mock versions for DashboardContent - start with 3, add v4 when showV4 is true
  const versions = React.useMemo(() => {
    const baseVersions = [
      { key: "v1", label: "" },
      { key: "v2", label: "" },
      { key: "v3", label: "" },
    ];
    if (showV4) {
      return [...baseVersions, { key: "v4", label: "" }];
    }
    return baseVersions;
  }, [showV4]);

  const formatVersionLabel = (version: string) => {
    return version.replace(/^v/, "V").replace(/_/g, ".");
  };

  const handleClickOutside = React.useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    const container = document.querySelector("[data-mini-branchkit]");
    if (container && !container.contains(target)) {
      setIsOpen(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  return (
    <div
      data-mini-branchkit
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <div
        className={`bg-[#262626] dark:bg-[#262626] border border-[#2f2f2f] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden pointer-events-auto transition-all duration-200 ${
          isOpen ? "rounded-xl" : "rounded-xl"
        }`}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {!actualIsOpen ? (
          <button
            ref={buttonRef}
            onClick={handleToggle}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-white cursor-pointer bg-transparent border-none whitespace-nowrap hover:bg-[rgba(255,255,255,0.1)]"
            style={{
              height: "24px",
            }}
          >
            {/* Fork Icon (Git Branch) */}
            <svg
              className="text-[#22c55e]"
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
            {/* Component Name */}
            <span className="font-medium text-white whitespace-nowrap text-xs">
              DashboardContent
            </span>
            {/* Version */}
            <span className="text-[#a3a3a3] whitespace-nowrap text-xs">
              {formatVersionLabel(activeVersion)}
            </span>
          </button>
        ) : (
          <div className="p-0.5 flex flex-col" style={{ minWidth: "auto" }}>
            {/* Component Selector */}
            <div className="flex items-center justify-between px-1.5 py-1">
              <button
                className="flex items-center gap-1 text-xs text-white bg-transparent border-none cursor-pointer rounded hover:bg-[rgba(255,255,255,0.1)] flex-1 justify-between"
                style={{ height: "24px" }}
              >
                <span className="font-medium text-white text-xs">DashboardContent</span>
                <svg
                  className="w-3 h-3 text-[#a3a3a3]"
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

            {/* Divider */}
            <div className="h-px bg-[#2f2f2f] my-0.5"></div>

            {/* Versions List */}
            <div className="flex flex-col">
              {versions
                .slice()
                .reverse()
                .map((versionInfo) => {
                  const { key } = versionInfo;
                  const isSelected = key === activeVersion;
                  const isHovered = hoveredVersion === key;
                  const formattedVersion = formatVersionLabel(key);
                  const isNewVersion = showV4 && key === "v4";

                  return (
                    <div
                      key={key}
                      data-key={key}
                      ref={(el) => {
                        if (el) versionRefs.current.set(key, el);
                      }}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setActiveVersion(key);
                        handleToggle();
                      }}
                      className={`flex items-center gap-1 px-1.5 py-1 text-xs text-white cursor-pointer rounded relative transition-all duration-200 ${
                        isHovered ? "bg-[rgba(255,255,255,0.15)]" : "hover:bg-[rgba(255,255,255,0.1)]"
                      }`}
                      style={{
                        height: "24px",
                        minHeight: "24px",
                        animation: isNewVersion ? "fadeIn 0.3s ease-in" : "none",
                      }}
                    >
                      {/* Checkmark */}
                      <div className="w-3 h-3 flex items-center justify-center">
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
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
                      {/* Version Label */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-white text-xs">{formattedVersion}</span>
                      </div>
                      {/* Fork Icon Button - only show for v1, v2, v3 (not v4) */}
                      {key !== "v4" && (
                        <div
                          data-actions
                          className="flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            ref={(el) => {
                              if (el) forkButtonRefs.current.set(key, el);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onForkVersion?.(key);
                            }}
                            className="w-4 h-4 flex items-center justify-center text-[#a3a3a3] hover:text-white rounded transition-colors"
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

            {/* Divider */}
            <div className="h-px bg-[#2f2f2f] my-0.5"></div>

            {/* New Version Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle new version creation
              }}
              className="flex items-center gap-1 px-1.5 py-1 text-xs text-white bg-transparent border-none cursor-pointer rounded hover:bg-[rgba(255,255,255,0.1)]"
              style={{ height: "24px" }}
            >
              <div className="w-3 h-3 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-white"
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
              <span className="text-white text-xs">New version</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Animation step type
type AnimationStep =
  | "idle"
  | "move-to-branchkit"
  | "click-branchkit"
  | "hover-v3"
  | "click-fork-icon"
  | "wait-for-file"
  | "wait-for-version"
  | "move-to-editor"
  | "click-v4-file"
  | "complete";

// Fake Cursor Component
function FakeCursor({
  containerRef,
  editorContainerRef,
  browserContainerRef,
  onStateChange,
  isPlaying,
  onComplete,
  onHoverVersion,
  onForkVersion,
  onFileSelect,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  editorContainerRef?: React.RefObject<HTMLDivElement>;
  browserContainerRef?: React.RefObject<HTMLDivElement>;
  onStateChange?: (state: AnimationState) => void;
  isPlaying?: boolean;
  onComplete?: () => void;
  onHoverVersion?: (version: string | null) => void;
  onForkVersion?: () => void;
  onFileSelect?: (fileName: string) => void;
}) {
  const [position, setPosition] = React.useState({ x: 50, y: 50 }); // Start in middle (percentage)
  const cursorRef = React.useRef<HTMLDivElement>(null);
  const [branchkitOpen, setUiforkOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<AnimationStep>("idle");

  // Helper function to animate cursor movement
  const animateTo = React.useCallback(
    (
      targetX: number,
      targetY: number,
      duration: number,
      containerRect: DOMRect,
      onArrive?: () => void,
    ) => {
      return new Promise<void>((resolve) => {
        const startX = (position.x / 100) * containerRect.width;
        const startY = (position.y / 100) * containerRect.height;
        let animationFrameId: number;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Smooth easing function (ease-in-out-cubic)
          const eased =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          const currentX = startX + (targetX - startX) * eased;
          const currentY = startY + (targetY - startY) * eased;

          const currentPos = {
            x: (currentX / containerRect.width) * 100,
            y: (currentY / containerRect.height) * 100,
          };

          setPosition(currentPos);
          onStateChange?.({
            cursorPosition: currentPos,
            branchkitOpen,
            timestamp: Date.now(),
          });

          if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
          } else {
            onArrive?.();
            resolve();
          }
        };

        animationFrameId = requestAnimationFrame(animate);
      });
    },
    [position, branchkitOpen, onStateChange],
  );

  // Reset position when replaying
  React.useEffect(() => {
    if (isPlaying && (currentStep === "idle" || currentStep === "complete")) {
      setPosition({ x: 50, y: 50 });
      setUiforkOpen(false);
      // Small delay to ensure state is reset before starting animation
      setTimeout(() => {
        setCurrentStep("move-to-branchkit");
      }, 50);
    } else if (!isPlaying) {
      setCurrentStep("idle");
    }
  }, [isPlaying, currentStep]);

  React.useEffect(() => {
    if (!isPlaying || currentStep !== "move-to-branchkit") return;

    const container = containerRef.current;
    const editorContainer = editorContainerRef?.current;
    if (!container) return;

    // Wait for layout to settle
    const timeout = setTimeout(async () => {
      setCurrentStep("move-to-branchkit");

      // Step 1: Move to BranchKit button and click
      const browserContainer = browserContainerRef?.current;
      if (!browserContainer) return;

      const branchkitButton = browserContainer.querySelector(
        "[data-mini-branchkit] button",
      ) as HTMLButtonElement;
      if (!branchkitButton) return;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = branchkitButton.getBoundingClientRect();

      const startX = containerRect.width / 2;
      const startY = containerRect.height / 2;
      setPosition({
        x: (startX / containerRect.width) * 100,
        y: (startY / containerRect.height) * 100,
      });

      const targetX = buttonRect.left - containerRect.left + buttonRect.width / 2;
      const targetY = buttonRect.top - containerRect.top + buttonRect.height / 2;

      await animateTo(targetX, targetY, 2500, containerRect);

      // Step 2: Click BranchKit button
      setCurrentStep("click-branchkit");
      await new Promise((resolve) => setTimeout(resolve, 200));
      branchkitButton.click();
      setUiforkOpen(true);
      onStateChange?.({
        cursorPosition: {
          x: (targetX / containerRect.width) * 100,
          y: (targetY / containerRect.height) * 100,
        },
        branchkitOpen: true,
        timestamp: Date.now(),
      });

      // Step 3: Wait for dropdown to open, then hover over v3
      await new Promise((resolve) => setTimeout(resolve, 300));
      setCurrentStep("hover-v3");

      // Find v3 version item
      const v3VersionItem = browserContainer.querySelector(
        '[data-mini-branchkit] [data-key="v3"]',
      ) as HTMLElement;
      if (v3VersionItem) {
        const v3Rect = v3VersionItem.getBoundingClientRect();
        const v3X = v3Rect.left - containerRect.left + v3Rect.width / 2;
        const v3Y = v3Rect.top - containerRect.top + v3Rect.height / 2;

        await animateTo(v3X, v3Y, 1000, containerRect);
        onHoverVersion?.("v3");
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Step 4: Click fork icon button
        setCurrentStep("click-fork-icon");
        const forkButton = v3VersionItem.querySelector("button") as HTMLButtonElement;
        if (forkButton) {
          const forkRect = forkButton.getBoundingClientRect();
          const forkX = forkRect.left - containerRect.left + forkRect.width / 2;
          const forkY = forkRect.top - containerRect.top + forkRect.height / 2;

          await animateTo(forkX, forkY, 800, containerRect);
          await new Promise((resolve) => setTimeout(resolve, 200));
          forkButton.click();
          onForkVersion?.();
        }

        // Step 5: Wait for file to appear in sidebar
        setCurrentStep("wait-for-file");
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Step 6: Wait for version to appear in list
        setCurrentStep("wait-for-version");
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Step 7: Move to code editor
        setCurrentStep("move-to-editor");
        if (editorContainer) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          const editorRect = editorContainer.getBoundingClientRect();
          const v4FileItem = editorContainer.querySelector(
            'div[class*="DashboardContent.v4"]',
          ) as HTMLElement;

          if (v4FileItem) {
            const fileRect = v4FileItem.getBoundingClientRect();
            // Calculate position relative to main container
            const relativeX = fileRect.left - containerRect.left + fileRect.width / 2;
            const relativeY = fileRect.top - containerRect.top + fileRect.height / 2;

            await animateTo(relativeX, relativeY, 2000, containerRect);

            // Step 8: Click v4 file
            setCurrentStep("click-v4-file");
            await new Promise((resolve) => setTimeout(resolve, 200));
            v4FileItem.click();
            onFileSelect?.("DashboardContent.v4.tsx");
          }
        }

        // Step 9: Complete
        setCurrentStep("complete");
        await new Promise((resolve) => setTimeout(resolve, 300));
        onComplete?.();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    isPlaying,
    currentStep,
    containerRef,
    editorContainerRef,
    animateTo,
    onStateChange,
    onHoverVersion,
    onForkVersion,
    onFileSelect,
    onComplete,
  ]);

  if (!containerRef.current) return null;

  return (
    <div
      ref={cursorRef}
      className="absolute pointer-events-none z-50"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(2px, 2px)", // macOS cursor hotspot offset
        pointerEvents: "none",
        willChange: "transform",
      }}
    >
      {/* macOS cursor SVG from provided file */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 " />
        <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 " />
        <rect
          x="12.5"
          y="13.6"
          transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)"
          width="2"
          height="8"
        />
        <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 " />
      </svg>
    </div>
  );
}

// Replay Controls Component
function ReplayControls({ onReplay }: { onReplay: () => void }) {
  return (
    <button
      onClick={onReplay}
      className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
      aria-label="Replay"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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

// Main Explainer Animation Component
export default function ExplainerAnimation() {
  const browserFrameRef = React.useRef<HTMLDivElement>(null);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true); // Start playing automatically
  const [animationState, setAnimationState] = React.useState<AnimationState | null>(null);
  const [branchkitOpen, setUiforkOpen] = React.useState(false);
  const [showV4, setShowV4] = React.useState(false);
  const [hoveredVersion, setHoveredVersion] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState("DashboardContent.v3.tsx");

  const handleReplay = React.useCallback(() => {
    setIsPlaying(false);
    setUiforkOpen(false);
    setShowV4(false);
    setHoveredVersion(null);
    setSelectedFile("DashboardContent.v3.tsx");
    setAnimationState(null);
    // Reset and replay after a brief delay
    setTimeout(() => {
      setIsPlaying(true);
    }, 100);
  }, []);

  const handleStateChange = React.useCallback((state: AnimationState) => {
    setAnimationState(state);
    setUiforkOpen(state.branchkitOpen);
  }, []);

  const handleAnimationComplete = React.useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleForkVersion = React.useCallback(() => {
    // Show v4 file in sidebar
    setTimeout(() => {
      setShowV4(true);
    }, 300);
  }, []);

  const mainContainerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={mainContainerRef} className="w-full aspect-video bg-muted rounded-lg border border-border p-4 overflow-hidden relative">
      <ReplayControls onReplay={handleReplay} />
      <div className="w-full h-full grid grid-cols-2 gap-4 pt-12">
        {/* Left: Code Editor */}
        <div ref={editorContainerRef} className="h-full">
          <CodeEditor
            selectedFile={selectedFile}
            showV4={showV4}
            onFileSelect={setSelectedFile}
          />
        </div>
        {/* Right: Browser Frame with Dashboard */}
        <div className="h-full relative">
          <BrowserFrame
            cursorRef={browserFrameRef}
            branchkit={
              <div
                className="absolute bottom-4 right-4 z-10 pointer-events-none"
                style={{ maxWidth: "calc(100% - 2rem)" }}
              >
                <MiniBranchKit
                  isControlled={true}
                  controlledOpen={branchkitOpen}
                  onStateChange={setUiforkOpen}
                  showV4={showV4}
                  hoveredVersion={hoveredVersion}
                  onForkVersion={handleForkVersion}
                />
              </div>
            }
          >
            <div className="bg-stone-50 dark:bg-stone-950 min-h-full overflow-auto relative">
              <div className="scale-75 origin-top-left w-[133.33%] h-[133.33%]">
                <DashboardContent />
              </div>
            </div>
          </BrowserFrame>
        </div>
      </div>
      {/* Cursor positioned relative to main container */}
      <FakeCursor
        containerRef={mainContainerRef}
        editorContainerRef={editorContainerRef}
        browserContainerRef={browserFrameRef}
        isPlaying={isPlaying}
        onStateChange={handleStateChange}
        onComplete={handleAnimationComplete}
        onHoverVersion={setHoveredVersion}
        onForkVersion={handleForkVersion}
        onFileSelect={setSelectedFile}
      />
    </div>
  );
}
