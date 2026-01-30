import React from "react";
import styles from "./UIFork.module.css";
import { ChevronRightIcon } from "./icons/ChevronRightIcon";

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  return (
    <div className={styles.settingsView}>
      <button onClick={onBack} className={styles.settingsBackButton}>
        <ChevronRightIcon className={styles.settingsBackIcon} />
        <span>Back</span>
      </button>
      <div className={styles.settingsContent}>
        <h3 className={styles.settingsTitle}>Settings</h3>
        <p className={styles.settingsText}>Settings content goes here</p>
      </div>
    </div>
  );
}
