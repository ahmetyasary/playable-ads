import { Graphics } from "pixi.js";
import {
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

export async function startDrawPath(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x15122b);

  const startX = 120;
  const startY = 1080;
  const goalX = 590;
  const goalY = 250;

  const walls = [
    { x: 70, y: 740, w: 420, h: 42 },
    { x: 390, y: 300, w: 42, h: 380 },
    { x: 230, y: 940, w: 420, h: 42 },
  ];

  const title = label("DRAW PATH", 34, "#fff7c2");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 56);
  world.addChild(title);

  const info = label("Draw a path to the gem", 18, "#c4b5fd");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 104);
  world.addChild(info);

  miniInstall(world, 0xf5d76e);

  const wallGfx = new Graphics();
  for (const wall of walls) {
    wallGfx.roundRect(wall.x, wall.y, wall.w, wall.h, 12);
    wallGfx.fill(0x3b3a6a);
  }
  world.addChild(wallGfx);

  const glow = new Graphics();
  glow.circle(goalX, goalY, 48);
  glow.fill({ color: 0x34d399, alpha: 0.22 });
  world.addChild(glow);

  const startCircle = new Graphics();
  startCircle.circle(startX, startY, 28);
  startCircle.fill(0xf5d76e);
  startCircle.stroke({ width: 4, color: 0xfff7c2 });
  world.addChild(startCircle);

  const goalCircle = new Graphics();
  goalCircle.star(0, 0, 5, 28, 14);
  goalCircle.fill(0x34d399);
  goalCircle.position.set(goalX, goalY);
  world.addChild(goalCircle);

  const line = new Graphics();
  world.addChild(line);

  const hand = makeHand();
  hand.position.set(startX + 36, startY + 10);
  world.addChild(hand);

  let drawing = false;
  let won = false;
  const points: { x: number; y: number }[] = [];

  function hitWall(x: number, y: number) {
    return walls.some(
      (wall) =>
        x > wall.x && x < wall.x + wall.w && y > wall.y && y < wall.y + wall.h,
    );
  }

  function drawLine() {
    line.clear();
    if (points.length < 2) {
      return;
    }
    line.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      line.lineTo(points[i].x, points[i].y);
    }
    line.stroke({ width: 10, color: 0xf5d76e, cap: "round", join: "round" });
  }

  world.on("pointerdown", (event) => {
    if (won) {
      return;
    }
    const pos = event.getLocalPosition(world);
    if (Math.hypot(pos.x - startX, pos.y - startY) > 48) {
      return;
    }
    points.length = 0;
    points.push({ x: startX, y: startY });
    drawing = true;
    info.visible = false;
    hand.visible = false;
  });

  world.on("pointermove", (event) => {
    if (!drawing || won) {
      return;
    }
    const pos = event.getLocalPosition(world);
    if (hitWall(pos.x, pos.y)) {
      points.length = 0;
      drawing = false;
      line.clear();
      return;
    }
    points.push({ x: pos.x, y: pos.y });
    drawLine();
    if (Math.hypot(pos.x - goalX, pos.y - goalY) < 36) {
      won = true;
      drawing = false;
      showEndcard(app, world, {
        title: "Draw Path",
        subtitle: "200+ glow puzzles in the full game",
        accent: 0xf5d76e,
        icon: 0x34d399,
      });
    }
  });

  world.on("pointerup", () => {
    if (!won) {
      points.length = 0;
      drawing = false;
      line.clear();
    }
  });

  app.ticker.add(() => {
    const wave = Math.sin(app.ticker.lastTime / 200);
    startCircle.scale.set(1 + wave * 0.06);
    hand.x = startX + 36 + wave * 10;
  });

  return app;
}
