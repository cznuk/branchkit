import { PlusIcon } from "./icons/PlusIcon";
import styles from "./UIFork.module.css";

type NewVersionButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
};

export function NewVersionButton({ onClick, disabled }: NewVersionButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${styles.newVersionButton} ${styles.menuItem} ${disabled ? styles.disabled : ""}`}
      title={disabled ? "Connect to server to create new versions" : "Create new version"}
      aria-disabled={disabled}
    >
      <div className={styles.newVersionIconContainer}>
        <PlusIcon className={styles.newVersionIcon} />
      </div>
      <span>New version</span>
    </button>
  );
}
