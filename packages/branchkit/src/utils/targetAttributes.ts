const TARGET_PREFIX = "data-branchkit";

export const BRANCHKIT_TARGET_ATTRS = {
  targetId: `${TARGET_PREFIX}-target-id`,
  targetName: `${TARGET_PREFIX}-target-name`,
  targetKind: `${TARGET_PREFIX}-kind`,
  activeVersion: `${TARGET_PREFIX}-active-version`,
} as const;

export type BranchKitTargetMetadata = {
  targetId: string;
  targetName: string;
  targetKind: "page" | "component";
  activeVersion?: string;
};

function deriveTargetName(targetId: string): string {
  const cleaned = targetId.split(/[\\/]/).pop() || targetId;
  return cleaned.replace(/\.[a-zA-Z0-9]+$/, "");
}

function inferTargetKind(targetId: string): "page" | "component" {
  const normalized = targetId.toLowerCase();
  if (normalized.includes("/pages/") || normalized.endsWith("page")) {
    return "page";
  }
  return "component";
}

export function createTargetMetadata(targetId: string, activeVersion?: string): BranchKitTargetMetadata {
  return {
    targetId,
    targetName: deriveTargetName(targetId),
    targetKind: inferTargetKind(targetId),
    activeVersion,
  };
}

export function getTargetMetadataFromElement(element: Element | null): BranchKitTargetMetadata | null {
  if (!element) return null;

  const carrier = element.closest?.(`[${BRANCHKIT_TARGET_ATTRS.targetId}]`) as HTMLElement | null;
  if (!carrier) return null;

  const targetId = carrier.getAttribute(BRANCHKIT_TARGET_ATTRS.targetId);
  if (!targetId) return null;

  const targetName =
    carrier.getAttribute(BRANCHKIT_TARGET_ATTRS.targetName) || deriveTargetName(targetId);
  const targetKindRaw = carrier.getAttribute(BRANCHKIT_TARGET_ATTRS.targetKind);
  const targetKind = targetKindRaw === "page" ? "page" : "component";
  const activeVersion = carrier.getAttribute(BRANCHKIT_TARGET_ATTRS.activeVersion) || undefined;

  return {
    targetId,
    targetName,
    targetKind,
    activeVersion,
  };
}
