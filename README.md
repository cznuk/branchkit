# BranchKit

BranchKit is a page-first UI iteration tool for React apps. Initialize a page, create real file-based variants, compare them in-context, and promote the winner.

Built on top of UIFork (MIT-licensed), with substantial changes and a page-first workflow.

## Why use it

- Iterate on a real page without leaving your app
- Target a whole page or a specific element
- Switch versions instantly in the browser
- Keep every variant as a real file (`Button.v1.tsx`, `Button.v2.tsx`, etc.)
- Fork / rename / delete / promote from the UI when the watch server is running

## Quick Start

### 1. Install

Install BranchKit from npm.

```bash
npm install @cznuk/branchkit
```

### 2. Mount `<BranchKit />` once

Add it near your app root and render it only in development.

```tsx
import { BranchKit } from "@cznuk/branchkit";

function AppShell() {
  return (
    <>
      <YourApp />
      {import.meta.env.DEV && <BranchKit />}
    </>
  );
}
```

If you are not using Vite, use your framework's normal dev-only check.

### 3. Initialize one page

Start with the page you are actually rendering on the route you want to test.

```bash
npx branchkit init src/pages/LandingPage.tsx
```

`init` only changes that target:

- Renames the original file to `LandingPage.v1.tsx`
- Creates `LandingPage.versions.ts`
- Creates a wrapper `LandingPage.tsx` that renders the active version

Version files must default-export their component.

### 4. Start the watch server

```bash
npx branchkit watch
```

The watch server keeps `*.versions.ts` in sync and powers UI actions like fork, rename, delete, and promote.

### 5. Open your app

You should now see the BranchKit widget in the corner on the page you initialized.

## First Run Checklist

If something feels off, check these three things first:

1. You initialized the file that is actually rendered on the current route.
2. The watch server is running in the project you are editing.
3. `<BranchKit />` is mounted in your app root in development.

## Recommended Workflow

1. Initialize one page with `npx branchkit init <page-file>`.
2. Run `npx branchkit watch`.
3. Open that page in your app.
4. Select an element or target the whole page.
5. Fork a new version from the UI or CLI.
6. Edit the new version file manually or with an AI agent.
7. Compare in the app and promote the winner.

## Common Commands

```bash
# Initialize a page or component
npx branchkit init src/pages/LandingPage.tsx

# Start the watch server
npx branchkit watch

# Create a new version
npx branchkit new LandingPage

# Fork an existing version
npx branchkit fork LandingPage v1

# Promote a version and remove the wrapper/version files
npx branchkit promote LandingPage v2
```

## Batch Setup

If you want to initialize a lot of files at once:

```bash
npx branchkit init --targets "src/pages/**/*.tsx" --targets "src/components/**/*.tsx"
```

Start with one file first if you want the smoothest first-run experience.

## Custom Port

If you run the watch server on a custom port, the widget port must match.

```bash
npx branchkit watch --port 3002
```

```tsx
<BranchKit port={3002} />
```

## Framework Notes

### Vite

```tsx
import { BranchKit } from "@cznuk/branchkit";

function AppShell() {
  return (
    <>
      <YourApp />
      {import.meta.env.DEV && <BranchKit />}
    </>
  );
}
```

### Next.js App Router

```tsx
// components/BranchKitProvider.tsx
"use client";

import { BranchKit } from "@cznuk/branchkit";

export function BranchKitProvider() {
  return <BranchKit />;
}
```

Render `<BranchKitProvider />` inside `app/layout.tsx`.

## More Detail

See `docs/README-full.md` for the full walkthrough and CLI reference.

## License

MIT
