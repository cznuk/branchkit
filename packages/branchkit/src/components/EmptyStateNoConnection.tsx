import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { CopyIcon } from "./icons/CopyIcon";
import styles from "./BranchKit.module.css";

type EmptyStateNoConnectionProps = {
  onCopyCommand: () => void;
  copiedCommandId?: string | null;
  onCopyBatchCommand?: () => void;
};

export function EmptyStateNoConnection({
  onCopyCommand,
  copiedCommandId,
  onCopyBatchCommand,
}: EmptyStateNoConnectionProps) {
  return (
    <div className={styles.emptyStateContainer}>
      <h3 className={styles.emptyStateHeading}>Start the branchkit server</h3>
      <p className={styles.emptyStateText}>Run the watch command in your project root to connect</p>
      <button
        onClick={onCopyCommand}
        className={styles.emptyStateCommandContainer}
        title="Copy command"
        aria-label="Copy command to clipboard"
      >
        <code className={styles.emptyStateCommand}>npx branchkit watch</code>
        {copiedCommandId === "watch" ? (
          <CheckmarkIcon className={styles.emptyStateCopyIcon} />
        ) : (
          <CopyIcon className={styles.emptyStateCopyIcon} />
        )}
      </button>
      {onCopyBatchCommand && (
        <button
          onClick={onCopyBatchCommand}
          className={styles.emptyStateCommandContainer}
          title="Copy batch setup command"
          aria-label="Copy batch setup command"
        >
          <code className={styles.emptyStateCommand}>
            npx branchkit init --targets "src/pages/**/*.tsx" --targets "src/components/**/*.tsx"
          </code>
          {copiedCommandId === "batch-init" ? (
            <CheckmarkIcon className={styles.emptyStateCopyIcon} />
          ) : (
            <CopyIcon className={styles.emptyStateCopyIcon} />
          )}
        </button>
      )}
      <p className={styles.emptyStateText}>
        Tip: start with one page if you want to inspect changes first, then use the batch command later.
      </p>
    </div>
  );
}
