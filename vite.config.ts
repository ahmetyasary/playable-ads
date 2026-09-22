import { defineConfig } from "vite";

// Project Pages: https://ahmetyasary.github.io/playable-ads/
export default defineConfig({
  base: "/playable-ads/",
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
