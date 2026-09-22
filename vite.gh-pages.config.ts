import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

const games = [
  "puzzle-lab",
  "block-catch",
  "draw-path",
  "tap-titan",
  "glow-up",
  "one-more-wave",
  "aether-slash",
  "orbit-heist",
  "moon-fox",
  "rift-rush",
];

export default defineConfig({
  plugins: [viteSingleFile()],
  publicDir: false,
  build: {
    outDir: "docs",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: Object.fromEntries(
        games.map((id) => [id, resolve(`${id}.html`)]),
      ),
    },
  },
});
