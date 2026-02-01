import React from "react";
import { createRoot } from "react-dom/client";
import { UIFork } from "./components/UIFork";
// Import CSS so it's included when bundled
import "./components/UIFork.module.css";

/**
 * Injects the UIFork CSS stylesheet into the document head.
 * Checks if it's already injected to avoid duplicates.
 */
function injectStyles() {
  // Check if stylesheet is already injected
  if (document.getElementById("uifork-styles")) {
    return;
  }

  const link = document.createElement("link");
  link.id = "uifork-styles";
  link.rel = "stylesheet";

  // Try to resolve the CSS path using import.meta.url
  // This works when the module is loaded as an ES module
  if (typeof import.meta !== "undefined" && import.meta.url) {
    const baseUrl = import.meta.url.substring(0, import.meta.url.lastIndexOf("/"));
    link.href = `${baseUrl}/style.css`;
  } else {
    // Fallback: try to resolve relative to current script
    const scripts = document.getElementsByTagName("script");
    if (scripts.length > 0) {
      const currentScript = scripts[scripts.length - 1] as HTMLScriptElement;
      if (currentScript.src) {
        const baseUrl = currentScript.src.substring(0, currentScript.src.lastIndexOf("/"));
        link.href = `${baseUrl}/style.css`;
      } else {
        // Last resort: use package-relative path
        link.href = "uifork/style.css";
      }
    } else {
      // Last resort: use package-relative path
      link.href = "uifork/style.css";
    }
  }

  document.head.appendChild(link);
}

/**
 * Auto-initializes UIFork by mounting it to the DOM.
 * This should only be called in development mode.
 */
function initUIFork(port: number = 3001) {
  injectStyles();

  // Check if already initialized
  if (document.getElementById("uifork-root")) {
    return;
  }

  // Create root container
  const root = document.createElement("div");
  root.id = "uifork-root";
  document.body.appendChild(root);

  // Mount UIFork component
  const reactRoot = createRoot(root);
  console.log("UIFork mounting component");
  reactRoot.render(React.createElement(UIFork, { port }));
}

// Auto-initialize if this is a direct import (not a library import)
if (typeof window !== "undefined") {
  // Get port from data attribute or default to 3001
  const portAttr = document.documentElement.getAttribute("data-uifork-port");
  const port = portAttr ? parseInt(portAttr, 10) : 3001;

  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initUIFork(port));
  } else {
    initUIFork(port);
  }
}

// Export for manual initialization if needed
export { initUIFork };
