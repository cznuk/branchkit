import type { ComponentType } from "react";

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

export type UIForkProps = {
  /** Port for the watch server (default: 3001) */
  port?: number;
};

/** Version info with key and optional label */
export type VersionInfo = {
  key: string;
  label?: string;
};

/** Component info returned from the watch server or local registry */
export type ComponentInfo = {
  name: string;
  path: string;
  versions: VersionInfo[];
};
