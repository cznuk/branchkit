import React from "react";
import { motion } from "motion/react";
import styles from "./BranchKit.module.css";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";
import { GearIcon } from "./icons/GearIcon";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { InfoIcon } from "./icons/InfoIcon";
import type { ComponentInfo } from "../types";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import { useClickOutside } from "../hooks/useClickOutside";

interface ComponentSelectorProps {
  selectedComponentLabel: string;
  onToggle: () => void;
  onSettingsClick: (e: React.MouseEvent) => void;
}

export function ComponentSelector({
  selectedComponentLabel,
  onToggle,
  onSettingsClick,
}: ComponentSelectorProps) {
  return (
    <div className={styles.componentSelectorRow}>
      <button
        data-component-selector
        onClick={onToggle}
        className={`${styles.componentSelector} ${styles.menuItem}`}
      >
        <motion.span
          layoutId="component-name"
          layout="position"
          className={styles.componentSelectorLabel}
          transition={{
            layout: {
              duration: ANIMATION_DURATION,
              ease: ANIMATION_EASING,
            },
          }}
        >
          {selectedComponentLabel || "Select component"}
        </motion.span>
        <ChevronDownIcon className={styles.componentSelectorIcon} />
      </button>
      <button
        onClick={onSettingsClick}
        className={styles.componentSelectorSettings}
        title="Settings"
        aria-label="Open settings"
      >
        <GearIcon className={styles.componentSelectorSettingsIcon} />
      </button>
    </div>
  );
}

export function ComponentSelectorDropdown({
  mountedComponents,
  selectedComponent,
  isOpen,
  position,
  onSelect,
  onClose,
  componentSelectorRef,
  isConnected,
}: {
  mountedComponents: ComponentInfo[];
  selectedComponent: string;
  isOpen: boolean;
  position: { x: number; y: number };
  onSelect: (targetId: string) => void;
  onClose: () => void;
  componentSelectorRef: React.RefObject<HTMLDivElement>;
  isConnected: boolean;
}) {
  // Close dropdown when clicking outside
  useClickOutside({
    isActive: isOpen,
    refs: [componentSelectorRef],
    onClickOutside: onClose,
    // Don't close when clicking the trigger button (it handles its own toggle)
    additionalCheck: (target) => {
      const element = target as Element;
      return !!element.closest?.("[data-component-selector]");
    },
  });

  if (!isOpen) return null;

  return (
    <div
      ref={componentSelectorRef}
      className={styles.componentSelectorDropdown}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        visibility: "hidden",
      }}
    >
      <div className={styles.componentSelectorDropdownTitle}>Forked components/pages</div>
      {mountedComponents.length === 0 ? (
        <div className={styles.emptyState}>No mounted components found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {mountedComponents.map((component) => (
            <button
              key={component.targetId}
              onClick={() => onSelect(component.targetId)}
              className={`${styles.componentSelectorItem} ${styles.menuItem} ${
                component.targetId === selectedComponent ? styles.componentSelectorItemSelected : ""
              }`}
              title={component.path}
            >
              <div className={styles.componentSelectorItemCheckmarkContainer}>
                {component.targetId === selectedComponent && (
                  <CheckmarkIcon className={styles.componentSelectorItemCheckmark} />
                )}
              </div>
              <span className={styles.componentSelectorItemName}>{component.name}</span>
              <span className={styles.componentSelectorItemCount}>{component.versions.length}</span>
            </button>
          ))}
        </div>
      )}
      {isConnected && (
        <div className={styles.componentSelectorDropdownHint}>
          <InfoIcon className={styles.componentSelectorDropdownHintIcon} />
          <span>
            Use <code className={styles.componentSelectorDropdownHintCode}>npx branchkit init</code> to
            iterate on more components/pages
          </span>
        </div>
      )}
    </div>
  );
}
