import { defineConfig } from "vite";

// Relative base works for GitHub project Pages (/playable-ads/).
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
