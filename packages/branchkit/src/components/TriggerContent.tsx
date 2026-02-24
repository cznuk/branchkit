import { ForkIcon } from "./icons/ForkIcon";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import styles from "./BranchKit.module.css";
import { motion } from "motion/react";

type TriggerContentProps = {
  hasSelection: boolean;
  selectedComponent: string;
  activeVersion: string;
  activeVersionLabel?: string;
  formatVersionLabel: (version: string) => string;
};

const TriggerContent = ({
  hasSelection,
  selectedComponent,
  activeVersion,
  activeVersionLabel,
  formatVersionLabel,
}: TriggerContentProps) => {
  const displayVersion = activeVersionLabel || (activeVersion ? formatVersionLabel(activeVersion) : "-");

  if (!hasSelection) {
    return <ForkIcon className={styles.triggerIcon} />;
  }

  return (
    <>
      <ForkIcon className={styles.triggerIcon} />
      <motion.span
        layoutId="component-name"
        layout="position"
        className={styles.triggerLabel}
        transition={{
          duration: ANIMATION_DURATION,
          ease: ANIMATION_EASING,
        }}
      >
        {selectedComponent}
      </motion.span>
      <span className={styles.triggerVersion}>{displayVersion}</span>
    </>
  );
};

export default TriggerContent;
