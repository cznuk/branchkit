import preserveDirectives from "rollup-preserve-directives";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), dts({ include: ["src"] }), preserveDirectives() as Plugin],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "auto-init": resolve(__dirname, "src/auto-init.tsx"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        const ext = format === "es" ? "mjs" : "js";
        return entryName === "index" ? `index.${ext}` : `${entryName}.${ext}`;
      },
      cssFileName: "style",
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
