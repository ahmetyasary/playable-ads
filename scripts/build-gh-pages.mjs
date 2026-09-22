/**
 * Build static GitHub Pages site:
 * docs/index.html (hub) + one self-contained HTML per game.
 */
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

rmSync(resolve(root, "docs"), { recursive: true, force: true });

let first = true;
for (const id of games) {
  console.log(`Building ${id}.html …`);
  await build({
    configFile: false,
    root,
    plugins: [viteSingleFile()],
    publicDir: false,
    build: {
      outDir: "docs",
      emptyOutDir: first,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      rollupOptions: {
        input: resolve(root, `${id}.html`),
      },
    },
  });
  first = false;
}

writeFileSync(
  resolve(root, "docs/index.html"),
  readFileSync(resolve(root, "gh-pages/index.html"), "utf8"),
);
copyFileSync(
  resolve(root, "public/favicon.png"),
  resolve(root, "docs/favicon.png"),
);

console.log("Done → docs/index.html +", games.map((g) => `${g}.html`).join(", "));
