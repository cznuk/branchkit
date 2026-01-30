import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/global.tsx"),
      name: "UIFork",
      formats: ["iife"],
      fileName: () => "index.global.js",
    },
    cssCodeSplit: false,
    rollupOptions: {
      // Don't externalize React/ReactDOM - bundle them for global script
      output: {
        // Ensure the global variable name
        name: "UIFork",
        // Inline CSS into the JS bundle for global script
        inlineDynamicImports: true,
        // Extract CSS to a separate file
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.global.css";
          }
          return assetInfo.name || "asset";
        },
      },
    },
    // Don't empty outDir in watch mode (important for linked packages)
    emptyOutDir: false,
  },
});
