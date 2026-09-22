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
  blockCopy,
  getAppLang,
  onAppLang,
  type AppLang,
} from "./block-catch-i18n";
import {
  playClear,
  playInvalid,
  playPickup,
  playPlace,
  playStart,
  playWin,
  unlockSfx,
} from "./block-catch-sfx";

const GRID = 8;
const CELL = 66;
const GAP = 4;
const BOARD = GRID * CELL + (GRID + 1) * GAP;
const BOARD_X = (GAME_W - BOARD) / 2;
const BOARD_Y = 168;

const COLORS = {
  board: 0x1c2740,
  cell: 0x243352,
  cellHi: 0x2c3d5c,
  ghostOk: 0x4ade80,
  ghostBad: 0xf87171,
  fill: [0x38bdf8, 0xfbbf24, 0xf472b6, 0xa78bfa, 0x34d399, 0xfb923c],
} as const;

type Shape = { r: number; c: number }[];

const SHAPES: Record<string, Shape> = {
  I4: [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: 2 },
    { r: 0, c: 3 },
  ],
  O: [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
  ],
  O2: [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
  ],
};

type TrayPiece = {
  id: number;
  shape: Shape;
  color: number;
  homeX: number;
  homeY: number;
  used: boolean;
};

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function easeInOut(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function damp(cur: number, target: number, dt: number, speed: number) {
  return cur + (target - cur) * (1 - Math.exp(-speed * dt));
}

function shapeBounds(shape: Shape) {
  let maxR = 0;
  let maxC = 0;
  for (const p of shape) {
    maxR = Math.max(maxR, p.r);
    maxC = Math.max(maxC, p.c);
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

function cellOrigin(r: number, c: number) {
  return {
    x: BOARD_X + GAP + c * (CELL + GAP),
    y: BOARD_Y + GAP + r * (CELL + GAP),
  };
}

function cellCenter(r: number, c: number) {
  const o = cellOrigin(r, c);
  return { x: o.x + CELL / 2, y: o.y + CELL / 2 };
}

/** Handcrafted board: three clear gaps for I4 + two O squares. */
function makeBoard(): number[][] {
  const b = Array.from({ length: GRID }, () => Array(GRID).fill(0));
  const paint = (r: number, c: number, color: number) => {
    if (r >= 0 && r < GRID && c >= 0 && c < GRID) {
      b[r][c] = color;
    }
  };
  const base = 0x5b6b8c;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      paint(r, c, base);
    }
  }
  // Top-right 2×2 hole for O
  paint(0, 6, 0);
  paint(0, 7, 0);
  paint(1, 6, 0);
  paint(1, 7, 0);
  // Mid row hole for I4
  paint(3, 2, 0);
  paint(3, 3, 0);
  paint(3, 4, 0);
  paint(3, 5, 0);
  // Bottom-left 2×2 hole for O
  paint(6, 0, 0);
  paint(6, 1, 0);
  paint(7, 0, 0);
  paint(7, 1, 0);
  return b;
}

export async function startBlockCatch(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x121a2b);
  world.sortableChildren = true;

  const wash = new Graphics();
  wash.ellipse(GAME_W / 2, 420, 360, 280);
  wash.fill({ color: 0x1a2744, alpha: 0.45 });
  wash.ellipse(GAME_W / 2, 980, 320, 220);
  wash.fill({ color: 0x162238, alpha: 0.5 });
  world.addChild(wash);

  const title = label("BLOCK CATCH", 34, "#f4f7ff");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 40);
  world.addChild(title);

  let lang = getAppLang();
  let strings = blockCopy(lang);

  const info = label(strings.info, 15, "#c5d0ea");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.style.wordWrap = true;
  info.style.wordWrapWidth = 560;
  info.position.set(GAME_W / 2, 88);
  world.addChild(info);

  const installBtn = miniInstall(world, 0xfbbf24, {
    install: strings.install,
    ok: strings.installOk,
  });

  const scoreTag = label(strings.score, 14, "#9aa3d0");
  scoreTag.anchor.set(0, 0.5);
  scoreTag.style.fontWeight = "700";
  scoreTag.position.set(36, 46);
  world.addChild(scoreTag);

  const scoreVal = label("0", 28, "#fbbf24");
  scoreVal.anchor.set(0, 0.5);
  scoreVal.position.set(36, 74);
  world.addChild(scoreVal);

  const credit = label("Ahmet Yaşar YILDIRIM", 14, "#eef1ff");
  credit.anchor.set(0.5, 1);
  credit.style.fontWeight = "700";
  credit.alpha = 0.3;
  credit.position.set(GAME_W / 2, GAME_H - 28);
  world.addChild(credit);

  let endcard: ReturnType<typeof showEndcard> | null = null;
  let score = 0;
  let ended = false;
  let placedCount = 0;

  function applyLang(next: AppLang) {
    lang = next;
    strings = blockCopy(lang);
    info.text = strings.info;
    scoreTag.text = strings.score;
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
    stopLang();
    return destroyApp(rendererDestroy, options as never);
  }) as typeof app.destroy;

  const boardGfx = new Graphics();
  world.addChild(boardGfx);

  const boardFrame = new Graphics();
  boardFrame.roundRect(BOARD_X - 10, BOARD_Y - 10, BOARD + 20, BOARD + 20, 22);
  boardFrame.fill(0x0e1524);
  boardFrame.stroke({ width: 2, color: 0x2a3a5c });
  world.addChildAt(boardFrame, world.getChildIndex(boardGfx));

  const ghostGfx = new Graphics();
  world.addChild(ghostGfx);

  const sparks = new SparkField(world);

  const board = makeBoard();

  const trayY = 980;
  const traySlots = [160, 360, 560];
  const pieces: TrayPiece[] = [
    {
      id: 0,
      shape: SHAPES.I4,
      color: COLORS.fill[0],
      homeX: traySlots[0],
      homeY: trayY,
      used: false,
    },
    {
      id: 1,
      shape: SHAPES.O,
      color: COLORS.fill[1],
      homeX: traySlots[1],
      homeY: trayY,
      used: false,
    },
    {
      id: 2,
      shape: SHAPES.O2,
      color: COLORS.fill[2],
      homeX: traySlots[2],
      homeY: trayY,
      used: false,
    },
  ];

  const trayShelf = new Graphics();
  trayShelf.roundRect(48, 900, GAME_W - 96, 200, 24);
  trayShelf.fill({ color: 0x0e1524, alpha: 0.85 });
  trayShelf.stroke({ width: 2, color: 0x2a3a5c });
  world.addChild(trayShelf);

  type PieceView = {
    root: Container;
    body: Graphics;
    piece: TrayPiece;
  };

  const views: PieceView[] = [];

  function drawBlockCell(
    gfx: Graphics,
    x: number,
    y: number,
    color: number,
    alpha = 1,
    size = CELL,
  ) {
    const r = 10;
    gfx.roundRect(x, y, size, size, r);
    gfx.fill({ color, alpha });
    gfx.roundRect(x + 3, y + 3, size - 6, size * 0.38, r - 2);
    gfx.fill({ color: 0xffffff, alpha: 0.22 * alpha });
    gfx.roundRect(x + 4, y + size - 10, size - 8, 5, 3);
    gfx.fill({ color: 0x000000, alpha: 0.18 * alpha });
  }

  function paintPiece(view: PieceView, scale = 1, alpha = 1) {
    const { body, piece } = view;
    body.clear();
    if (piece.used) {
      return;
    }
    const bounds = shapeBounds(piece.shape);
    const unit = CELL * 0.55 * scale;
    const gap = GAP * 0.55 * scale;
    const w = bounds.cols * unit + (bounds.cols - 1) * gap;
    const h = bounds.rows * unit + (bounds.rows - 1) * gap;
    for (const p of piece.shape) {
      const x = -w / 2 + p.c * (unit + gap);
      const y = -h / 2 + p.r * (unit + gap);
      drawBlockCell(body, x, y, piece.color, alpha, unit);
    }
  }

  function piecePixelSize(shape: Shape, scale: number) {
    const bounds = shapeBounds(shape);
    const unit = CELL * scale;
    const gap = GAP * scale;
    return {
      w: bounds.cols * unit + (bounds.cols - 1) * gap,
      h: bounds.rows * unit + (bounds.rows - 1) * gap,
      unit,
      gap,
    };
  }

  for (const piece of pieces) {
    const root = new Container();
    root.position.set(piece.homeX, piece.homeY);
    root.eventMode = "static";
    root.cursor = "pointer";
    const body = new Graphics();
    root.addChild(body);
    const size = piecePixelSize(piece.shape, 0.55);
    root.hitArea = new Rectangle(
      -size.w / 2 - 12,
      -size.h / 2 - 12,
      size.w + 24,
      size.h + 24,
    );
    world.addChild(root);
    const view: PieceView = { root, body, piece };
    paintPiece(view);
    views.push(view);
  }

  function redrawBoard(flashRows: number[] = [], flashCols: number[] = []) {
    boardGfx.clear();
    boardGfx.roundRect(BOARD_X, BOARD_Y, BOARD, BOARD, 16);
    boardGfx.fill(COLORS.board);
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const { x, y } = cellOrigin(r, c);
        const filled = board[r][c] > 0;
        const flash = flashRows.includes(r) || flashCols.includes(c);
        if (filled) {
          drawBlockCell(
            boardGfx,
            x,
            y,
            flash ? 0xffffff : board[r][c],
            flash ? 0.95 : 1,
          );
        } else {
          boardGfx.roundRect(x, y, CELL, CELL, 10);
          boardGfx.fill(flash ? 0x3d5a80 : COLORS.cell);
        }
      }
    }
  }

  redrawBoard();

  let drag: {
    view: PieceView;
    grabX: number;
    grabY: number;
    scale: number;
  } | null = null;
  let hoverCell: { r: number; c: number } | null = null;
  let hoverValid = false;
  let clearAnim: {
    rows: number[];
    cols: number[];
    t: number;
  } | null = null;

  function armIntro() {
    unlockSfx();
    playStart();
  }

  const kickIntro = () => armIntro();
  container.addEventListener("pointerdown", kickIntro, { once: true });
  container.addEventListener("touchstart", kickIntro, { once: true });

  const hand = makeHand();
  hand.zIndex = 40;
  world.addChild(hand);
  let tutorialDone = false;
  let idleHint = 0;

  function firstLivePiece() {
    return views.find((v) => !v.piece.used) ?? null;
  }

  function bestSlotFor(shape: Shape) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (canPlace(shape, r, c)) {
          return { r, c };
        }
      }
    }
    return { r: 3, c: 2 };
  }

  function handGoal(dt: number) {
    const live = firstLivePiece();
    if (!live) {
      return { x: GAME_W / 2, y: trayY, tap: false };
    }
    const slot = bestSlotFor(live.piece.shape);
    const from = { x: live.piece.homeX + 28, y: live.piece.homeY + 10 };
    const to = cellCenter(slot.r, slot.c);
    idleHint += dt;
    const cycle = (idleHint % 3.6) / 3.6;
    if (cycle < 0.28) {
      return { ...from, tap: true };
    }
    if (cycle < 0.72) {
      const u = easeInOut((cycle - 0.28) / 0.44);
      return {
        x: lerp(from.x, to.x, u),
        y: lerp(from.y, to.y, u),
        tap: true,
      };
    }
    return { ...to, tap: true };
  }

  function canPlace(shape: Shape, r: number, c: number) {
    for (const p of shape) {
      const rr = r + p.r;
      const cc = c + p.c;
      if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) {
        return false;
      }
      if (board[rr][cc] > 0) {
        return false;
      }
    }
    return true;
  }

  function pointerToAnchor(
    shape: Shape,
    px: number,
    py: number,
  ): { r: number; c: number } {
    const size = piecePixelSize(shape, 1);
    const topLeftX = px - size.w / 2;
    const topLeftY = py - size.h / 2;
    const c = Math.round((topLeftX - BOARD_X - GAP) / (CELL + GAP));
    const r = Math.round((topLeftY - BOARD_Y - GAP) / (CELL + GAP));
    return {
      r: Math.max(-2, Math.min(GRID, r)),
      c: Math.max(-2, Math.min(GRID, c)),
    };
  }

  function drawGhost(shape: Shape, r: number, c: number, valid: boolean) {
    ghostGfx.clear();
    if (r < -1 || c < -1) {
      return;
    }
    const color = valid ? COLORS.ghostOk : COLORS.ghostBad;
    for (const p of shape) {
      const rr = r + p.r;
      const cc = c + p.c;
      if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) {
        continue;
      }
      const { x, y } = cellOrigin(rr, cc);
      ghostGfx.roundRect(x, y, CELL, CELL, 10);
      ghostGfx.fill({ color, alpha: 0.38 });
      ghostGfx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ghostGfx.stroke({ width: 2.5, color, alpha: 0.9 });
    }
  }

  function findFullLines() {
    const rows: number[] = [];
    const cols: number[] = [];
    for (let r = 0; r < GRID; r++) {
      if (board[r].every((v) => v > 0)) {
        rows.push(r);
      }
    }
    for (let c = 0; c < GRID; c++) {
      let full = true;
      for (let r = 0; r < GRID; r++) {
        if (board[r][c] <= 0) {
          full = false;
          break;
        }
      }
      if (full) {
        cols.push(c);
      }
    }
    return { rows, cols };
  }

  function clearLines(rows: number[], cols: number[]) {
    for (const r of rows) {
      for (let c = 0; c < GRID; c++) {
        board[r][c] = 0;
      }
    }
    for (const c of cols) {
      for (let r = 0; r < GRID; r++) {
        board[r][c] = 0;
      }
    }
  }

  function placePiece(view: PieceView, r: number, c: number) {
    const { piece } = view;
    for (const p of piece.shape) {
      board[r + p.r][c + p.c] = piece.color;
    }
    piece.used = true;
    view.root.visible = false;
    paintPiece(view);
    playPlace();
    placedCount += 1;

    for (const p of piece.shape) {
      const pos = cellCenter(r + p.r, c + p.c);
      sparks.burst(pos.x, pos.y, piece.color, 8, 4);
    }

    const { rows, cols } = findFullLines();
    if (rows.length || cols.length) {
      const n = rows.length + cols.length;
      score += n * 100 + (n > 1 ? 50 * n : 0);
      scoreVal.text = String(score);
      playClear(n);
      clearAnim = { rows, cols, t: 0 };
      for (const rr of rows) {
        for (let cc = 0; cc < GRID; cc++) {
          const pos = cellCenter(rr, cc);
          sparks.burst(pos.x, pos.y, 0xffffff, 6, 6);
        }
      }
      for (const cc of cols) {
        for (let rr = 0; rr < GRID; rr++) {
          if (rows.includes(rr)) {
            continue;
          }
          const pos = cellCenter(rr, cc);
          sparks.burst(pos.x, pos.y, 0xfbbf24, 6, 6);
        }
      }
    } else {
      score += 20;
      scoreVal.text = String(score);
      redrawBoard();
      afterPlace();
    }
  }

  function afterPlace() {
    if (placedCount >= 3) {
      window.setTimeout(() => {
        if (!ended) {
          win();
        }
      }, 650);
    }
  }

  function win() {
    if (ended) {
      return;
    }
    ended = true;
    hand.visible = false;
    info.visible = false;
    playWin();
    sparks.burst(GAME_W / 2, BOARD_Y + BOARD / 2, 0xfbbf24, 28, 7);
    sparks.burst(GAME_W / 2, BOARD_Y + BOARD / 2, 0x38bdf8, 20, 6);
    endcard = showEndcard(app, world, {
      title: "Block Catch",
      subtitle: strings.endSubtitle,
      accent: 0xfbbf24,
      icon: 0x38bdf8,
      cta: strings.endCta,
      thanks: strings.endThanks,
    });
  }

  function onDragStart(view: PieceView, x: number, y: number) {
    if (ended || clearAnim || view.piece.used || drag) {
      return;
    }
    armIntro();
    if (!tutorialDone) {
      tutorialDone = true;
      hand.visible = false;
      pulseHandTap(hand, 0, false);
    }
    info.visible = false;
    drag = {
      view,
      grabX: x - view.root.x,
      grabY: y - view.root.y,
      scale: 1,
    };
    view.root.zIndex = 30;
    playPickup();
  }

  function onDragMove(x: number, y: number) {
    if (!drag) {
      return;
    }
    const { view } = drag;
    view.root.position.set(x - drag.grabX, y - drag.grabY - 40);
    paintPiece(view, 1, 0.95);
    const anchor = pointerToAnchor(view.piece.shape, view.root.x, view.root.y);
    hoverCell = anchor;
    hoverValid = canPlace(view.piece.shape, anchor.r, anchor.c);
    drawGhost(view.piece.shape, anchor.r, anchor.c, hoverValid);
  }

  function onDragEnd() {
    if (!drag) {
      return;
    }
    const { view } = drag;
    ghostGfx.clear();
    if (
      hoverCell &&
      hoverValid &&
      canPlace(view.piece.shape, hoverCell.r, hoverCell.c)
    ) {
      placePiece(view, hoverCell.r, hoverCell.c);
    } else {
      playInvalid();
      view.root.position.set(view.piece.homeX, view.piece.homeY);
      paintPiece(view);
      view.root.zIndex = 1;
    }
    drag = null;
    hoverCell = null;
    hoverValid = false;
  }

  for (const view of views) {
    view.root.on("pointerdown", (e) => {
      const local = world.toLocal(e.global);
      onDragStart(view, local.x, local.y);
    });
  }

  world.eventMode = "static";
  world.hitArea = new Rectangle(0, 0, GAME_W, GAME_H);
  world.on("pointermove", (e) => {
    if (!drag) {
      return;
    }
    const local = world.toLocal(e.global);
    onDragMove(local.x, local.y);
  });
  world.on("pointerup", () => onDragEnd());
  world.on("pointerupoutside", () => onDragEnd());

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    const time = app.ticker.lastTime;
    sparks.tick(ticker.deltaTime);

    if (clearAnim && !ended) {
      clearAnim.t += dt;
      const flash = clearAnim.t < 0.28;
      redrawBoard(flash ? clearAnim.rows : [], flash ? clearAnim.cols : []);
      if (clearAnim.t >= 0.32) {
        clearLines(clearAnim.rows, clearAnim.cols);
        clearAnim = null;
        redrawBoard();
        afterPlace();
      }
    }

    if (!drag) {
      for (const view of views) {
        if (view.piece.used) {
          continue;
        }
        const bob = Math.sin(time / 280 + view.piece.id) * 4;
        view.root.y = damp(view.root.y, view.piece.homeY + bob, dt, 10);
        view.root.x = damp(view.root.x, view.piece.homeX, dt, 12);
        paintPiece(view);
      }
    }

    if (hand.visible && !tutorialDone && !ended) {
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

  hand.position.set(pieces[0].homeX + 28, pieces[0].homeY + 10);

  return app;
}
