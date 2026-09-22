import { Graphics } from "pixi.js";
import { SparkField, attachPostFx, makeBloomLayer, starfield } from "../fx";
import {
  GAME_H,
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

type Body = { x: number; y: number; mass: number; r: number };

export async function startOrbitHeist(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x030712);
  const fx = attachPostFx(world);
  fx.uVignette = 0.9;
  starfield(world, 90, 0x93c5fd);
  const bloom = makeBloomLayer(world);
  const sparks = new SparkField(world);

  const star: Body = { x: GAME_W / 2, y: 560, mass: 2400, r: 54 };
  const planet: Body = { x: 500, y: 780, mass: 900, r: 36 };
  const moon: Body = { x: 210, y: 430, mass: 500, r: 22 };
  const gem = { x: 560, y: 280, r: 16 };
  const bodies = [star, planet, moon];

  const corona = new Graphics();
  corona.blendMode = "add";
  bloom.addChild(corona);
  const space = new Graphics();
  world.addChild(space);

  function paintWorld(t: number) {
    space.clear();
    space.circle(star.x, star.y, star.r);
    space.fill(0xfde68a);
    space.circle(planet.x, planet.y, planet.r);
    space.fill(0x38bdf8);
    space.ellipse(planet.x + 10, planet.y - 4, planet.r * 0.7, planet.r * 0.5);
    space.fill({ color: 0x0ea5e9, alpha: 0.45 });
    space.circle(moon.x, moon.y, moon.r);
    space.fill(0xc4b5fd);
    space.circle(gem.x, gem.y, gem.r);
    space.fill(0x4ade80);
    corona.clear();
    const pulse = 18 + Math.sin(t / 180) * 8;
    corona.circle(star.x, star.y, star.r + pulse);
    corona.fill({ color: 0xf59e0b, alpha: 0.28 });
    corona.circle(gem.x, gem.y, 28 + Math.sin(t / 140) * 6);
    corona.fill({ color: 0x4ade80, alpha: 0.35 });
  }

  const title = label("ORBIT HEIST", 32, "#fde68a");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 52);
  world.addChild(title);
  const info = label("Pull back. Slingshot the gem.", 17, "#bfdbfe");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 98);
  world.addChild(info);
  miniInstall(world, 0xf59e0b);

  const craftG = new Graphics();
  craftG.blendMode = "add";
  world.addChild(craftG);
  const trail = new Graphics();
  trail.blendMode = "add";
  world.addChild(trail);
  const preview = new Graphics();
  preview.blendMode = "add";
  world.addChild(preview);

  const start = { x: GAME_W / 2, y: 1080 };
  const craft = { x: start.x, y: start.y, vx: 0, vy: 0, flying: false };
  const path: { x: number; y: number }[] = [];
  let aiming = false;
  let aimX = start.x;
  let aimY = start.y;
  let ended = false;
  const hand = makeHand();
  hand.position.set(start.x + 36, start.y + 8);
  world.addChild(hand);

  function accel(x: number, y: number) {
    let ax = 0;
    let ay = 0;
    for (const body of bodies) {
      const dx = body.x - x;
      const dy = body.y - y;
      const d2 = Math.max(90, dx * dx + dy * dy);
      const d = Math.sqrt(d2);
      const a = body.mass / d2;
      ax += (dx / d) * a;
      ay += (dy / d) * a;
    }
    return { ax, ay };
  }

  function simulate(x: number, y: number, vx: number, vy: number) {
    const dots: { x: number; y: number }[] = [];
    for (let i = 0; i < 70; i++) {
      const a = accel(x, y);
      vx += a.ax * 0.55;
      vy += a.ay * 0.55;
      x += vx;
      y += vy;
      if (i % 2 === 0) {
        dots.push({ x, y });
      }
    }
    return dots;
  }

  function reset() {
    craft.x = start.x;
    craft.y = start.y;
    craft.vx = 0;
    craft.vy = 0;
    craft.flying = false;
    path.length = 0;
  }

  function win() {
    ended = true;
    sparks.burst(gem.x, gem.y, 0x4ade80, 50, 12);
    fx.uFlash = 0.3;
    showEndcard(app, world, {
      title: "Orbit Heist",
      subtitle: "Steal across a hundred star systems.",
      accent: 0xf59e0b,
      icon: 0x4ade80,
    });
  }

  world.on("pointerdown", (e) => {
    if (ended || craft.flying) {
      return;
    }
    const p = e.getLocalPosition(world);
    if (Math.hypot(p.x - start.x, p.y - start.y) < 80) {
      aiming = true;
      hand.visible = false;
      info.visible = false;
    }
  });
  world.on("pointermove", (e) => {
    if (!aiming) {
      return;
    }
    const p = e.getLocalPosition(world);
    aimX = p.x;
    aimY = p.y;
  });
  world.on("pointerup", () => {
    if (!aiming || ended) {
      return;
    }
    aiming = false;
    craft.vx = (start.x - aimX) * 0.085;
    craft.vy = (start.y - aimY) * 0.085;
    craft.flying = true;
  });

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    fx.uTime += dt;
    fx.uFlash = Math.max(0, fx.uFlash - 0.02 * dt);
    sparks.tick(dt);
    paintWorld(app.ticker.lastTime);

    preview.clear();
    if (aiming) {
      const vx = (start.x - aimX) * 0.085;
      const vy = (start.y - aimY) * 0.085;
      const dots = simulate(start.x, start.y, vx, vy);
      for (let i = 0; i < dots.length; i++) {
        preview.circle(dots[i].x, dots[i].y, 2.2);
        preview.fill({
          color: 0xfde68a,
          alpha: 0.15 + (i / dots.length) * 0.7,
        });
      }
      preview.moveTo(start.x, start.y);
      preview.lineTo(aimX, aimY);
      preview.stroke({ width: 3, color: 0xf87171 });
    }

    if (craft.flying && !ended) {
      const a = accel(craft.x, craft.y);
      craft.vx += a.ax * dt * 0.55;
      craft.vy += a.ay * dt * 0.55;
      craft.x += craft.vx * dt * 0.55;
      craft.y += craft.vy * dt * 0.55;
      path.push({ x: craft.x, y: craft.y });
      if (path.length > 40) {
        path.shift();
      }
      for (const body of bodies) {
        if (Math.hypot(craft.x - body.x, craft.y - body.y) < body.r + 8) {
          sparks.burst(craft.x, craft.y, 0xf87171, 18, 7);
          reset();
        }
      }
      if (Math.hypot(craft.x - gem.x, craft.y - gem.y) < gem.r + 12) {
        win();
      }
      if (
        craft.x < -40 ||
        craft.x > GAME_W + 40 ||
        craft.y < -40 ||
        craft.y > GAME_H + 40
      ) {
        reset();
      }
    }

    trail.clear();
    if (path.length > 1) {
      trail.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        trail.lineTo(path[i].x, path[i].y);
      }
      trail.stroke({ width: 4, color: 0x93c5fd, cap: "round" });
    }

    craftG.clear();
    craftG.circle(craft.x, craft.y, 9);
    craftG.fill(0xf8fafc);
    craftG.circle(craft.x, craft.y, 18);
    craftG.fill({ color: 0x38bdf8, alpha: 0.35 });

    hand.y = start.y + 8 + Math.sin(app.ticker.lastTime / 160) * 8;
  });

  return app;
}
