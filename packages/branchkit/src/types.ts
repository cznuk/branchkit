import type { ComponentType, CSSProperties } from "react";

export type VersionType<T extends Record<string, unknown> = Record<string, unknown>> = {
  render: ComponentType<T> | (() => Promise<{ default: ComponentType<T> }>);
  description?: string;
  label: string;
};

export type VersionsType<T extends Record<string, unknown> = Record<string, unknown>> = {
  [key: string]: VersionType<T>;
};

export type ForkedComponentProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  versions: VersionsType<T>;
  props: T;
  defaultVersion?: string;
};

export type BranchKitProps = {
  /** Port for the watch server (default: 3030) */
  port?: number;
  /** Optional className to apply to the BranchKit container */
  className?: string;
  /** Optional style object to apply to the BranchKit container */
  style?: CSSProperties;
  /** Enable element selection mode for building multi-target prompts (default: true) */
  enableElementSelection?: boolean;
  /** Optional override for formatting copied element-selection output */
  copyTemplate?: (context: CopyTemplateContext) => string;
};

/** Version info with key and optional label */
export type VersionInfo = {
  key: string;
  label?: string;
};

/** Component/page target info returned from the watch server or local registry */
export type ComponentInfo = {
  targetId: string;
  name: string;
  kind?: "page" | "component";
  path: string;
  versions: VersionInfo[];
};

export type ElementAnnotation = {
  id: string;
  targetId?: string;
  targetName?: string;
  targetKind?: "page" | "component";
  activeVersion?: string;
  selector: string;
  elementLabel: string;
  note: string;
  x: number;
  y: number;
  timestamp: number;
};

export type CopyTemplateContext = {
  annotations: ElementAnnotation[];
  targetVersions?: Record<string, string[]>;
  globalPrompt: string;
  pathname: string;
  url: string;
  generatedAt: string;
};
