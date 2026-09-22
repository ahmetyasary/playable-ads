import { Container, Graphics, Rectangle } from "pixi.js";
import { SparkField } from "../fx";
import {
  GAME_H,
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  pulseHandTap,
  showEndcard,
} from "../playable";
import {
  getAppLang,
  onAppLang,
  puzzleCopy,
  type AppLang,
} from "./puzzle-lab-i18n";
import {
  playStart,
  playWin,
  startPourSfx,
  stopPourSfx,
  unlockSfx,
} from "./puzzle-lab-sfx";

const CAP = 4;
// Punchier palette closer to commercial water-sort playables.
const COLORS = [0xff4d6d, 0x2ec6ff, 0xffc83d, 0xb65cff];
const A = 0;
const B = 1;
const C = 2;
const D = 3;
const MOVE = 0.28;
const STREAM_IN = 0.14;
const UNIT = 0.3;
const STREAM_OUT = 0.12;
const BACK = 0.28;
// Commercial water-sort vial: full-width cylinder, open lip.
const BODY_HALF = 40;
const BODY_TOP = -210;
const BODY_BOTTOM = -8;
const BODY_R = 20;
const NECK_HALF = 15;
const NECK_TOP = -248;
const NECK_BOTTOM = -214;
const LIP_RY = 6;
const GLASS_STROKE = 3.5;
const LIQUID_HALF = BODY_HALF - 1.5;
const LIQUID_TOP = BODY_TOP + 2;
const LIQUID_BOTTOM = BODY_BOTTOM - 2;
const ELLIPSE_RY = 10;
const LAYER = Math.floor((LIQUID_BOTTOM - LIQUID_TOP - 14) / CAP);

type Pour = {
  from: number;
  to: number;
  color: number;
  amount: number;
  t: number;
  sx: number;
  sy: number;
  sr: number;
};

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function easeInOut(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeIn(t: number) {
  const x = clamp01(t);
  return x * x;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function damp(cur: number, target: number, dt: number, speed: number) {
  return cur + (target - cur) * (1 - Math.exp(-speed * dt));
}

function drawWoodShelf(gfx: Graphics, topY: number) {
  const x = 36;
  const w = GAME_W - 72;
  const topH = 16;
  const faceH = 30;
  const r = 14;
  const top = 0xd2b48c;
  const face = 0xa67c52;
  const edge = 0x8b5e3c;
  const grain = 0x7a4f2e;

  // Soft ground shadow
  gfx.ellipse(GAME_W / 2, topY + topH + faceH + 6, w * 0.46, 12);
  gfx.fill({ color: 0x000000, alpha: 0.32 });

  // Front face (thicker plank edge)
  gfx.roundRect(x, topY + topH - 6, w, faceH + 6, r);
  gfx.fill(face);
  gfx.roundRect(x + 3, topY + topH - 2, w - 6, faceH, r - 2);
  gfx.fill({ color: edge, alpha: 0.35 });

  // Front grain
  for (let i = 0; i < 5; i++) {
    const gy = topY + topH + 6 + i * 5;
    gfx.moveTo(x + 18 + (i % 2) * 10, gy);
    gfx.quadraticCurveTo(
      GAME_W / 2,
      gy + ((i % 2) * 2 - 1),
      x + w - 18 - (i % 2) * 8,
      gy + 0.5,
    );
    gfx.stroke({ width: 1.4, color: grain, alpha: 0.18 });
  }

  // Top deck (lighter polished wood)
  gfx.roundRect(x, topY, w, topH + 5, r);
  gfx.fill(top);
  gfx.roundRect(x + 2, topY + 2, w - 4, topH, r - 2);
  gfx.fill({ color: 0xe6d0a8, alpha: 0.35 });

  // Top grain streaks
  for (let i = 0; i < 7; i++) {
    const gy = topY + 4 + i * 2.1;
    gfx.moveTo(x + 22 + i * 7, gy);
    gfx.quadraticCurveTo(
      GAME_W / 2 + (i - 3) * 12,
      gy + ((i % 2) * 1.6 - 0.8),
      x + w - 24 - i * 5,
      gy + 0.4,
    );
    gfx.stroke({ width: 1.2, color: grain, alpha: 0.16 + (i % 3) * 0.03 });
  }

  // Front lip highlight + underside shade
  gfx.rect(x + 10, topY + topH - 1, w - 20, 2.5);
  gfx.fill({ color: 0xfff3d6, alpha: 0.45 });
  gfx.rect(x + 8, topY + topH + faceH - 5, w - 16, 4);
  gfx.fill({ color: 0x000000, alpha: 0.18 });

  // Side bevels
  gfx.roundRect(x, topY, 7, topH + faceH - 2, 4);
  gfx.fill({ color: 0xffffff, alpha: 0.12 });
  gfx.roundRect(x + w - 7, topY, 7, topH + faceH - 2, 4);
  gfx.fill({ color: 0x000000, alpha: 0.12 });
}

function rotateLocal(
  lx: number,
  ly: number,
  pose: { x: number; y: number; rot: number },
) {
  const c = Math.cos(pose.rot);
  const s = Math.sin(pose.rot);
  return {
    x: pose.x + lx * c - ly * s,
    y: pose.y + lx * s + ly * c,
  };
}

export async function startHuePour(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x1a2236);

  const wash = new Graphics();
  wash.ellipse(GAME_W / 2, 480, 340, 260);
  wash.fill({ color: 0x24304a, alpha: 0.28 });
  wash.ellipse(GAME_W / 2, 920, 300, 200);
  wash.fill({ color: 0x1e283c, alpha: 0.35 });
  world.addChild(wash);
  world.sortableChildren = true;

  const shelf = new Graphics();
  drawWoodShelf(shelf, 616);
  drawWoodShelf(shelf, 996);
  world.addChild(shelf);

  const title = label("PUZZLE LAB", 34, "#f4f7ff");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 48);
  world.addChild(title);

  let lang = getAppLang();
  let strings = puzzleCopy(lang);

  const info = label(strings.info, 16, "#c5d0ea");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 96);
  world.addChild(info);
  const installBtn = miniInstall(world, 0x4cc9f0, {
    install: strings.install,
    ok: strings.installOk,
  });

  const credit = label("Ahmet Yaşar YILDIRIM", 14, "#eef1ff");
  credit.anchor.set(0.5, 1);
  credit.style.fontWeight = "700";
  credit.alpha = 0.3;
  credit.position.set(GAME_W / 2, GAME_H - 28);
  world.addChild(credit);

  let endcard: ReturnType<typeof showEndcard> | null = null;

  function applyLang(next: AppLang) {
    lang = next;
    strings = puzzleCopy(lang);
    info.text = strings.info;
    installBtn.setCopy({
      install: strings.install,
      ok: strings.installOk,
    });
    endcard?.setCopy({
      subtitle: strings.endSubtitle,
      cta: strings.endCta,
      thanks: strings.endThanks,
    });
  }

  const stopLang = onAppLang(applyLang);
  const destroyApp = app.destroy.bind(app);
  app.destroy = ((rendererDestroy = true, options?: object) => {
    stopPourSfx();
    stopLang();
    return destroyApp(rendererDestroy, options as never);
  }) as typeof app.destroy;

  const bottles: number[][] = [
    [A, B, C, D],
    [D, A, B, C],
    [C, D, A, B],
    [B, C, D, A],
    [],
    [],
  ];

  const slots = [
    { x: 150, y: 624 },
    { x: 360, y: 624 },
    { x: 570, y: 624 },
    { x: 150, y: 1004 },
    { x: 360, y: 1004 },
    { x: 570, y: 1004 },
  ];

  const layer = new Container();
  layer.sortableChildren = true;
  world.addChild(layer);
  const sparks = new SparkField(world);
  const stream = new Graphics();
  stream.zIndex = 4;
  layer.addChild(stream);

  const wraps: Container[] = [];
  const views: {
    liquid: Container;
    fill: Graphics;
    shade: Graphics;
    gloss: Graphics;
    glass: Graphics;
  }[] = [];
  const lift = bottles.map(() => 0);
  const shake = bottles.map(() => 0);
  const slosh = bottles.map(() => 0);

  for (let i = 0; i < bottles.length; i++) {
    const wrap = new Container();
    wrap.position.copyFrom(slots[i]);
    wrap.eventMode = "static";
    wrap.cursor = "pointer";
    wrap.hitArea = new Rectangle(-58, -250, 116, 270);

    const liquidRoot = new Container();
    const maskG = new Graphics();
    // Tall body mask so gravity-leaning surfaces aren't clipped.
    maskG.roundRect(
      -BODY_HALF + 1,
      BODY_TOP - 4,
      BODY_HALF * 2 - 2,
      BODY_BOTTOM - BODY_TOP + 8,
      BODY_R,
    );
    maskG.fill(0xffffff);
    const fill = new Graphics();
    const shade = new Graphics();
    const gloss = new Graphics();
    liquidRoot.addChild(fill, shade, gloss);
    // Mask stays bottle-aligned so liquid can counter-rotate with gravity.
    wrap.addChild(liquidRoot, maskG);
    liquidRoot.mask = maskG;

    const glass = new Graphics();
    wrap.addChild(glass);
    layer.addChild(wrap);
    wraps.push(wrap);
    views.push({ liquid: liquidRoot, fill, shade, gloss, glass });
    wrap.on("pointerdown", () => onTap(i));
  }

  let selected = -1;
  let ended = false;
  let pour: Pour | null = null;
  let pourSfxOn = false;

  function armIntro() {
    unlockSfx();
    playStart();
  }

  const kickIntro = () => armIntro();
  container.addEventListener("pointerdown", kickIntro, { once: true });
  container.addEventListener("touchstart", kickIntro, { once: true });

  const hand = makeHand();
  hand.position.set(slots[0].x + 42, slots[0].y - 210);
  hand.zIndex = 20;
  world.addChild(hand);
  let tutorialDone = false;
  let idleHint = 0;

  function firstMove() {
    const from = bottles.findIndex((stack) => stack.length > 0);
    const to = bottles.findIndex((stack) => stack.length === 0);
    return {
      from: from < 0 ? 0 : from,
      to: to < 0 ? 4 : to,
    };
  }

  function vialAim(i: number) {
    return {
      x: slots[i].x + 34,
      y: slots[i].y + NECK_TOP + 20,
    };
  }

  function handGoal(dt: number) {
    const move = firstMove();
    const from = vialAim(move.from);
    const to = vialAim(move.to);
    idleHint += dt;
    const cycle = (idleHint % 3.4) / 3.4;
    // Tap source → slide → tap target → pause → repeat.
    if (cycle < 0.34) {
      return { ...from, tap: true };
    }
    if (cycle < 0.5) {
      const u = easeInOut((cycle - 0.34) / 0.16);
      return {
        x: lerp(from.x, to.x, u),
        y: lerp(from.y, to.y, u),
        tap: false,
      };
    }
    if (cycle < 0.84) {
      return { ...to, tap: true };
    }
    return { ...to, tap: false };
  }

  function topColor(stack: number[]) {
    return stack[stack.length - 1];
  }

  function runLength(stack: number[]) {
    if (stack.length === 0) {
      return 0;
    }
    const color = topColor(stack);
    let n = 0;
    for (let i = stack.length - 1; i >= 0 && stack[i] === color; i--) {
      n += 1;
    }
    return n;
  }

  function canPour(from: number, to: number) {
    if (from === to) {
      return false;
    }
    const src = bottles[from];
    const dst = bottles[to];
    if (src.length === 0 || dst.length >= CAP) {
      return false;
    }
    if (dst.length === 0) {
      return true;
    }
    return topColor(src) === topColor(dst);
  }

  function isSolved() {
    return bottles.every(
      (stack) => stack.length === 0 || stack.every((c) => c === stack[0]),
    );
  }

  function isComplete(stack: number[]) {
    return stack.length === CAP && stack.every((c) => c === stack[0]);
  }

  function flowTime(amount: number) {
    return UNIT * amount;
  }

  function pourSpan(amount: number) {
    return MOVE + STREAM_IN + flowTime(amount) + STREAM_OUT + BACK;
  }

  function volume() {
    if (!pour) {
      return 0;
    }
    const t = pour.t - MOVE - STREAM_IN;
    const flow = flowTime(pour.amount);
    if (t <= 0) {
      return 0;
    }
    if (t >= flow) {
      return pour.amount;
    }
    return easeInOut(t / flow) * pour.amount;
  }

  function pourTipLocal(dir: number) {
    // Lowest lip edge when tilted — liquid leaves here.
    return { x: dir * (NECK_HALF + 2), y: NECK_TOP + 1 };
  }

  function hoverPose(from: number, to: number) {
    const dir = slots[to].x >= slots[from].x ? 1 : -1;
    const rot = dir * 0.98;
    const tip = pourTipLocal(dir);
    // Tip sits directly above the destination mouth so the stream falls vertical.
    const tipAim = {
      x: slots[to].x,
      y: slots[to].y + NECK_TOP - 46,
    };
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return {
      x: tipAim.x - (tip.x * c - tip.y * s),
      y: tipAim.y - (tip.x * s + tip.y * c),
      rot,
    };
  }

  function poseOf(i: number) {
    if (pour && pour.from === i) {
      const hov = hoverPose(pour.from, pour.to);
      const home = { x: slots[i].x, y: slots[i].y, rot: 0 };
      const backAt = pourSpan(pour.amount) - BACK;
      if (pour.t <= MOVE) {
        const u = easeInOut(pour.t / MOVE);
        return {
          x: lerp(pour.sx, hov.x, u),
          y: lerp(pour.sy, hov.y, u),
          rot: lerp(pour.sr, hov.rot, u),
        };
      }
      if (pour.t < backAt) {
        return hov;
      }
      const u = easeInOut((pour.t - backAt) / BACK);
      return {
        x: lerp(hov.x, home.x, u),
        y: lerp(hov.y, home.y, u),
        rot: lerp(hov.rot, home.rot, u),
      };
    }
    return { x: wraps[i].x, y: wraps[i].y, rot: wraps[i].rotation };
  }

  function bands(i: number) {
    const units = bottles[i].map((color) => ({ color, h: LAYER }));
    const vol = volume();
    if (pour && i === pour.from && vol > 0) {
      let left = vol;
      for (let n = units.length - 1; n >= 0 && left > 0.001; n--) {
        if (units[n].color !== pour.color) {
          break;
        }
        const take = Math.min(1, left);
        units[n].h = LAYER * (1 - take);
        left -= take;
      }
    }
    if (pour && i === pour.to && vol > 0.02) {
      units.push({ color: pour.color, h: vol * LAYER });
    }
    const merged: { color: number; h: number }[] = [];
    for (const unit of units) {
      if (unit.h < 0.6) {
        continue;
      }
      const last = merged[merged.length - 1];
      if (last && last.color === unit.color) {
        last.h += unit.h;
      } else {
        merged.push({ color: unit.color, h: unit.h });
      }
    }
    return merged;
  }

  function fillHeight(i: number) {
    return bands(i).reduce((sum, band) => sum + band.h, 0);
  }

  function mixColor(hex: number, factor: number) {
    const r = Math.min(
      255,
      Math.max(0, Math.round(((hex >> 16) & 255) * factor)),
    );
    const g = Math.min(
      255,
      Math.max(0, Math.round(((hex >> 8) & 255) * factor)),
    );
    const b = Math.min(255, Math.max(0, Math.round((hex & 255) * factor)));
    return (r << 16) | (g << 8) | b;
  }

  function drawBottleShape(
    gfx: Graphics,
    strokeColor: number,
    fillAlpha: number,
  ) {
    // One open vessel: neck → shoulder → body → base. No horizontal lid at the shoulder.
    const leftN = -NECK_HALF - 1;
    const rightN = NECK_HALF + 1;
    const mouthY = NECK_TOP + 5;
    const shoulderY = BODY_TOP + 20;

    gfx.moveTo(leftN, mouthY);
    gfx.lineTo(leftN, NECK_BOTTOM + 1);
    gfx.quadraticCurveTo(-BODY_HALF + 4, BODY_TOP + 4, -BODY_HALF, shoulderY);
    gfx.lineTo(-BODY_HALF, BODY_BOTTOM - BODY_R);
    gfx.quadraticCurveTo(
      -BODY_HALF,
      BODY_BOTTOM,
      -BODY_HALF + BODY_R,
      BODY_BOTTOM,
    );
    gfx.lineTo(BODY_HALF - BODY_R, BODY_BOTTOM);
    gfx.quadraticCurveTo(
      BODY_HALF,
      BODY_BOTTOM,
      BODY_HALF,
      BODY_BOTTOM - BODY_R,
    );
    gfx.lineTo(BODY_HALF, shoulderY);
    gfx.quadraticCurveTo(BODY_HALF - 4, BODY_TOP + 4, rightN, NECK_BOTTOM + 1);
    gfx.lineTo(rightN, mouthY);
    gfx.fill({ color: 0xa8c8e8, alpha: fillAlpha });

    // Outer glass stroke — mouth left open (no chord across the neck)
    gfx.moveTo(leftN, mouthY);
    gfx.lineTo(leftN, NECK_BOTTOM + 1);
    gfx.quadraticCurveTo(-BODY_HALF + 4, BODY_TOP + 4, -BODY_HALF, shoulderY);
    gfx.lineTo(-BODY_HALF, BODY_BOTTOM - BODY_R);
    gfx.quadraticCurveTo(
      -BODY_HALF,
      BODY_BOTTOM,
      -BODY_HALF + BODY_R,
      BODY_BOTTOM,
    );
    gfx.lineTo(BODY_HALF - BODY_R, BODY_BOTTOM);
    gfx.quadraticCurveTo(
      BODY_HALF,
      BODY_BOTTOM,
      BODY_HALF,
      BODY_BOTTOM - BODY_R,
    );
    gfx.lineTo(BODY_HALF, shoulderY);
    gfx.quadraticCurveTo(BODY_HALF - 4, BODY_TOP + 4, rightN, NECK_BOTTOM + 1);
    gfx.lineTo(rightN, mouthY);
    gfx.stroke({
      width: GLASS_STROKE,
      color: strokeColor,
      alpha: 1,
    });

    // Soft thickness only on the rounded base
    gfx.moveTo(-BODY_HALF + 10, BODY_BOTTOM - 4);
    gfx.quadraticCurveTo(0, BODY_BOTTOM + 1, BODY_HALF - 10, BODY_BOTTOM - 4);
    gfx.stroke({ width: 2.2, color: strokeColor, alpha: 0.28 });

    // Open lip ring (hollow — no sealed plug)
    gfx.ellipse(0, NECK_TOP + 2, NECK_HALF + 5, LIP_RY + 2);
    gfx.stroke({ width: GLASS_STROKE + 0.4, color: strokeColor });
    gfx.ellipse(0, NECK_TOP + 2, NECK_HALF + 1.4, LIP_RY * 0.9);
    gfx.stroke({ width: 2, color: strokeColor, alpha: 0.7 });
    gfx.ellipse(-3, NECK_TOP + 1, NECK_HALF * 0.5, LIP_RY * 0.4);
    gfx.fill({ color: 0xffffff, alpha: 0.3 });
  }

  function drawBottle(i: number, time: number) {
    const { fill, shade, gloss, glass } = views[i];
    const chosen = selected === i;
    const pouring = pour?.from === i;
    fill.clear();
    shade.clear();
    gloss.clear();
    glass.clear();

    const rim = chosen || pouring ? 0xfff0c8 : 0xc8e0f4;

    // Contact shadow on the shelf
    glass.ellipse(1, BODY_BOTTOM + 10, 42, 7);
    glass.fill({ color: 0x000000, alpha: 0.34 });
    glass.ellipse(0, BODY_BOTTOM + 8, 28, 4);
    glass.fill({ color: 0x000000, alpha: 0.18 });

    const parts = bands(i);
    const totalH = parts.reduce((sum, band) => sum + band.h, 0);
    const maxH = LIQUID_BOTTOM - LIQUID_TOP - 6;
    const drawH = Math.min(totalH, maxH);
    const pourWobble =
      pour && (pour.from === i || pour.to === i)
        ? Math.sin(time / 70) * 1.0
        : 0;
    const energy = Math.max(slosh[i], pour ? 0.35 : 0);
    const wave = Math.sin(time / 52);
    const wave2 = Math.sin(time / 37 + i);
    const wobble = pourWobble + energy * (wave * 3.6 + wave2 * 1.4);
    const swayX = energy * Math.sin(time / 44 + i * 0.7) * 4.2;
    // Lean liquid toward the pour side (world-horizontal free surface in bottle space).
    const lean = Math.tan(wraps[i].rotation) * LIQUID_HALF;
    const leanAmt = Math.max(-22, Math.min(22, lean));

    if (parts.length && drawH > 0.5) {
      const slices: { color: number; top: number; bottom: number }[] = [];
      let cursor = LIQUID_BOTTOM;
      let drawn = 0;
      for (const band of parts) {
        const remain = drawH - drawn;
        if (remain <= 0) {
          break;
        }
        const h = Math.min(band.h, remain);
        slices.push({ color: band.color, top: cursor - h, bottom: cursor });
        cursor -= h;
        drawn += h;
      }

      for (let n = 0; n < slices.length; n++) {
        const slice = slices[n];
        const color = COLORS[slice.color];
        const topFace = mixColor(color, 1.14);
        const midFace = mixColor(color, 1.04);
        const underFace = mixColor(color, 0.72);
        const isTop = n === slices.length - 1;
        const depth = (n + 1) / slices.length;
        const layerWobble = wobble * (isTop ? 1 : 0.35 * depth);
        const layerSway = swayX * (isTop ? 1 : 0.4 * depth);
        const surfaceY = slice.top + layerWobble;
        const topL = surfaceY + leanAmt;
        const topR = surfaceY - leanAmt;
        const botL = slice.bottom + leanAmt * 0.15;
        const botR = slice.bottom - leanAmt * 0.15;
        const midY = (Math.min(topL, topR) + slice.bottom) * 0.5;

        // Leaning slab — pools toward the low / pour side
        fill.poly(
          [
            -LIQUID_HALF,
            topL,
            LIQUID_HALF,
            topR,
            LIQUID_HALF,
            botR + ELLIPSE_RY * 0.4,
            -LIQUID_HALF,
            botL + ELLIPSE_RY * 0.4,
          ],
          true,
        );
        fill.fill(color);
        fill.poly(
          [
            -LIQUID_HALF,
            midY,
            LIQUID_HALF,
            midY - leanAmt * 0.1,
            LIQUID_HALF,
            botR,
            -LIQUID_HALF,
            botL,
          ],
          true,
        );
        fill.fill({ color: underFace, alpha: 0.32 });
        fill.poly(
          [
            -LIQUID_HALF,
            topL,
            LIQUID_HALF,
            topR,
            LIQUID_HALF,
            topR + (slice.bottom - surfaceY) * 0.28,
            -LIQUID_HALF,
            topL + (slice.bottom - surfaceY) * 0.28,
          ],
          true,
        );
        fill.fill({ color: midFace, alpha: 0.26 });

        // Side volume shading
        shade.poly(
          [
            -LIQUID_HALF,
            topL,
            -LIQUID_HALF + 12,
            topL - leanAmt * 0.05,
            -LIQUID_HALF + 12,
            botL,
            -LIQUID_HALF,
            botL,
          ],
          true,
        );
        shade.fill({ color: 0xffffff, alpha: 0.16 });
        shade.poly(
          [
            LIQUID_HALF - 13,
            topR + leanAmt * 0.05,
            LIQUID_HALF,
            topR,
            LIQUID_HALF,
            botR,
            LIQUID_HALF - 13,
            botR,
          ],
          true,
        );
        shade.fill({ color: 0x000000, alpha: 0.16 });

        // Slanted underside between layers
        fill.poly(
          [
            -LIQUID_HALF,
            botL - 1,
            LIQUID_HALF,
            botR - 1,
            LIQUID_HALF,
            botR + ELLIPSE_RY * 0.85,
            -LIQUID_HALF,
            botL + ELLIPSE_RY * 0.85,
          ],
          true,
        );
        fill.fill(underFace);

        // Slanted top lid
        fill.poly(
          [
            -LIQUID_HALF,
            topL - ELLIPSE_RY * 0.15,
            LIQUID_HALF,
            topR - ELLIPSE_RY * 0.15,
            LIQUID_HALF,
            topR + ELLIPSE_RY * 0.95,
            -LIQUID_HALF,
            topL + ELLIPSE_RY * 0.95,
          ],
          true,
        );
        fill.fill(color);
        fill.poly(
          [
            -LIQUID_HALF + 1,
            topL,
            LIQUID_HALF - 1,
            topR,
            LIQUID_HALF - 1,
            topR + ELLIPSE_RY * 0.7,
            -LIQUID_HALF + 1,
            topL + ELLIPSE_RY * 0.7,
          ],
          true,
        );
        fill.fill(topFace);

        // Front crescent along the slanted surface
        const crestY = (topL + topR) * 0.5 + ELLIPSE_RY * 0.35;
        gloss.ellipse(
          layerSway,
          crestY,
          LIQUID_HALF * 0.9,
          ELLIPSE_RY * 0.4,
        );
        gloss.fill({ color: 0xffffff, alpha: isTop ? 0.32 : 0.14 });
        gloss.ellipse(
          -LIQUID_HALF * 0.32 + layerSway + leanAmt * 0.08,
          (topL + topR) * 0.5 - 0.6,
          LIQUID_HALF * 0.38,
          ELLIPSE_RY * 0.3,
        );
        gloss.fill({ color: 0xffffff, alpha: isTop ? 0.48 : 0.2 });
      }

      if (energy > 0.08 || (pour && (pour.from === i || pour.to === i))) {
        const top = slices[slices.length - 1].top + wobble;
        for (let b = 0; b < 3; b++) {
          gloss.circle(
            -8 + b * 8 + Math.sin(time / 90 + b) * 1.5 + swayX * 0.4,
            top + 10 + b * 5,
            1.4,
          );
          gloss.fill({ color: 0xffffff, alpha: 0.35 + energy * 0.2 });
        }
      }

      // Impact ripples on the receiving surface
      if (pour && pour.to === i && volume() > 0.05) {
        const top = slices[slices.length - 1].top + wobble;
        const pulse = (Math.sin(time / 55) + 1) * 0.5;
        gloss.ellipse(0, top + 1, LIQUID_HALF * (0.55 + pulse * 0.2), ELLIPSE_RY * 0.55);
        gloss.stroke({ width: 2, color: 0xffffff, alpha: 0.35 + pulse * 0.2 });
        gloss.ellipse(0, top + 2, LIQUID_HALF * (0.32 + pulse * 0.12), ELLIPSE_RY * 0.32);
        gloss.stroke({ width: 1.5, color: 0xffffff, alpha: 0.28 });
        for (let d = 0; d < 4; d++) {
          const ang = time / 80 + d * 1.7;
          gloss.circle(
            Math.cos(ang) * (10 + d * 3),
            top + 4 + Math.sin(time / 60 + d) * 2,
            1.6 - d * 0.2,
          );
          gloss.fill({ color: 0xffffff, alpha: 0.55 });
        }
      }
    }

    if (isComplete(bottles[i]) && !pour) {
      glass.circle(0, -120, 48);
      glass.fill({ color: COLORS[bottles[i][0]], alpha: 0.1 });
    }

    drawBottleShape(glass, rim, 0.055);

    // Inner wall hint — sides only, never a top lid across the shoulder
    glass.moveTo(-BODY_HALF + 5, BODY_TOP + 24);
    glass.lineTo(-BODY_HALF + 5, BODY_BOTTOM - BODY_R);
    glass.stroke({ width: 1.5, color: 0xffffff, alpha: 0.14 });
    glass.moveTo(BODY_HALF - 5, BODY_TOP + 24);
    glass.lineTo(BODY_HALF - 5, BODY_BOTTOM - BODY_R);
    glass.stroke({ width: 1.5, color: 0xffffff, alpha: 0.1 });

    // Soft glass bloom on left
    glass.ellipse(-BODY_HALF + 14, -128, 7, 70);
    glass.fill({ color: 0xffffff, alpha: 0.1 });
    // Sharp vertical speculars
    glass.ellipse(-BODY_HALF + 11, -130, 3.4, 64);
    glass.fill({ color: 0xffffff, alpha: 0.5 });
    glass.ellipse(-BODY_HALF + 9, -136, 1.7, 46);
    glass.fill({ color: 0xffffff, alpha: 0.7 });
    glass.ellipse(BODY_HALF - 10, -118, 1.6, 38);
    glass.fill({ color: 0xffffff, alpha: 0.18 });
    // Shoulder sparkle (vertical, not a sealed shelf)
    glass.ellipse(-BODY_HALF + 16, BODY_TOP + 28, 5, 10);
    glass.fill({ color: 0xffffff, alpha: 0.22 });
  }

  function ribbon(
    gfx: Graphics,
    pts: { x: number; y: number }[],
    width: number,
    color: number,
    alpha: number,
  ) {
    if (pts.length < 2) {
      return;
    }
    const left: number[] = [];
    const right: number[] = [];
    const last = pts.length - 1;
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(last, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const u = i / last;
      // Even column with a soft flare only at the impact.
      const profile = 1 + (u > 0.88 ? (u - 0.88) * 1.8 : 0);
      const w = width * profile;
      left.push(pts[i].x + nx * w, pts[i].y + ny * w);
      right.push(pts[i].x - nx * w, pts[i].y - ny * w);
    }
    const verts = left.slice();
    for (let i = pts.length - 1; i >= 0; i--) {
      verts.push(right[i * 2], right[i * 2 + 1]);
    }
    gfx.poly(verts, true);
    gfx.fill({ color, alpha });
  }

  function drawStream() {
    stream.clear();
    if (!pour) {
      return;
    }
    const start = MOVE;
    const flow = flowTime(pour.amount);
    const hold = start + STREAM_IN + flow;
    const gone = hold + STREAM_OUT;
    if (pour.t < start || pour.t > gone) {
      return;
    }
    let head = 1;
    let tail = 0;
    if (pour.t < start + STREAM_IN) {
      head = easeIn((pour.t - start) / STREAM_IN);
    }
    if (pour.t > hold) {
      tail = easeIn((pour.t - hold) / STREAM_OUT);
    }
    if (head - tail < 0.02) {
      return;
    }

    const src = poseOf(pour.from);
    const dir = slots[pour.to].x >= slots[pour.from].x ? 1 : -1;
    const lip = pourTipLocal(Math.sign(src.rot) || dir);
    const p0 = rotateLocal(lip.x, lip.y, src);
    // Top face of liquid already in the destination vial (world Y).
    const surfaceY =
      slots[pour.to].y + LIQUID_BOTTOM - fillHeight(pour.to) + ELLIPSE_RY * 0.35;
    const destX = slots[pour.to].x;
    const fallX = lerp(p0.x, destX, 0.9);
    // Stream must reach the liquid surface — never stop at the neck.
    const p2 = { x: fallX, y: Math.max(surfaceY, p0.y + 24) };
    const origin = { x: fallX, y: p0.y + 2 };

    const pts: { x: number; y: number }[] = [];
    const span = head - tail;
    const steps = Math.max(18, Math.ceil(28 * span));
    for (let i = 0; i <= steps; i++) {
      const u = tail + (span * i) / steps;
      const y = lerp(origin.y, p2.y, u);
      pts.push({ x: fallX, y });
    }

    const color = COLORS[pour.color];
    const hi = mixColor(color, 1.2);
    const lo = mixColor(color, 0.78);
    const coreW = 5.6;
    const glowW = 8.2;

    // Soft outer glow
    ribbon(stream, pts, glowW, color, 0.18);
    // Core column down to the liquid
    ribbon(stream, pts, coreW, color, 1);
    // Specular edge
    ribbon(stream, pts, 1.7, 0xffffff, 0.4);
    const edgePts = pts.map((p) => ({ x: p.x + 1.7, y: p.y }));
    ribbon(stream, edgePts, 1.15, lo, 0.38);

    // Bridge from lip into the column
    stream.moveTo(p0.x, p0.y);
    stream.lineTo(fallX, origin.y + 3);
    stream.stroke({ width: 10, color, alpha: 0.5 });
    stream.moveTo(p0.x, p0.y);
    stream.lineTo(fallX, origin.y + 3);
    stream.stroke({ width: 6, color, alpha: 1 });

    // Lip meniscus
    stream.ellipse(p0.x, p0.y + 1, 7.5, 4.2);
    stream.fill({ color, alpha: 0.95 });
    stream.ellipse(p0.x - dir * 1.2, p0.y, 3.4, 2.1);
    stream.fill({ color: hi, alpha: 0.55 });
    stream.ellipse(fallX, origin.y + 2, 5.5, 3.2);
    stream.fill({ color, alpha: 0.95 });

    // Traveling highlight glints down the column
    const tNow = app.ticker.lastTime;
    for (let d = 0; d < 3; d++) {
      const u = ((pour.t * 2.1 + d * 0.28) % 1) * span + tail;
      if (u < tail + 0.04 || u > head - 0.04) {
        continue;
      }
      const y = lerp(origin.y, p2.y, (u - tail) / Math.max(span, 0.001));
      stream.ellipse(fallX - 1.3, y, 1.5, 2.6);
      stream.fill({ color: 0xffffff, alpha: 0.3 });
    }

    // Impact where the stream meets the destination liquid
    if (head > 0.92) {
      const tip = pts[pts.length - 1];
      const pulse = 0.88 + 0.12 * Math.sin(tNow / 45);
      stream.ellipse(tip.x, tip.y + 1, 14 * pulse, 6);
      stream.fill({ color, alpha: 0.42 });
      stream.ellipse(tip.x, tip.y, 9.5, 4);
      stream.fill({ color, alpha: 0.9 });
      stream.ellipse(tip.x - 2.5, tip.y - 0.8, 4, 1.8);
      stream.fill({ color: 0xffffff, alpha: 0.35 });
      stream.ellipse(tip.x, tip.y + 2, LIQUID_HALF * 0.55 * pulse, ELLIPSE_RY * 0.55);
      stream.stroke({ width: 1.8, color: 0xffffff, alpha: 0.28 });
      stream.ellipse(tip.x, tip.y + 4, LIQUID_HALF * 0.35, ELLIPSE_RY * 0.35);
      stream.stroke({ width: 1.2, color: hi, alpha: 0.35 });
    }
  }

  function bumpInvalid(i: number) {
    shake[i] = 10;
  }

  function startPour(from: number, to: number) {
    const color = topColor(bottles[from]);
    const amount = Math.min(runLength(bottles[from]), CAP - bottles[to].length);
    pour = {
      from,
      to,
      color,
      amount,
      t: 0,
      sx: wraps[from].x,
      sy: wraps[from].y,
      sr: wraps[from].rotation,
    };
    lift[from] = 0;
    selected = -1;
    slosh[from] = Math.max(slosh[from], 1.1);
    slosh[to] = Math.max(slosh[to], 0.85);
    // Arm liquid-flow SFX for the fill window between vials.
    pourSfxOn = false;
    if (!tutorialDone) {
      tutorialDone = true;
      hand.visible = false;
      pulseHandTap(hand, 0, false);
    }
  }

  function finishPour() {
    if (!pour) {
      return;
    }
    if (pourSfxOn) {
      stopPourSfx();
      pourSfxOn = false;
    }
    for (let n = 0; n < pour.amount; n++) {
      bottles[pour.from].pop();
      bottles[pour.to].push(pour.color);
    }
    pour = null;
    if (isSolved()) {
      win();
    }
  }

  function win() {
    ended = true;
    hand.visible = false;
    info.visible = false;
    stopPourSfx();
    pourSfxOn = false;
    playWin();
    for (let i = 0; i < bottles.length; i++) {
      if (bottles[i].length) {
        sparks.burst(
          slots[i].x,
          slots[i].y - 110,
          COLORS[bottles[i][0]],
          16,
          5,
        );
      }
    }
    endcard = showEndcard(app, world, {
      title: "Puzzle Lab",
      subtitle: strings.endSubtitle,
      accent: 0x4cc9f0,
      icon: 0xffd166,
      cta: strings.endCta,
      thanks: strings.endThanks,
    });
  }

  function onTap(i: number) {
    armIntro();
    if (ended || pour) {
      return;
    }
    info.visible = false;

    if (selected < 0) {
      if (bottles[i].length === 0) {
        bumpInvalid(i);
        return;
      }
      selected = i;
      slosh[i] = Math.max(slosh[i], 1.25);
      return;
    }
    if (selected === i) {
      selected = -1;
      slosh[i] = Math.max(slosh[i], 1.25);
      return;
    }
    if (!canPour(selected, i)) {
      bumpInvalid(i);
      if (bottles[i].length > 0) {
        slosh[selected] = Math.max(slosh[selected], 0.7);
        selected = i;
        slosh[i] = Math.max(slosh[i], 1.25);
      }
      return;
    }
    startPour(selected, i);
  }

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    const time = app.ticker.lastTime;
    sparks.tick(ticker.deltaTime);

    if (pour && !ended) {
      pour.t += dt;
      const streamStart = MOVE + STREAM_IN * 0.35;
      const streamEnd = MOVE + STREAM_IN + flowTime(pour.amount) + STREAM_OUT * 0.5;
      if (!pourSfxOn && pour.t >= streamStart && pour.t < streamEnd) {
        unlockSfx();
        startPourSfx();
        pourSfxOn = true;
      }
      if (pourSfxOn && pour.t >= streamEnd) {
        stopPourSfx();
        pourSfxOn = false;
      }
      if (pour.t >= pourSpan(pour.amount)) {
        finishPour();
      }
    }

    for (let i = 0; i < wraps.length; i++) {
      const pouringFrom = pour?.from === i;
      const wantLift = selected === i ? 26 : 0;
      const before = lift[i];
      lift[i] = damp(lift[i], wantLift, dt, 14);
      const liftSpeed = Math.abs(lift[i] - before) / Math.max(dt, 0.0001);
      // Keep liquid rocking while the bottle rides up or down.
      if (liftSpeed > 8) {
        slosh[i] = Math.max(slosh[i], Math.min(1.35, liftSpeed / 40));
      }
      slosh[i] *= Math.pow(0.12, dt);
      shake[i] *= Math.pow(0.0004, dt);

      if (pouringFrom && pour) {
        const pose = poseOf(i);
        wraps[i].position.set(pose.x, pose.y);
        wraps[i].rotation = pose.rot;
        wraps[i].zIndex = 5;
      } else {
        wraps[i].x = slots[i].x + Math.sin(time / 26) * shake[i];
        wraps[i].y = slots[i].y - lift[i];
        wraps[i].rotation = damp(wraps[i].rotation, 0, dt, 16);
        wraps[i].zIndex = selected === i ? 2 : 0;
      }

      // Liquid stays bottle-aligned; lean is drawn into the bands themselves.
      const liq = views[i].liquid;
      liq.rotation = 0;
      liq.x = 0;
      liq.y = 0;

      if (pour && pour.to === i && volume() > 0.04) {
        slosh[i] = Math.max(slosh[i], 0.95);
      }
      if (pour && pour.from === i && volume() > 0.04) {
        slosh[i] = Math.max(slosh[i], 0.7);
      }

      wraps[i].scale.set(1);
      drawBottle(i, time);
    }

    drawStream();
    if (hand.visible && !tutorialDone) {
      const goal = handGoal(dt);
      hand.x = damp(hand.x, goal.x, dt, 8);
      hand.y = damp(hand.y, goal.y, dt, 8);
      const press = goal.tap ? (Math.sin(time / 90) * 0.5 + 0.5) * 8 : 0;
      hand.y += press;
      hand.rotation = damp(hand.rotation, -0.2, dt, 6);
      const squash = goal.tap ? 1 - press * 0.012 : 1;
      hand.scale.set(1 * (2 - squash), 1 * squash);
      pulseHandTap(hand, time, goal.tap);
    } else {
      pulseHandTap(hand, time, false);
    }
  });

  return app;
}
