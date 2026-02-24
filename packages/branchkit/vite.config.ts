import preserveDirectives from "rollup-preserve-directives";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { resolve } from "path";
import { promises as fs } from "fs";

function enforceUseClientFirst(): Plugin {
  return {
    name: "enforce-use-client-first",
    async writeBundle(outputOptions, bundle) {
      const outDir = outputOptions.dir ?? resolve(__dirname, "dist");

      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        if (!output.fileName.endsWith(".mjs") && !output.fileName.endsWith(".js")) continue;

        const filePath = resolve(outDir, output.fileName);
        let code: string;
        try {
          code = await fs.readFile(filePath, "utf8");
        } catch {
          continue;
        }

        if (!code.includes('"use client";')) continue;
        const withoutFirstDirective = code.replace('"use client";', "");
        const fixed = `"use client";\n${withoutFirstDirective.trimStart()}`;
        await fs.writeFile(filePath, fixed, "utf8");
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ["src"] }),
    preserveDirectives() as Plugin,
    cssInjectedByJsPlugin(),
    enforceUseClientFirst(),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        const ext = format === "es" ? "mjs" : "js";
        return entryName === "index" ? `index.${ext}` : `${entryName}.${ext}`;
      },
      // CSS will be inlined by cssInjectedByJsPlugin, no separate file needed
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@floating-ui/dom",
        "@base-ui/react",
        "motion",
        "motion/react",
      ],
    },
    // Don't empty outDir in watch mode (important for linked packages)
    emptyOutDir: true,
  },
});
