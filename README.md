# BranchKit

BranchKit is a page-first UI iteration tool for React apps. Initialize a page, select what to change (component-level or whole-page), generate a new version, compare in-context, and promote the winner.

Built on top of UIFork (MIT-licensed), with substantial changes and a page-first workflow.

## Why people use it

- Initialize a page and iterate without leaving your app
- Select specific elements or target the whole page
- Switch between UI versions instantly in the browser
- Keep each version as a real file (`Button.v1.tsx`, `Button.v2.tsx`, etc.)
- Fork / rename / delete / promote versions from the UI (with the watch server running)
- Great for design iteration, stakeholder reviews, and AI-assisted UI changes

## 60-Second Quick Start

### 1. Install

```bash
npm install @cznuk/branchkit
```

### 2. Add `<BranchKit />` to your app (dev only)

```tsx
import { BranchKit } from "@cznuk/branchkit";

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV !== "production" && <BranchKit />}
    </>
  );
}
```

### 3. Initialize one page

```bash
npx branchkit init src/pages/LandingPage.tsx
```

### 4. Start the watch server

```bash
npx branchkit watch
```

### 5. Open your app

You should now see the BranchKit widget in the corner.

## What `init` changes (important)

When you run `npx branchkit init <file>` on a page (or component) file like `LandingPage.tsx`, BranchKit only changes files for that target:

- Renames your original file to `LandingPage.v1.tsx`
- Creates `LandingPage.versions.ts`
- Creates a wrapper `LandingPage.tsx` that renders the active version

It does **not** scan and rewrite unrelated files across your project.

## First workflow (simple)

1. Run `npx branchkit init <page-file>` on the page you want to iterate on.
2. Run `npx branchkit watch`.
3. Open that page in your app.
4. Use BranchKit to select specific elements (or the whole page).
5. Fork a new version from the UI or CLI.
6. Edit the new version file (manually or with AI).
7. Compare in the app and promote the winner.

## Most useful commands

```bash
# Initialize versioning for a page (recommended)
npx branchkit init src/pages/LandingPage.tsx

# Watch and enable UI actions (fork/rename/delete/promote)
npx branchkit watch

# Create a new version file
npx branchkit new Button

# Fork a version (duplicate)
npx branchkit fork Button v1

# Promote a version and remove versioning wrapper/files
npx branchkit promote Button v2
```

## Batch setup (optional)

If you want to initialize a lot of files quickly:

```bash
npx branchkit init --targets "src/pages/**/*.tsx" --targets "src/components/**/*.tsx"
```

Tip: start with one file first if you want to inspect exactly what BranchKit generates.

## If the widget says it is not set up for this page

That usually means one of these:

1. You have not initialized this page/component yet (`npx branchkit init <file>`)
2. The watch server is not running (`npx branchkit watch`)
3. You initialized a different file than the one rendered on the current route

## Custom port (optional)

If you run the watch server on a custom port, the widget port must match.

```bash
npx branchkit watch --port 3002
```

```tsx
<BranchKit port={3002} />
```

## Framework examples

### Vite

```tsx
import { BranchKit } from "@cznuk/branchkit";

function App() {
  return (
    <>
      <YourApp />
      {import.meta.env.MODE !== "production" && <BranchKit />}
    </>
  );
}
```

### Next.js (App Router)

```tsx
// components/BranchKitProvider.tsx
"use client";
import { BranchKit } from "@cznuk/branchkit";

export function BranchKitProvider() {
  return <BranchKit />;
}
```

Add `<BranchKitProvider />` inside your `app/layout.tsx` `<body>`.

## AI / Agent workflow (recommended)

BranchKit works best with a page-first workflow:

1. Initialize a page with BranchKit (`npx branchkit init <page-file>`)
2. Start the watch server (`npx branchkit watch`)
3. Open the page in your app
4. Use BranchKit to select specific elements (or the whole page)
5. Copy the BranchKit prompt / change brief
6. Ask your AI agent to make changes to the new version file only
7. Compare versions in the app
8. Promote the winner

This keeps the agent scoped, reduces risk, and makes iteration much faster.

## Need more detail?

See the full docs:

- `docs/README-full.md` (full walkthrough, CLI reference, concepts, examples)

## License

MIT
