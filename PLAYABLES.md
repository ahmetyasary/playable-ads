# Playable Ads Portfolio

Four short PixiJS playables for a **Playable Ads Developer** application.

Two are written at **junior** level (one file, one mechanic, programmer art).  
Two are written at **mid** level (clear funnel, juice, a bit of structure).

All copy is English. Open the homepage, then pick a card.

| # | Playable        | Level   | Interaction      | Route              |
|---|-----------------|---------|------------------|--------------------|
| 1 | Draw Path       | Junior  | Draw             | `#/draw-path`      |
| 2 | Tap Titan       | Junior  | Tap              | `#/tap-titan`      |
| 3 | Glow Up         | Mid     | Choice / UI      | `#/glow-up`        |
| 4 | One More Wave   | Mid     | Drag + auto fire | `#/one-more-wave`  |

---

## 1. Draw Path — Junior

**Idea:** Draw a line from the yellow circle to the green one. Grey blocks are walls.

**Loop:** Start on yellow → keep the pointer down → reach green. Hit a wall or lift the finger and the line is cleared.

**End:** `You win!` + `Install`

**Why it is junior:** One mechanic. Rectangles and circles. No interpolation, no particles, no screen manager. A first-week Pixi exercise that still has a playable CTA.

**File:** `src/jr/draw-path.ts`

---

## 2. Tap Titan — Junior

**Idea:** Tap the big boss until the health bar is empty.

**Loop:** Each tap deals damage and spits a `+10`. Bar hits zero → win.

**End:** `You win!` + `Install`

**Why it is junior:** Only tap. No upgrades, no rage mode, no chests. HP + text + button.

**Why it is not Draw Path:** Input is tap, not draw. The lesson is UI (bar, numbers), not a polyline.

**File:** `src/jr/tap-titan.ts`

---

## 3. Glow Up — Mid

**Idea:** A makeover playable. The character looks washed out. Pick hair, then top, then pants. Reveal the new look.

**Loop:** 3 steps × 3 color options. First tap is taught with a finger hint. After the last pick, a short reveal, then the store card.

**End:** `New look unlocked` + `Install` (CTA is the point, not a long dress-up sim)

**Why it is mid:** Step state, option UI, hint that goes away, reveal, endcard. This is the commercial playable shape used in fashion / casual ads.

**Why it is not the junior games:** No combat, no drawing. The skill is funnel and UI, not hit-tests.

**File:** `src/mid/glow-up.ts`

---

## 4. One More Wave — Mid

**Idea:** Tiny survivor arena. You drag to move. The character shoots on its own. Enemies walk in from the edges.

**Loop:** First wave → pick 1 of 3 upgrades (speed / range / multi-shot) → a denser second wave → the ad hits a wall and asks for install.

**End:** `The horde never ends` + `Install` (win or lose still sells the full game)

**Why it is mid:** Spawn, pooling, delta time, upgrade cards, fail/win both go to CTA. This is the action-playable shape.

**Why it is not Glow Up:** Systems and combat, not wardrobe UI.

**File:** `src/mid/one-more-wave.ts`

---

## What we are not doing

- No merge / drop / orb game (too common as a first recommendation)
- No shared “game engine” wrapping the junior files (that would hide the junior work)
- No extra levels, audio packs, or atlases
