# branchkit

BranchKit is a dev tool for exploring UI ideas directly inside your React app.

- **Instant switching:** Flip between variations quickly. No reloads, no interrupting your flow.

- **In-context comparison:** Same app, state, props, and edge cases.

- **Embedded prototyping:** Explore ideas directly inside your own codebase.

- **Multi-variant deploys:** Deploy to one URL. Gather feedback on many ideas.

- **AI-friendly by design:** Versions are separate files so it's easy to generate alternatives or prompt a forked version.

---

## Getting started

Install the package:

```tsx
npm install branchkit
```

Continue installation:

- [Using agents & skills](#using-agents--skills)
- [Manually](#manual-install)

### Using agents & skills

**1. Add skill**

```bash
npx skills add sambernhardt/branchkit
```

**2. Add BranchKit to your project**

```bash
# Prompt
Add branchkit to this application

# Or if the skill isn’t picked up:
/branchkit add to this application
```

**3. Fork a version of a component**

```bash
# Prompt
Fork a version of {some component} and make the following changes
```

### Manual install

Note: even if installing manually, the [agent skill](#using-agents--skills) is still helpful for a better AI experience.

**2. Add BranchKit to your project**

Add the component anywhere in your React app, ideally at the root level. For framework-specific examples, see the [framework examples](#framework-examples) below.

```tsx
import { BranchKit } from "branchkit";

const showBranchKit = process.env.NODE_ENV !== "production";

function App() {
  return (
    <>
      <YourApp />
      {showBranchKit && <BranchKit />}
    </>
  );
}
```

**2. Initialize a component for versioning**

```bash
npx branchkit {path/to/component}
```

This will:

- Convert your component into a forked component that can be versioned
- Generate a `versions.ts` file to track all versions

**Note:** For now, each version file must default-export its component. Named exports are
being considered for the future.

**3. Use your component as usual**

```tsx
import Button from "./components/Button";

// Works exactly as before - the active version is controlled by the BranchKit widget
<Button onClick={handleClick}>Click me</Button>;
```

### Using the versioning UI

The versioning UI floats in the corner of your screen and lets you switch between versions of a forked component. Use **Cmd+Arrow Up/Down** (Mac) or **Ctrl+Arrow Up/Down** (Windows/Linux) to cycle through versions without opening the widget. Running the watch server lets you fork, rename, delete, and create new versions from the UI.

### Running the watch server

The watch server does two things:

1. Watches the filesystem for new version files and displays them as options in the BranchKit component.
2. Allows the BranchKit component to fork, rename, delete, and create new versions.

**Important:** After generating new version files (e.g., manually or via AI agents), run the watch command to regenerate the corresponding `versions.ts` files. The watch server keeps `versions.ts` in sync with the filesystem.

**Custom port:** The watch server defaults to port 3030. To use a different port, either pass `--port` to the CLI or set the `port` prop on the BranchKit component. Both must match for the UI to connect.

```bash
# CLI: run watch server on port 3002
npx branchkit watch --port 3002
npx branchkit watch ./src --port 3002

# Or use the PORT environment variable
PORT=3002 npx branchkit watch
```

```tsx
// BranchKit component: connect to watch server on port 3002
<BranchKit port={3002} />
```

---

## How it works

BranchKit uses file-based component versioning and runtime hot-swapping to enable structured UI iteration.

### 1) File-based versions

Each UI variation is a real file on disk:

```
Button.v1.tsx
Button.v2.tsx
Button.v3.tsx
```

This enables:

- Source control history per variation
- AI / agent generation of new versions
- File-level diffing and review
- Promotion without merge conflicts

### 2) Wrapper-based rendering

When you initialize a component:

```bash
npx branchkit init Button.tsx
```

BranchKit converts it into a wrapper that dynamically renders the active version.

Example:

```tsx
// Button.tsx (generated wrapper)
import { getActiveVersion } from "./Button.versions";

export default function Button(props) {
  const Version = getActiveVersion();
  return <Version {...props} />;
}
```

The wrapper:

- Reads the active version from localStorage
- Dynamically imports the correct file
- Re-renders instantly when switched

No rebuilds, reloads, or branch changes required.

### 3) Runtime switching

The BranchKit widget:

- Lists all available versions
- Lets you switch instantly
- Persists selection in localStorage
- Supports keyboard shortcuts

Switching versions re-renders the component tree immediately.

### 4) Watch server orchestration

The watch server:

- Monitors the filesystem for new versions
- Keeps `versions.ts` in sync
- Powers fork/rename/delete/promote actions
- Enables UI ↔ CLI parity

If you create version files manually or via AI agents, run `npx branchkit watch` to regenerate the `versions.ts` files.

This allows versions to be created:

- Via CLI
- Via UI
- Via AI agents

All surfaced in real time.

### 5) Promotion flow

When you run:

```bash
npx branchkit promote Button v3
```

BranchKit:

- Replaces `Button.tsx` with `Button.v3.tsx`
- Deletes all version files
- Removes the wrapper

You’re left with a single component file which can be a clean diff from the original.

---

## File structure (after init)

```
src/components/
├── Button.tsx           # Wrapper (import this)
├── Button.versions.ts   # Version config
├── Button.v1.tsx        # Original
├── Button.v2.tsx        # More versions
└── Button.v1_1.tsx      # Sub-versions (v1.1, etc.)
```

**Version IDs:** `v1`, `v2`, `v3` = major; `v1_1`, `v1_2` = sub (shown as V1.1, V1.2 in the UI).

---

## CLI reference

Use `npx branchkit <command>`. All of these can also be done from the BranchKit widget.

### Initialize a component (shorthand)

Initialize versioning for a component by passing the path directly.

```bash
npx branchkit src/components/Dropdown.tsx
```

Or use the explicit form:

```bash
npx branchkit init src/components/Dropdown.tsx
```

- **`-w`** — Start watch after init (default: off). Works with both forms.
- **Requirement:** For now, each version file must default-export its component. Named exports are being considered for the future.

Batch/page targeting is also supported using globs or many explicit paths:

```bash
npx branchkit init --targets "src/pages/**/*.tsx"
npx branchkit init --targets "src/components/**/*.tsx" --targets "src/pages/**/*.tsx"
npx branchkit init --paths src/pages/LandingPage.tsx --paths src/components/Hero.tsx
```


### `watch [directory]`

Start the watch server so the widget can talk to your codebase.

```bash
npx branchkit watch                    # current directory (port 3030)
npx branchkit watch ./src              # specific directory
npx branchkit watch --port 3002        # custom port
npx branchkit watch ./src --port 3002  # directory + custom port
```

- **`--port <port>`** — Port for the watch server (default: 3030). Also respects the `PORT` environment variable.

### `new <component-path> [version-id]`

Create a new empty version file.

```bash
npx branchkit new Button       # auto-increment
npx branchkit new Button v3    # explicit id
npx branchkit new --targets "src/pages/**/*.tsx" --version v3
```

### `fork <component-path> <version-id> [target-version]`

Fork an existing version. Alias: `duplicate`.

```bash
npx branchkit fork Button v1       # auto-increment target
npx branchkit fork Button v1 v2    # target v2
npx branchkit fork --targets "src/pages/**/*.tsx" --from v1 --to v2
```

### `rename <component-path> <version-id> <new-version-id>`

Rename a version.

```bash
npx branchkit rename Button v1 v2
npx branchkit rename --targets "src/components/**/*.tsx" --from v1 --to v2
```

### `delete <component-path> <version-id>`

Delete a version (at least one must remain).

```bash
npx branchkit delete Button v2
npx branchkit delete --targets "src/pages/**/*.tsx" --version v2
```

- Batch commands run in **best-effort** mode: all targets are attempted, then a summary is printed. The command exits non-zero if any target fails.

### `promote <component-path> <version-id>`

Promote a version to the main component and remove versioning for that file.

```bash
npx branchkit promote Button v2
npx branchkit promote --targets "src/pages/**/*.tsx" --version v2
```

- Replaces `Button.tsx` with the content of `Button.v2.tsx`
- Deletes all `Button.v*.tsx` and `Button.versions.ts`
- You’re left with a single `Button.tsx`

---

## When to use BranchKit

BranchKit is useful when:

- Exploring multiple UI directions
- Running design/dev spikes
- Comparing interaction models
- Gathering stakeholder feedback
- Testing agent-generated UI variants

Not intended for:

- Production feature flagging
- Long-lived A/B tests
- Runtime user segmentation

---

## Framework examples

### Vite

```tsx
// src/App.tsx
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

### Next.js (App Router)

```tsx
// components/BranchKitProvider.tsx
"use client";
import { BranchKit } from "branchkit";

export function BranchKitProvider() {
  return <BranchKit />;
}

// app/layout.tsx — add <BranchKitProvider /> inside <body>
```

### Next.js (Pages Router)

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

---

## License

MIT
