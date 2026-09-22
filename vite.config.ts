import { defineConfig } from "vite";

// Relative base → works on GitHub Pages (user or project site).
export default defineConfig({
  base: "./",
  server: {
    port: 8080,
    open: true,
  },
  build: {
    outDir: "docs",
    emptyOutDir: true,
    assetsInlineLimit: 4096,
  },
});
