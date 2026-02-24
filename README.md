# BranchKit

BranchKit lets you create and compare UI versions directly inside your React app.

## Why people use it

- Switch between UI versions instantly in the browser
- Keep each version as a real file (`Button.v1.tsx`, `Button.v2.tsx`, etc.)
- Fork / rename / delete / promote versions from the UI (with the watch server running)
- Great for design iteration, stakeholder reviews, and AI-assisted UI changes

## 60-Second Quick Start

### 1. Install

```bash
npm install branchkit
```

### 2. Add `<BranchKit />` to your app (dev only)

```tsx
import { BranchKit } from "branchkit";

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV !== "production" && <BranchKit />}
    </>
  );
}
```

### 3. Initialize one component or page

```bash
npx branchkit init src/components/Button.tsx
```

### 4. Start the watch server

```bash
npx branchkit watch
```

### 5. Open your app

You should now see the BranchKit widget in the corner.

## What `init` changes (important)

When you run `npx branchkit init <file>` on a file like `Button.tsx`, BranchKit only changes files for that target:

- Renames your original file to `Button.v1.tsx`
- Creates `Button.versions.ts`
- Creates a wrapper `Button.tsx` that renders the active version

It does **not** scan and rewrite unrelated files across your project.

## First workflow (simple)

1. Run `npx branchkit init <path-to-file>` on a component/page you want to iterate on.
2. Run `npx branchkit watch`.
3. Use the BranchKit widget to switch versions.
4. Fork a new version from the UI or CLI.
5. Edit the new version file.
6. Promote the winning version when you're done.

## Most useful commands

```bash
# Initialize versioning for a file
npx branchkit init src/components/Button.tsx

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
import { BranchKit } from "branchkit";

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
import { BranchKit } from "branchkit";

export function BranchKitProvider() {
  return <BranchKit />;
}
```

Add `<BranchKitProvider />` inside your `app/layout.tsx` `<body>`.

## AI / Agent use (optional)

BranchKit works great with AI because each variation is a separate file.

- Generate a new version file
- Edit only that version
- Compare in the app
- Promote the winner

## Need more detail?

See the full docs:

- `docs/README-full.md` (full walkthrough, CLI reference, concepts, examples)

## License

MIT
