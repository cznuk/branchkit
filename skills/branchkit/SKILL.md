---
name: branchkit
description: Install and work with branchkit, a CLI tool and React component library for managing UI component versions. Use when the user wants to version components, test UI variations, gather stakeholder feedback, or work with branchkit commands like init, watch, new, fork, promote.
---

# BranchKit

BranchKit is a CLI tool and React component library for managing UI component versions. Create multiple versions of components, let stakeholders switch between them to test and gather feedback, and promote the best one when ready.

## When to Use

- User wants to version React components for A/B testing or stakeholder feedback
- User mentions branchkit, component versioning, or UI variations
- User needs help with branchkit CLI commands (init, watch, new, fork, promote, etc.)
- User wants to set up branchkit in a React app (Vite, Next.js, etc.)

## Installation

```bash
npm install branchkit
```

Or use yarn, pnpm, or bun.

## Quick Setup

### 1. Add BranchKit Component

Add the `BranchKit` component to your React app root. Typically shown in development and preview/staging (not production):

**Vite:**

```tsx
import { BranchKit } from "branchkit";

const showBranchKit = import.meta.env.MODE !== "production";

function App() {
  return (
    <>
      <YourApp />
      {showBranchKit && <BranchKit />}
    </>
  );
}
```

**Next.js (App Router):**

```tsx
// components/BranchKitProvider.tsx
"use client";
import { BranchKit } from "branchkit";

export function BranchKitProvider() {
  if (process.env.NODE_ENV === "production") return null;
  return <BranchKit />;
}

// app/layout.tsx
import { BranchKitProvider } from "@/components/BranchKitProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <BranchKitProvider />
      </body>
    </html>
  );
}
```

**Next.js (Pages Router):**

```tsx
// pages/_app.tsx
import { BranchKit } from "branchkit";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {process.env.NODE_ENV !== "production" && <BranchKit />}
    </>
  );
}
```

No separate CSS import needed - styles are automatically included.

### 2. Initialize Component Versioning

```bash
npx branchkit src/components/Button.tsx
```

Or use the explicit form:

```bash
npx branchkit init src/components/Button.tsx
```

This will:

- Convert the component into a forked component that can be versioned
- Generate a `versions.ts` file to track all versions
- Optionally start the watch server (use `-w` flag with either form)

**Requirement:** For now, each version file must default-export its component. Named exports are being considered for the future.

**When the target file lacks a default export:** Prompt the user to update the component to use a default export, then update any files that import it (e.g., change `import { Foo }` to `import Foo`). Only run `npx branchkit init` after the component has a default export.

### 3. Use Component Normally

```tsx
import Button from "./components/Button";

// Works exactly as before - active version controlled by BranchKit widget
<Button onClick={handleClick}>Click me</Button>;
```

## CLI Commands

All commands use `npx branchkit`:

### Initialize a component (shorthand)

Initialize versioning for an existing component by passing the path directly.

```bash
npx branchkit src/components/Dropdown.tsx
npx branchkit src/components/Dropdown.tsx -w  # Start watching after init
```

Or use the explicit form:

```bash
npx branchkit init src/components/Dropdown.tsx
npx branchkit init src/components/Dropdown.tsx -w  # Start watching after init
```

### `watch [directory]`

Start the watch server (enables UI widget communication).

```bash
npx branchkit watch                    # Watch current directory (port 3030)
npx branchkit watch ./src              # Watch specific directory
npx branchkit watch --port 3002        # Custom port
npx branchkit watch ./src --port 3002  # Directory + custom port
```

When using a custom port, pass the same port to the BranchKit component: `<BranchKit port={3002} />`.

**Important:** After generating new version files (e.g., manually or via AI agents), run the watch command to regenerate the corresponding `versions.ts` files.

### `new <component-path> [version-id]`

Create a new empty version file.

```bash
npx branchkit new Button         # Auto-increment version number
npx branchkit new Button v3      # Specify version explicitly
```

### `fork <component-path> <version-id> [target-version]`

Fork an existing version to create a new one.

```bash
npx branchkit fork Button v1           # Fork v1 to auto-incremented version
npx branchkit fork Button v1 v2        # Fork v1 to specific version
npx branchkit duplicate Button v1 v2   # Alias for fork
```

### `rename <component-path> <version-id> <new-version-id>`

Rename a version.

```bash
npx branchkit rename Button v1 v2
```

### `delete <component-path> <version-id>`

Delete a version (must have at least one version remaining).

```bash
npx branchkit delete Button v2
```

### `promote <component-path> <version-id>`

Promote a version to be the main component and remove all versioning scaffolding.

```bash
npx branchkit promote Button v2
```

This will:

- Replace `Button.tsx` with content from `Button.v2.tsx`
- Delete all version files (`Button.v*.tsx`)
- Delete `Button.versions.ts`
- Effectively "undo" the versioning system

## File Structure

After running `npx branchkit src/components/Button.tsx` (or `npx branchkit init src/components/Button.tsx`):

```
src/components/
├── Button.tsx              # Wrapper component (import this)
├── Button.versions.ts      # Version configuration
├── Button.v1.tsx           # Original component (version 1)
├── Button.v2.tsx           # Additional versions
└── Button.v1_1.tsx         # Sub-versions (v1.1, v2.1, etc.)
```

For now, each version file must default-export its component. Named exports are being considered for the future.

## Version Naming

- `v1`, `v2`, `v3` - Major versions
- `v1_1`, `v1_2` - Sub-versions (displayed as V1.1, V1.2 in UI)
- `v2_1`, `v2_2` - Sub-versions of v2

## BranchKit Widget Features

The `BranchKit` component provides a floating UI widget that allows:

- **Switch versions** - Click to switch between versions
- **Create new versions** - Click "+" to create blank version
- **Fork versions** - Fork existing version to iterate
- **Rename versions** - Give versions meaningful names
- **Delete versions** - Remove versions no longer needed
- **Promote versions** - Promote version to become main component
- **Open in editor** - Click to open version file in VS Code/Cursor

**Keyboard shortcuts:** `Cmd/Ctrl + Arrow Up/Down` to cycle through versions

**Settings:** Theme (light/dark/system), position, code editor preference

## Custom Environment Gating

For more control over when BranchKit appears:

```tsx
// Enable via NEXT_PUBLIC_ENABLE_BRANCHKIT=true or VITE_ENABLE_BRANCHKIT=true
const showBranchKit =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_BRANCHKIT === "true";
```

Useful for:

- Showing on specific preview branches
- Enabling for internal stakeholders on staging
- Gating behind feature flags

## Common Workflows

### Starting Versioning on a Component

1. Install branchkit: `npm install branchkit`
2. Add `<BranchKit />` component to app root
3. Initialize: `npx branchkit src/components/MyComponent.tsx` (or `npx branchkit init src/components/MyComponent.tsx`)
4. Start watch server: `npx branchkit watch`
5. Use the widget to create and switch between versions

### Creating a New Version

```bash
# Create empty version
npx branchkit new Button

# Or fork existing version
npx branchkit fork Button v1
```

### Promoting a Version to Production

```bash
npx branchkit promote Button v2
```

This removes all versioning and makes v2 the main component.

## How It Works

1. `ForkedComponent` reads active version from localStorage and renders corresponding component
2. `BranchKit` connects to watch server and displays all available versions
3. Selecting a version updates localStorage, triggering `ForkedComponent` to re-render
4. Watch server monitors file system for new version files and updates `versions.ts` automatically

**After generating new version files:** When creating version files manually or via AI agents, run `npx branchkit watch` to regenerate the `versions.ts` files so the new versions appear in the BranchKit widget.
