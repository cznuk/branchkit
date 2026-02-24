import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementAnnotation } from "../types";
import { useLocalStorage } from "./useLocalStorage";
import { getTargetMetadataFromElement } from "../utils/targetAttributes";

const MAX_ANNOTATIONS = 60;

function buildElementLabel(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = Array.from(element.classList)
    .slice(0, 2)
    .map((value) => `.${value}`)
    .join("");
  const text = (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
  return `${tag}${id}${classes}${text ? ` (${text})` : ""}`;
}

function escapeIdentifier(value: string): string {
  return value.replace(/([:.#[\],>+~()\s])/g, "\\$1");
}

function buildSelector(element: HTMLElement): string {
  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (current && segments.length < 5) {
    if (current.id) {
      segments.unshift(`#${escapeIdentifier(current.id)}`);
      break;
    }

    const tag = current.tagName.toLowerCase();
    const className = current.classList.length > 0 ? `.${escapeIdentifier(current.classList[0])}` : "";

    let selector = `${tag}${className}`;
    if (!className && current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        (sibling) => sibling.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }

    segments.unshift(selector);
    current = current.parentElement;
  }

  return segments.join(" > ");
}

function createAnnotationId(targetId: string | undefined, selector: string): string {
  return `${targetId || "unmapped"}::${selector}`;
}

type UseElementAnnotationsOptions = {
  enabled: boolean;
  pathname: string;
};

export function useElementAnnotations({ enabled, pathname }: UseElementAnnotationsOptions) {
  const annotationStorageKey = `branchkit-element-annotations:${pathname}`;
  const promptStorageKey = `branchkit-element-global-prompt:${pathname}`;

  const [annotations, setAnnotations] = useLocalStorage<ElementAnnotation[]>(annotationStorageKey, []);
  const [globalPrompt, setGlobalPrompt] = useLocalStorage<string>(promptStorageKey, "");
  const [isSelecting, setIsSelecting] = useState(false);

  const upsertAnnotation = useCallback((next: ElementAnnotation) => {
    setAnnotations((previous) => {
      const existingIndex = previous.findIndex((item) => item.id === next.id);
      if (existingIndex >= 0) {
        const updated = [...previous];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...next,
          note: updated[existingIndex].note,
        };
        return updated;
      }

      const appended = [next, ...previous];
      return appended.slice(0, MAX_ANNOTATIONS);
    });
  }, [setAnnotations]);

  const createAnnotationFromElement = useCallback(
    (target: HTMLElement, overrides?: Partial<ElementAnnotation>) => {
      const selector = overrides?.selector || buildSelector(target);
      const metadata = getTargetMetadataFromElement(target);
      const rect = target.getBoundingClientRect();
      const id = createAnnotationId(metadata?.targetId, selector);

      upsertAnnotation({
        id,
        targetId: overrides?.targetId ?? metadata?.targetId,
        targetName: overrides?.targetName ?? metadata?.targetName,
        targetKind: overrides?.targetKind ?? metadata?.targetKind,
        activeVersion: overrides?.activeVersion ?? metadata?.activeVersion,
        selector,
        elementLabel: overrides?.elementLabel || buildElementLabel(target),
        note: overrides?.note ?? "",
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2 + window.scrollY,
        timestamp: overrides?.timestamp ?? Date.now(),
      });
    },
    [upsertAnnotation],
  );

  const addFullPageAnnotation = useCallback((targetId?: string) => {
    const escapedTargetId =
      targetId && typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(targetId)
        : targetId;

    const mappedTarget = escapedTargetId
      ? (document.querySelector(
          `[data-branchkit-target-id="${escapedTargetId}"]`,
        ) as HTMLElement | null)
      : null;

    const fallbackTarget = document.querySelector("[data-branchkit-target-id]") as HTMLElement | null;
    const element = mappedTarget || fallbackTarget || document.body;
    const metadata = getTargetMetadataFromElement(element);

    createAnnotationFromElement(element, {
      selector: metadata?.targetId
        ? `[data-branchkit-target-id="${metadata.targetId}"]`
        : "body",
      elementLabel: metadata?.targetName
        ? `Full page (${metadata.targetName})`
        : "Full page",
    });
  }, [createAnnotationFromElement]);

  const addAllTargetAnnotations = useCallback(() => {
    const nodes = Array.from(document.querySelectorAll("[data-branchkit-target-id]")) as HTMLElement[];
    const uniqueTargetIds = new Set<string>();

    for (const node of nodes) {
      const metadata = getTargetMetadataFromElement(node);
      if (!metadata?.targetId || uniqueTargetIds.has(metadata.targetId)) continue;
      uniqueTargetIds.add(metadata.targetId);
      createAnnotationFromElement(node, {
        selector: `[data-branchkit-target-id="${metadata.targetId}"]`,
        elementLabel: `Target (${metadata.targetName})`,
      });
    }
  }, [createAnnotationFromElement]);

  const updateNote = useCallback((id: string, note: string) => {
    setAnnotations((previous) =>
      previous.map((item) => (item.id === id ? { ...item, note } : item)),
    );
  }, [setAnnotations]);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((previous) => previous.filter((item) => item.id !== id));
  }, [setAnnotations]);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, [setAnnotations]);

  useEffect(() => {
    if (!enabled || !isSelecting) return;

    let highlightedElement: HTMLElement | null = null;
    let previousOutline = "";
    let previousOutlineOffset = "";

    const clearHighlight = () => {
      if (!highlightedElement) return;
      highlightedElement.style.outline = previousOutline;
      highlightedElement.style.outlineOffset = previousOutlineOffset;
      highlightedElement = null;
      previousOutline = "";
      previousOutlineOffset = "";
    };

    const onMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest("#branchkit-root")) {
        clearHighlight();
        return;
      }

      if (target === highlightedElement) return;

      clearHighlight();
      highlightedElement = target;
      previousOutline = target.style.outline;
      previousOutlineOffset = target.style.outlineOffset;
      target.style.outline = "2px solid #22c55e";
      target.style.outlineOffset = "2px";
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest("#branchkit-root")) {
        return;
      }

      createAnnotationFromElement(target);

      event.preventDefault();
      event.stopPropagation();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSelecting(false);
      }
    };

    document.body.style.cursor = "crosshair";
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearHighlight();
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, isSelecting, createAnnotationFromElement]);

  useEffect(() => {
    if (!enabled && isSelecting) {
      setIsSelecting(false);
    }
  }, [enabled, isSelecting]);

  const mappedCount = useMemo(
    () => annotations.filter((item) => !!item.targetId).length,
    [annotations],
  );

  const unmatchedCount = annotations.length - mappedCount;

  return {
    annotations,
    globalPrompt,
    setGlobalPrompt,
    isSelecting,
    setIsSelecting,
    updateNote,
    removeAnnotation,
    clearAnnotations,
    addFullPageAnnotation,
    addAllTargetAnnotations,
    mappedCount,
    unmatchedCount,
  };
}
