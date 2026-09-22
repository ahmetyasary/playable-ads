import { BLOCK_CATCH_I18N } from "./mid/block-catch-i18n";
import { PUZZLE_LAB_I18N } from "./mid/puzzle-lab-i18n";

export type GuideCopy = {
  kicker: string;
  close: string;
  steps: string[];
  goal: string;
};

export type Guide = {
  title: string;
  tag: string;
  en: GuideCopy;
  tr?: GuideCopy;
};

export const guides: Record<string, Guide> = {
  "hue-pour": {
    title: "Puzzle Lab",
    tag: "Puzzle",
    en: {
      kicker: PUZZLE_LAB_I18N.en.howto,
      close: PUZZLE_LAB_I18N.en.close,
      steps: [...PUZZLE_LAB_I18N.en.steps],
      goal: PUZZLE_LAB_I18N.en.goal,
    },
    tr: {
      kicker: PUZZLE_LAB_I18N.tr.howto,
      close: PUZZLE_LAB_I18N.tr.close,
      steps: [...PUZZLE_LAB_I18N.tr.steps],
      goal: PUZZLE_LAB_I18N.tr.goal,
    },
  },
  "block-catch": {
    title: "Block Catch",
    tag: "Puzzle",
    en: {
      kicker: BLOCK_CATCH_I18N.en.howto,
      close: BLOCK_CATCH_I18N.en.close,
      steps: [...BLOCK_CATCH_I18N.en.steps],
      goal: BLOCK_CATCH_I18N.en.goal,
    },
    tr: {
      kicker: BLOCK_CATCH_I18N.tr.howto,
      close: BLOCK_CATCH_I18N.tr.close,
      steps: [...BLOCK_CATCH_I18N.tr.steps],
      goal: BLOCK_CATCH_I18N.tr.goal,
    },
  },
  "draw-path": {
    title: "Draw Path",
    tag: "Draw",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Press on the yellow orb and keep holding.",
        "Draw a line to the green gem.",
        "If you hit a wall or lift your finger, the line resets.",
      ],
      goal: "Reach the gem in one stroke, then tap INSTALL.",
    },
  },
  "tap-titan": {
    title: "Tap Titan",
    tag: "Tap",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Tap the titan as fast as you can.",
        "Watch the health bar drop.",
        "Each hit flashes damage numbers.",
      ],
      goal: "Empty the bar, then tap INSTALL.",
    },
  },
  "glow-up": {
    title: "Glow Up",
    tag: "Makeover",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Pick a hair color from the tray.",
        "Then pick a top, then pants.",
        "The look updates instantly after each tap.",
      ],
      goal: "Finish the three picks to unlock the store card.",
    },
  },
  "one-more-wave": {
    title: "One More Wave",
    tag: "Action",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Drag to move. You shoot on your own.",
        "Survive the first wave.",
        "Pick one upgrade, then fight wave 2.",
      ],
      goal: "Win or lose, the INSTALL card still closes the ad.",
    },
  },
  "aether-slash": {
    title: "Aether Slash",
    tag: "Slash",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Drag to swing a neon blade.",
        "Slice the wraiths before they pass.",
        "After enough kills the titan arrives. Cut it down.",
      ],
      goal: "Kill the titan to land on the endcard.",
    },
  },
  "orbit-heist": {
    title: "Orbit Heist",
    tag: "Gravity",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Hold the capsule and pull back to aim.",
        "The dotted line is your future orbit.",
        "Release to slingshot. Do not hit the star or planets.",
      ],
      goal: "Steal the green gem, then INSTALL.",
    },
  },
  "moon-fox": {
    title: "Moon Fox",
    tag: "Escape",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "The fox runs on her own. Tap to jump.",
        "Tap again in the air for a second jump.",
        "Clear the logs. Three hits and the hunters catch you.",
      ],
      goal: "Reach the glowing den — or get caught. Both end on INSTALL.",
    },
  },
  "rift-rush": {
    title: "Rift Rush",
    tag: "Runner",
    en: {
      kicker: "How to play",
      close: "Close",
      steps: [
        "Drag to steer the ship through the tunnel.",
        "Fly through the glowing rings.",
        "Avoid the red wedges.",
      ],
      goal: "Clear the rings — crash or finish still sells the app.",
    },
  },
};

function copyFor(guide: Guide, lang: "en" | "tr") {
  if (lang === "tr" && guide.tr) {
    return guide.tr;
  }
  return guide.en;
}

export function renderGuide(
  el: HTMLElement,
  id: string,
  lang: "en" | "tr" = "en",
) {
  const guide = guides[id];
  if (!guide) {
    el.hidden = true;
    el.dataset.game = "";
    return;
  }

  const active = guide.tr && lang === "tr" ? "tr" : "en";
  const copy = copyFor(guide, active);
  el.dataset.game = id;
  el.dataset.lang = active;
  el.hidden = true;
  el.innerHTML = `
    <button class="guide-close" type="button" aria-label="${copy.close}">${copy.close}</button>
    <p class="guide-kicker">${copy.kicker}</p>
    <div class="guide-head">
      <span class="tag">${guide.tag}</span>
      <h2>${guide.title}</h2>
    </div>
    <ol class="guide-steps">
      ${copy.steps
        .map(
          (step, i) =>
            `<li><span class="guide-num">${String(i + 1).padStart(2, "0")}</span><p>${step}</p></li>`,
        )
        .join("")}
    </ol>
    <p class="guide-goal">${copy.goal}</p>
  `;
}

export function guideHasTr(id: string) {
  return Boolean(guides[id]?.tr);
}
