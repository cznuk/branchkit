"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { BranchKitProps, VersionInfo } from "../types";
import styles from "./BranchKit.module.css";
import { ComponentSelector, ComponentSelectorDropdown } from "./ComponentSelector";
import { VersionsList } from "./VersionsList";
import { SettingsView } from "./SettingsView";
import { EmptyStateNoComponents } from "./EmptyStateNoComponents";
import { EmptyStateNoConnection } from "./EmptyStateNoConnection";
import { NewVersionButton } from "./NewVersionButton";

// Custom hooks
import { useWebSocketConnection } from "../hooks/useWebSocketConnection";
import { useComponentDiscovery } from "../hooks/useComponentDiscovery";
import { useVersionManagement } from "../hooks/useVersionManagement";
import { usePopoverPosition } from "../hooks/usePopoverPosition";
import { useClickOutside } from "../hooks/useClickOutside";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useVersionKeyboardShortcuts, useDropdownKeyboard } from "../hooks/useKeyboardShortcuts";
import { useDragToCorner } from "../hooks/useDragToCorner";
import { useContainerPositioning } from "../hooks/useContainerPositioning";
import { useElementAnnotations } from "../hooks/useElementAnnotations";
import type { Position } from "../utils/positioning";
import { generateBranchKitPrompt } from "../utils/promptComposer";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import TriggerContent from "./TriggerContent";
import { ActiveView } from "./types";

/**
 * BranchKit - A floating UI component that renders a version picker in the bottom right.
 * It communicates with the branchkit watch server to manage component versions.
 *
 * Add this component to your app root (typically only in development):
 *
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       {process.env.NODE_ENV === "development" && <BranchKit />}
 *     </>
 *   );
 * }
 * ```
 */
export function BranchKit({
  port = 3030,
  className = "",
  style,
  enableElementSelection = true,
  copyTemplate,
}: BranchKitProps) {
  type Toast = {
    id: number;
    kind: "success" | "error" | "info";
    message: string;
  };

  const routePathToCandidates = React.useCallback((routePath: string): string[] => {
    const trimmed = (routePath || "/").split("?")[0].split("#")[0] || "/";
    const segments = trimmed.split("/").filter(Boolean);
    const toPascalCase = (value: string) =>
      value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");

    if (segments.length === 0) {
      return [
        "src/pages/IndexPage.tsx",
        "src/pages/HomePage.tsx",
        "src/app/page.tsx",
        "app/page.tsx",
      ];
    }

    const leaf = segments[segments.length - 1];
    const leafPascal = toPascalCase(leaf);
    const routeDir = segments.join("/");

    return [
      `src/pages/${leafPascal}Page.tsx`,
      `src/pages/${routeDir}/index.tsx`,
      `src/routes/${routeDir}.tsx`,
      `src/app/${routeDir}/page.tsx`,
      `app/${routeDir}/page.tsx`,
    ];
  }, []);

  const [isMounted, setIsMounted] = useState(false);

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isComponentSelectorOpen, setIsComponentSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openPopoverVersion, setOpenPopoverVersion] = useState<string | null>(null);
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);
  const [copiedChanges, setCopiedChanges] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingMutationCount, setPendingMutationCount] = useState(0);

  // Root ref for theme wrapper
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Refs
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const componentSelectorRef = useRef<HTMLDivElement>(null);
  const selectedComponentRef = useRef<string>("");
  const toastIdRef = useRef(0);

  // Settings
  const [theme, setTheme] = useLocalStorage<"light" | "dark" | "system">("branchkit-theme", "system");
  const [position, setPosition] = useLocalStorage<Position>("branchkit-position", "bottom-right");
  const [codeEditor, setCodeEditor] = useLocalStorage<"vscode" | "cursor">(
    "branchkit-code-editor",
    "vscode",
  );
  // const [enableElementAwarePositioning, setEnableElementAwarePositioning] =
  //   useLocalStorage<boolean>("branchkit-element-aware-positioning", false);

  // Container and component selector positioning hook
  const { containerPosition, transformOrigin, componentSelectorPosition } = useContainerPositioning(
    {
      position,
      isComponentSelectorOpen,
      containerRef,
      componentSelectorRef,
      // enableElementAwarePositioning,
    },
  );

  // Drag to corner hook
  const {
    isDragging,
    resetDrag,
    dragEnabled,
    dragControls,
    handlePointerDown,
    handleDragStart,
    handleDragEnd,
  } = useDragToCorner({
    isOpen,
    containerRef,
    setPosition,
  });

  // Component discovery hook
  const { components, mountedComponents, selectedComponent, setSelectedComponent, onComponentsUpdate } =
    useComponentDiscovery({ port });

  // Keep ref updated with current selected component
  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Get current component's versions (includes labels)
  const currentComponent = mountedComponents.find((c) => c.targetId === selectedComponent || c.name === selectedComponent);
  const selectedComponentLabel = currentComponent?.name || selectedComponent;
  const versions: VersionInfo[] = currentComponent?.versions || [];
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const suggestedSetupPath = React.useMemo(
    () => routePathToCandidates(pathname)[0] || null,
    [pathname, routePathToCandidates],
  );
  const batchInitCommand =
    'npx branchkit init --targets "src/pages/**/*.tsx" --targets "src/components/**/*.tsx"';
  const isMutationPending = pendingMutationCount > 0;

  const quoteShellArg = useCallback((value: string) => {
    if (!value) return "''";
    if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
    return `'${value.replace(/'/g, `'"'"'`)}'`;
  }, []);

  const pushToast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, kind === "error" ? 5000 : 2500);
  }, []);

  const beginMutation = useCallback(() => {
    setPendingMutationCount((count) => count + 1);
  }, []);

  const endMutation = useCallback(() => {
    setPendingMutationCount((count) => Math.max(0, count - 1));
  }, []);

  // Helper to get label for a version key
  const getVersionLabel = (key: string): string | undefined => {
    return versions.find((v) => v.key === key)?.label;
  };

  // Version management hook
  const {
    activeVersion,
    setActiveVersion,
    editingVersion,
    renameValue,
    setRenameValue,
    startRename,
    confirmRename,
    cancelRename,
    clearEditingOnError,
    storePendingVersion,
    versionKeys,
  } = useVersionManagement({ selectedComponent, versions });

  // WebSocket connection hook
  const { connectionStatus, sendMessage } = useWebSocketConnection({
    port,
    selectedComponent,
    onComponentsUpdate,
    onVersionAck: ({ version, message, newVersion }) => {
      endMutation();
      let versionToActivate: string | null = null;

      if (message?.includes("duplicated") || message?.includes("created new version")) {
        versionToActivate = version;
      } else if (message?.includes("renamed") && newVersion) {
        versionToActivate = newVersion;
      }

      if (versionToActivate) {
        storePendingVersion(versionToActivate);
      }

      if (message) {
        pushToast("success", message);
      }
    },
    onPromoted: (promotedComponent) => {
      endMutation();
      // Always check localStorage directly and remove if it matches the promoted component
      // This handles cases where state might be stale but localStorage has the value
      const storedValue = localStorage.getItem("branchkit-selected-component");
      const storedComponent = storedValue ? JSON.parse(storedValue) : null;
      const currentSelected = selectedComponentRef.current;

      // Remove if either state or localStorage matches the promoted component
      if (currentSelected === promotedComponent || storedComponent === promotedComponent) {
        // Directly remove from localStorage immediately
        localStorage.removeItem("branchkit-selected-component");
        // Clear state (hook should also handle removal, but we've already done it)
        setSelectedComponent("");
        // Aggressively ensure removal persists - check and remove multiple times
        const ensureRemoval = () => {
          const stored = localStorage.getItem("branchkit-selected-component");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed === promotedComponent) {
                localStorage.removeItem("branchkit-selected-component");
              }
            } catch {
              // If not JSON, check as plain string
              if (stored === promotedComponent) {
                localStorage.removeItem("branchkit-selected-component");
              }
            }
          }
        };
        // Check immediately and after delays to handle any race conditions
        ensureRemoval();
        setTimeout(ensureRemoval, 0);
        setTimeout(ensureRemoval, 50);
        setTimeout(ensureRemoval, 100);
      }
      // Components will be updated automatically via WebSocket
      pushToast("success", `Promoted version for ${promotedComponent}`);
    },
    onError: (message) => {
      endMutation();
      clearEditingOnError();
      pushToast("error", message);
    },
  });

  // Popover positioning hook
  const { popoverPositions, setPopoverTriggerRef, setPopoverDropdownRef } = usePopoverPosition({
    openPopoverVersion,
  });
  const {
    annotations,
    globalPrompt,
    setGlobalPrompt,
    isSelecting,
    setIsSelecting,
    updateNote,
    removeAnnotation,
    clearAnnotations,
    addFullPageAnnotation,
    mappedCount,
    unmatchedCount,
  } = useElementAnnotations({
    enabled: isMounted && enableElementSelection,
    pathname,
  });

  // Keyboard shortcuts for version switching
  useVersionKeyboardShortcuts({
    versionKeys,
    activeVersion,
    setActiveVersion,
  });

  // Dropdown keyboard navigation
  useDropdownKeyboard({
    isOpen,
    containerRef,
    triggerRef,
    openPopoverVersion,
    isComponentSelectorOpen,
    editingVersion,
    onClosePopover: () => setOpenPopoverVersion(null),
    onCloseComponentSelector: () => setIsComponentSelectorOpen(false),
    onCancelRename: cancelRename,
    onClose: () => {
      setIsOpen(false);
      setIsSettingsOpen(false);
    },
  });

  // Click outside handling for main dropdown
  // Note: ComponentSelectorDropdown and VersionActionMenu handle their own click-outside
  useClickOutside({
    isActive: isOpen && !isSelecting,
    refs: [triggerRef, containerRef],
    onClickOutside: useCallback(() => {
      if (editingVersion) {
        cancelRename();
      }
      setIsOpen(false);
      setIsSettingsOpen(false);
      setIsComponentSelectorOpen(false);
    }, [editingVersion, cancelRename]),
    additionalCheck: useCallback((target: Node) => {
      // Check if clicking inside component selector dropdown (portaled outside container)
      if (componentSelectorRef.current?.contains(target)) {
        return true;
      }
      // Check if clicking inside popover elements (portaled outside container)
      const popoverElements = document.querySelectorAll("[data-popover-dropdown]");
      for (const el of popoverElements) {
        if (el.contains(target)) return true;
      }
      return false;
    }, []),
  });

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setOpenPopoverVersion(null);
    setIsComponentSelectorOpen(false);
    if (editingVersion) {
      cancelRename();
    }
    if (isSelecting) {
      setIsSelecting(false);
    }
  }, [selectedComponent, cancelRename, editingVersion, isSelecting, setIsSelecting]);

  // Action handlers
  const handleDuplicateVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutationPending) {
      pushToast("info", "Please wait for the current action to finish.");
      return;
    }
    beginMutation();
    const sent = sendMessage("duplicate_version", { version });
    if (!sent) endMutation();
  };

  const handleDeleteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutationPending) {
      pushToast("info", "Please wait for the current action to finish.");
      return;
    }
    if (!window.confirm(`Delete ${formatVersionLabel(version)}?\n\nThis removes that version file.`)) {
      return;
    }
    beginMutation();
    const sent = sendMessage("delete_version", { version });
    if (!sent) endMutation();
  };

  const handleNewVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutationPending) {
      pushToast("info", "Please wait for the current action to finish.");
      return;
    }
    beginMutation();
    const sent = sendMessage("new_version", {});
    if (!sent) endMutation();
  };

  const handleRenameVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startRename(version);
  };

  const handleConfirmRename = useCallback(
    (version: string) => {
      const newLabel = confirmRename(version);
      if (newLabel !== null) {
        if (isMutationPending) {
          pushToast("info", "Please wait for the current action to finish.");
          return;
        }
        beginMutation();
        const sent = sendMessage("rename_label", {
          version,
          newLabel,
        });
        if (!sent) endMutation();
      }
    },
    [confirmRename, sendMessage, isMutationPending, pushToast, beginMutation, endMutation],
  );

  const handlePromoteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const label = getVersionLabel(version) || formatVersionLabel(version);
    if (
      window.confirm(
        `Are you sure you want to promote version ${label}?\n\nThis will:\n- Replace the main component with this version\n- Remove all versioning scaffolding\n- This action cannot be undone`,
      )
    ) {
      if (isMutationPending) {
        pushToast("info", "Please wait for the current action to finish.");
        return;
      }
      beginMutation();
      const sent = sendMessage("promote_version", { version });
      if (!sent) endMutation();
      setOpenPopoverVersion(null);
    }
  };

  const handleTogglePopover = (version: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenPopoverVersion(openPopoverVersion === version ? null : version);
  };

  const handleOpenInEditor = async (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:${port}/open-in-editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          targetId: selectedComponent,
          component: selectedComponent,
          editor: codeEditor,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to open file in editor");
      }
      pushToast("success", `Opened ${formatVersionLabel(version)} in ${codeEditor}`);
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : `Could not open ${formatVersionLabel(version)} in ${codeEditor}`,
      );
    }
    setOpenPopoverVersion(null);
  };

  // Format version label (v1 -> V1, v1_2 -> V1.2)
  const formatVersionLabel = (version: string) => {
    return version.replace(/^v/, "V").replace(/_/g, ".");
  };

  const handleCopyToClipboard = useCallback(
    async (command: string, commandId: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(command);
        setCopiedCommandId(commandId);
        setTimeout(
          () => setCopiedCommandId((current) => (current === commandId ? null : current)),
          2000,
        );
        pushToast("success", successMessage);
      } catch {
        pushToast("error", "Could not copy command to clipboard");
      }
    },
    [pushToast],
  );

  const handleCopyCommand = useCallback(async () => {
    const command = suggestedSetupPath
      ? `npx branchkit init ${quoteShellArg(suggestedSetupPath)}`
      : "npx branchkit init <path-to-file>";
    await handleCopyToClipboard(command, "page-init", "Copied page setup command");
  }, [suggestedSetupPath, quoteShellArg, handleCopyToClipboard]);

  const handleCopyBatchInitCommand = useCallback(async () => {
    await handleCopyToClipboard(batchInitCommand, "batch-init", "Copied batch setup command");
  }, [batchInitCommand, handleCopyToClipboard]);

  const handleCopyWatchCommand = useCallback(async () => {
    await handleCopyToClipboard("npx branchkit watch", "watch", "Copied watch command");
  }, [handleCopyToClipboard]);

  const handleCopyChanges = useCallback(async () => {
    const generatedAt = new Date().toISOString();
    const url = typeof window !== "undefined" ? window.location.href : "";
    const targetVersions = Object.fromEntries(
      mountedComponents.map((component) => [
        component.targetId,
        component.versions.map((version) => version.key),
      ]),
    );
    const context = {
      annotations,
      targetVersions,
      globalPrompt,
      pathname,
      url,
      generatedAt,
    };
    const output = copyTemplate ? copyTemplate(context) : generateBranchKitPrompt(context);

    try {
      await navigator.clipboard.writeText(output);
      setCopiedChanges(true);
      setTimeout(() => setCopiedChanges(false), 2000);
      pushToast("success", "Copied BranchKit prompt");
    } catch {
      pushToast("error", "Could not copy BranchKit prompt");
    }
  }, [annotations, mountedComponents, globalPrompt, pathname, copyTemplate, pushToast]);

  // Create or get root element for theming
  useEffect(() => {
    if (!isMounted) return;

    let rootEl = document.getElementById("branchkit-root") as HTMLDivElement | null;
    if (!rootEl) {
      rootEl = document.createElement("div");
      rootEl.id = "branchkit-root";
      rootEl.className = styles.branchkitRoot || "branchkitRoot";
      document.body.appendChild(rootEl);
    }
    rootRef.current = rootEl;

    // Update theme attribute
    rootEl.setAttribute("data-theme", theme);

    return () => {
      // Don't remove root element on unmount as it might be used by other instances
    };
  }, [isMounted, theme, styles]);

  // Determine if we're connected to the WebSocket server
  const isConnected = connectionStatus === "connected";

  // Determine active view based on current state
  const activeView: ActiveView = React.useMemo(() => {
    if (!isOpen) {
      // When closed, determine if we show icon-only or icon+label
      const hasComponents = mountedComponents.length > 0;

      // Show icon+label when has components (works offline too now)
      if (hasComponents) {
        return "closed-trigger-label";
      }

      // Otherwise show icon-only (connecting or no components)
      return "closed-trigger-icon";
    }

    // When dropdown is open, determine which view to show
    if (isSettingsOpen) {
      return "opened-settings";
    }

    if (mountedComponents.length === 0) {
      return "opened-no-components";
    }

    // Show version list even when disconnected - actions will be disabled
    return "opened-version-list";
  }, [isOpen, isSettingsOpen, mountedComponents.length]);

  // Don't render until mounted on client (prevents hydration mismatch)
  if (!isMounted) {
    return null;
  }

  const portalRoot = rootRef.current || document.getElementById("branchkit-root");
  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <>
      {toasts.length > 0 && (
        <div className={styles.toastStack} aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${
                toast.kind === "error"
                  ? styles.toastError
                  : toast.kind === "success"
                    ? styles.toastSuccess
                    : styles.toastInfo
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
      <motion.div
        ref={containerRef}
        className={`${styles.container} ${!isOpen ? styles.containerClosed : ""} ${className}`}
        layout
        drag={dragEnabled && !isOpen}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragListener={false}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={resetDrag ? { x: 0, y: 0 } : {}}
        style={{
          borderRadius: isOpen ? 12 : 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          ...containerPosition,
          transformOrigin,
          // Don't set cursor here - we handle it on document.body to override CSS
          touchAction: !isOpen ? "none" : "auto",
          ...style,
        }}
        transition={{
          layout: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
          x: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
          y: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {activeView === "closed-trigger-icon" || activeView === "closed-trigger-label" ? (
            <motion.button
              key="trigger"
              suppressHydrationWarning
              ref={triggerRef}
              onClick={(e) => {
                // Prevent opening if we just finished dragging
                if (isDragging) {
                  e.preventDefault();
                  return;
                }
                setIsOpen(true);
                setIsSettingsOpen(false);
              }}
              aria-label="Select UI version"
              aria-expanded={false}
              aria-haspopup="listbox"
              className={`${styles.trigger} ${
                !selectedComponent || versions.length === 0 ? styles.triggerIconOnly : ""
              }`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: ANIMATION_EASING,
              }}
              draggable={false}
            >
              <TriggerContent
                hasSelection={!!selectedComponent && versions.length > 0}
                selectedComponent={selectedComponentLabel}
                activeVersion={activeVersion}
                activeVersionLabel={getVersionLabel(activeVersion)}
                formatVersionLabel={formatVersionLabel}
              />
            </motion.button>
          ) : (
            <motion.div
              key="dropdown"
              ref={dropdownRef}
              role="listbox"
              aria-label="UI version options"
              className={styles.dropdown}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: ANIMATION_EASING,
              }}
            >
              {activeView === "opened-no-components" &&
                (isConnected ? (
                  <EmptyStateNoComponents
                    onCopyCommand={handleCopyCommand}
                    onCopyBatchCommand={handleCopyBatchInitCommand}
                    copiedCommandId={copiedCommandId}
                    pathname={pathname}
                    projectTargetCount={components.length}
                    suggestedPath={suggestedSetupPath}
                  />
                ) : (
                  <EmptyStateNoConnection
                    onCopyCommand={handleCopyWatchCommand}
                    onCopyBatchCommand={handleCopyBatchInitCommand}
                    copiedCommandId={copiedCommandId}
                  />
                ))}

              {activeView === "opened-settings" && (
                <SettingsView
                  onBack={() => setIsSettingsOpen(false)}
                  theme={theme}
                  setTheme={setTheme}
                  position={position}
                  setPosition={setPosition}
                  codeEditor={codeEditor}
                  setCodeEditor={setCodeEditor}
                  // enableElementAwarePositioning={enableElementAwarePositioning}
                  // setEnableElementAwarePositioning={setEnableElementAwarePositioning}
                />
              )}

              {activeView === "opened-version-list" && (
                <>
                  {/* Component selector */}
                  <ComponentSelector
                    selectedComponentLabel={selectedComponentLabel}
                    onToggle={() => setIsComponentSelectorOpen(!isComponentSelectorOpen)}
                    onSettingsClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsOpen(true);
                    }}
                  />

                  <div className={styles.divider} />

                  <NewVersionButton onClick={handleNewVersion} disabled={!isConnected || isMutationPending} />

                  <div className={styles.divider} />

                  {/* Versions list */}
                  <VersionsList
                    versions={versions}
                    activeVersion={activeVersion}
                    editingVersion={editingVersion}
                    renameValue={renameValue}
                    formatVersionLabel={formatVersionLabel}
                    openPopoverVersion={openPopoverVersion}
                    popoverPositions={popoverPositions}
                    isConnected={isConnected}
                    onSelectVersion={(version) => {
                      setActiveVersion(version);
                    }}
                    onDuplicateVersion={handleDuplicateVersion}
                    onTogglePopover={handleTogglePopover}
                    onPromoteVersion={handlePromoteVersion}
                    onOpenInEditor={handleOpenInEditor}
                    onDeleteVersion={handleDeleteVersion}
                    onRenameVersion={handleRenameVersion}
                    onRenameValueChange={setRenameValue}
                    onConfirmRename={handleConfirmRename}
                    onCancelRename={cancelRename}
                    setPopoverTriggerRef={setPopoverTriggerRef}
                    setPopoverDropdownRef={setPopoverDropdownRef}
                  />

                  {isMutationPending && (
                    <div className={styles.inlineStatusMessage}>Applying change...</div>
                  )}

                  {enableElementSelection && (
                    <>
                      <div className={styles.divider} />
                      <div className={styles.annotationPanel}>
                        <div className={styles.annotationPanelHeader}>
                          <button
                            className={`${styles.annotationActionButton} ${isSelecting ? styles.annotationActionButtonActive : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setIsSelecting(!isSelecting);
                            }}
                            type="button"
                          >
                            {isSelecting ? "Stop selecting" : "Select elements"}
                          </button>
                          <button
                            className={styles.annotationActionButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              addFullPageAnnotation(selectedComponent);
                            }}
                            type="button"
                          >
                            Select page
                          </button>
                        </div>

                        <div className={styles.annotationPanelHeader}>
                          <button
                            className={styles.annotationPrimaryButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCopyChanges();
                            }}
                            type="button"
                            disabled={annotations.length === 0}
                          >
                            {copiedChanges ? "Copied" : "Copy changes"}
                          </button>
                        </div>
                        <div className={styles.annotationPanelHeader}>
                          <button
                            className={styles.annotationClearButtonTop}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              clearAnnotations();
                              setGlobalPrompt("");
                            }}
                            disabled={annotations.length === 0 && !globalPrompt.trim()}
                          >
                            Clear
                          </button>
                        </div>

                        <textarea
                          className={styles.annotationGlobalPrompt}
                          placeholder="Add prompt for all selected targets..."
                          value={globalPrompt}
                          onChange={(event) => setGlobalPrompt(event.target.value)}
                        />

                        <div className={styles.annotationSummary}>
                          {annotations.length} selected · {mappedCount} mapped · {unmatchedCount} unmatched
                        </div>

                        {annotations.length > 0 ? (
                          <div className={styles.annotationList}>
                            {annotations.map((item) => (
                              <div key={item.id} className={styles.annotationItem}>
                                <div className={styles.annotationItemHeader}>
                                  <span className={styles.annotationItemTarget}>
                                    {item.targetName || "Unmatched element"}
                                  </span>
                                  <button
                                    className={styles.annotationRemoveButton}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeAnnotation(item.id);
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className={styles.annotationItemMeta}>
                                  {item.targetId ? (
                                    <>
                                      <code>{item.targetId}</code>
                                      {item.activeVersion ? ` · ${item.activeVersion}` : ""}
                                    </>
                                  ) : (
                                    "No BranchKit mapping for this selection"
                                  )}
                                </div>
                                <div className={styles.annotationItemMeta}>
                                  <code>{item.selector}</code>
                                </div>
                                <textarea
                                  className={styles.annotationNote}
                                  placeholder="Target-specific request..."
                                  value={item.note}
                                  onChange={(event) => updateNote(item.id, event.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.annotationEmpty}>
                            Select elements, add notes, then copy a BranchKit-ready prompt.
                          </div>
                        )}

                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {/* Component selector dropdown */}
      {activeView !== "closed-trigger-icon" && activeView !== "closed-trigger-label" && (
        <ComponentSelectorDropdown
          mountedComponents={mountedComponents}
          selectedComponent={selectedComponent}
          isOpen={isComponentSelectorOpen}
          position={componentSelectorPosition}
          onSelect={(targetId) => {
            setSelectedComponent(targetId);
            setIsComponentSelectorOpen(false);
          }}
          onClose={() => setIsComponentSelectorOpen(false)}
          componentSelectorRef={componentSelectorRef}
          isConnected={isConnected}
        />
      )}
    </>,
    portalRoot,
  );
}
