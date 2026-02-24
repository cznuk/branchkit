import type { CopyTemplateContext, ElementAnnotation } from "../types";

type TargetGroup = {
  targetId: string;
  targetName: string;
  targetKind: "page" | "component";
  activeVersion?: string;
  targetVersion?: string;
  wrapperPath?: string;
  targetVersionFile?: string;
  annotations: ElementAnnotation[];
};

type RequestedChange = {
  note: string;
  selectors: string[];
};

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function normalizeNote(value: string): string {
  return value.trim();
}

function groupByTarget(annotations: ElementAnnotation[]): TargetGroup[] {
  const groups = new Map<string, TargetGroup>();

  for (const annotation of annotations) {
    if (!annotation.targetId) continue;

    const existing = groups.get(annotation.targetId);
    if (existing) {
      existing.annotations.push(annotation);
      if (!existing.activeVersion && annotation.activeVersion) {
        existing.activeVersion = annotation.activeVersion;
      }
      continue;
    }

    groups.set(annotation.targetId, {
      targetId: annotation.targetId,
      targetName: annotation.targetName || annotation.targetId,
      targetKind: annotation.targetKind || "component",
      activeVersion: annotation.activeVersion,
      annotations: [annotation],
    });
  }

  return Array.from(groups.values());
}

function parseVersionKey(version: string): { major: number; minor: number } | null {
  const match = version.match(/^v(\d+)(?:_(\d+))?$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2] || "0", 10),
  };
}

function nextVersionKey(versions: string[] | undefined): string {
  if (!versions || versions.length === 0) return "v2";

  let maxMajor = 1;
  let maxMinor = 0;

  for (const version of versions) {
    const parsed = parseVersionKey(version);
    if (!parsed) continue;
    if (parsed.major > maxMajor) {
      maxMajor = parsed.major;
      maxMinor = parsed.minor;
    } else if (parsed.major === maxMajor && parsed.minor > maxMinor) {
      maxMinor = parsed.minor;
    }
  }

  return `v${maxMajor + 1}`;
}

function getVersionFilePath(targetId: string, version: string | undefined, extension: string): string {
  if (!version) {
    return `${targetId}.vX${extension}`;
  }
  return `${targetId}.${version}${extension}`;
}

function buildRequestedChanges(globalPrompt: string, annotations: ElementAnnotation[]): RequestedChange[] {
  const items: RequestedChange[] = [];
  const shared = normalizeNote(globalPrompt);
  if (shared) {
    items.push({
      note: `Shared prompt: ${shared}`,
      selectors: [],
    });
  }

  const byNote = new Map<string, Set<string>>();
  for (const annotation of annotations) {
    const note = normalizeNote(annotation.note);
    if (!note) continue;
    if (!byNote.has(note)) byNote.set(note, new Set());
    if (annotation.selector) {
      byNote.get(note)?.add(annotation.selector);
    }
  }

  for (const [note, selectors] of byNote.entries()) {
    items.push({
      note,
      selectors: Array.from(selectors),
    });
  }

  if (items.length === 0) {
    items.push({
      note: "No specific note was provided. Preserve behavior and improve this target based on surrounding context.",
      selectors: [],
    });
  }

  return items;
}

export function generateBranchKitPrompt(context: CopyTemplateContext): string {
  const mapped = context.annotations.filter((item) => !!item.targetId);
  const unmatched = context.annotations.filter((item) => !item.targetId);
  const targetGroups = groupByTarget(mapped);
  const targetVersions = context.targetVersions || {};
  for (const target of targetGroups) {
    target.targetVersion = nextVersionKey(targetVersions[target.targetId]);
    // We usually don't know the original file extension from browser-side metadata.
    // Default to .tsx and tell the user to adjust if their project uses .jsx/.ts/.js.
    const extension = ".tsx";
    target.wrapperPath = `${target.targetId}${extension}`;
    target.targetVersionFile = getVersionFilePath(
      target.targetId,
      target.targetVersion,
      extension,
    );
  }

  const lines: string[] = [];
  lines.push("## BranchKit Change Brief");
  lines.push("");
  lines.push(`- Generated: ${context.generatedAt}`);
  lines.push(`- URL: ${context.url}`);
  lines.push(`- Path: ${context.pathname}`);
  lines.push(`- Selected annotations: ${context.annotations.length}`);
  lines.push(`- Mapped BranchKit targets: ${targetGroups.length}`);
  lines.push(`- Unmatched selections: ${unmatched.length}`);

  lines.push("");
  lines.push("### Safety / Scope");
  lines.push("- BranchKit changes are scoped to explicitly versioned targets (wrapper + version files).");
  lines.push("- Prefer editing only the new version file(s); do not manually edit generated `*.versions.ts` files.");
  lines.push("- If a suggested path/extension is wrong for this project, adjust the command before running it.");

  lines.push("");
  lines.push("### Runbook");
  lines.push("1. Start the watch server: `npx branchkit watch`.");

  if (targetGroups.length === 0) {
    lines.push("2. No mapped BranchKit targets were found. Re-select elements within BranchKit-managed components/pages.");
  } else {
    lines.push("2. Create a new fork for each mapped target from its active version:");
    for (const target of targetGroups) {
      const forkTarget = target.wrapperPath || `${target.targetId}.tsx`;
      if (target.activeVersion) {
        lines.push(
          `   - \`npx branchkit fork ${forkTarget} ${target.activeVersion} ${target.targetVersion}\``,
        );
      } else {
        lines.push(
          `   - \`npx branchkit fork ${forkTarget} v1 ${target.targetVersion}\` (fallback because active version was unavailable)`,
        );
      }
    }
    lines.push("3. If any command fails, confirm the wrapper path and extension (`.tsx/.jsx/.ts/.js`) for that target.");
    lines.push("4. Verify each fork file exists, then edit only the exact `targetVersionFile` listed below.");
    lines.push("5. Return to the app and use BranchKit to switch between original and new versions for review.");
  }

  if (targetGroups.length > 0) {
    lines.push("");
    lines.push("### Copy/Paste Commands");
    lines.push("```bash");
    lines.push("npx branchkit watch");
    for (const target of targetGroups) {
      const forkTarget = target.wrapperPath || `${target.targetId}.tsx`;
      if (target.activeVersion) {
        lines.push(`npx branchkit fork ${forkTarget} ${target.activeVersion} ${target.targetVersion}`);
      } else {
        lines.push(`npx branchkit fork ${forkTarget} v1 ${target.targetVersion}`);
      }
    }
    lines.push("```");
  }

  lines.push("");
  lines.push("### Targets");
  if (targetGroups.length === 0) {
    lines.push("- None");
  }

  for (const [index, target] of targetGroups.entries()) {
    lines.push("");
    lines.push(`#### ${index + 1}. ${target.targetName}`);
    lines.push(`- targetId: \`${target.targetId}\``);
    lines.push(`- kind: ${target.targetKind}`);
    lines.push(`- activeVersion: ${target.activeVersion || "unknown"}`);
    lines.push(`- targetVersion: ${target.targetVersion || "unknown"}`);
    lines.push(`- wrapperPath: ${target.wrapperPath || `${target.targetId}.tsx`}`);
    lines.push(`- targetVersionFile: ${target.targetVersionFile || `${target.targetId}.vX.tsx`}`);

    const selectors = dedupe(target.annotations.map((item) => item.selector));
    lines.push("- selectorContext:");
    for (const selector of selectors) {
      lines.push(`  - \`${selector}\``);
    }

    const requested = buildRequestedChanges(context.globalPrompt, target.annotations);
    lines.push("- requestedChanges:");
    for (const request of requested) {
      lines.push(`  - ${request.note}`);
      if (request.selectors.length > 0) {
        lines.push("    - appliesToSelectors:");
        for (const selector of request.selectors) {
          lines.push(`      - \`${selector}\``);
        }
      }
    }
  }

  lines.push("");
  lines.push("### Unmatched Selections");
  if (unmatched.length === 0) {
    lines.push("- None");
  } else {
    for (const item of unmatched) {
      lines.push(`- ${item.elementLabel} (\`${item.selector}\`)${item.note ? `: ${item.note}` : ""}`);
    }
  }

  lines.push("");
  lines.push("### Handoff Expectations (for AI/code assistant)");
  lines.push("- Preserve existing behavior unless a requested change explicitly alters it.");
  lines.push("- Keep edits limited to the listed target version files.");
  lines.push("- Return a summary of changed files and any assumptions (especially path/extension assumptions).");

  return lines.join("\n");
}
