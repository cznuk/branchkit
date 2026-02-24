import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { CopyIcon } from "./icons/CopyIcon";
import styles from "./BranchKit.module.css";

type EmptyStateNoComponentsProps = {
  onCopyCommand: () => void;
  onCopyBatchCommand?: () => void;
  copiedCommandId?: string | null;
  pathname?: string;
  projectTargetCount?: number;
  suggestedPath?: string | null;
};

export function EmptyStateNoComponents({
  onCopyCommand,
  onCopyBatchCommand,
  copiedCommandId,
  pathname,
  projectTargetCount = 0,
  suggestedPath,
}: EmptyStateNoComponentsProps) {
  const hasOtherTargets = projectTargetCount > 0;

  return (
    <div className={styles.emptyStateContainer}>
      <h3 className={styles.emptyStateHeading}>
        {hasOtherTargets ? "No BranchKit targets on this page" : "Get started with BranchKit"}
      </h3>
      <p className={styles.emptyStateText}>
        {hasOtherTargets
          ? "BranchKit is running, but this route has no initialized page/components yet."
          : "Initialize a page or component, then BranchKit will detect it automatically."}
      </p>
      {pathname && (
        <p className={styles.emptyStateText}>
          Route: <code className={styles.emptyStateCommand}>{pathname}</code>
        </p>
      )}
      {suggestedPath && (
        <p className={styles.emptyStateText}>
          Suggested target: <code className={styles.emptyStateCommand}>{suggestedPath}</code>
        </p>
      )}
      <button
        onClick={onCopyCommand}
        className={styles.emptyStateCommandContainer}
        title="Copy command"
        aria-label="Copy command to clipboard"
      >
        <code className={styles.emptyStateCommand}>
          {suggestedPath ? `npx branchkit init ${suggestedPath}` : "npx branchkit init <path-to-file>"}
        </code>
        {copiedCommandId === "page-init" ? (
          <CheckmarkIcon className={styles.emptyStateCopyIcon} />
        ) : (
          <CopyIcon className={styles.emptyStateCopyIcon} />
        )}
      </button>
      {onCopyBatchCommand && (
        <button
          onClick={onCopyBatchCommand}
          className={styles.emptyStateCommandContainer}
          title="Copy batch auto-init command"
          aria-label="Copy batch auto-init command"
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
        Then run <code className={styles.emptyStateCommand}>npx branchkit watch</code> (if not already running).
      </p>
      <p className={styles.emptyStateText}>
        Safe to try: BranchKit creates version files and a wrapper, then regenerates the versions index. It
        does not auto-edit unrelated files.
      </p>
    </div>
  );
}
