// Components
export { BranchKit } from "./components/BranchKit";
export { ForkedComponent } from "./components/ForkedComponent";
export { LazyForkedComponent } from "./components/LazyForkedComponent";

// Hooks
export { useLocalStorage } from "./hooks/useLocalStorage";
export { generateBranchKitPrompt } from "./utils/promptComposer";

// Types
export type {
  VersionType,
  VersionsType,
  ForkedComponentProps,
  BranchKitProps,
  ComponentInfo,
  ElementAnnotation,
  CopyTemplateContext,
} from "./types";
