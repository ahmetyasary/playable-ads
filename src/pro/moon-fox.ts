import { Container, Graphics } from "pixi.js";
import { SparkField, attachPostFx, makeBloomLayer } from "../fx";
import {
  GAME_H,
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

type Obstacle = { x: number; w: number; h: number };

export async function startMoonFox(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x071018);
  const stage = new Container();
  world.addChild(stage);
  const fx = attachPostFx(stage);
  fx.uVignette = 0.92;
  fx.uAberration = 0.18;
  const bloom = makeBloomLayer(stage);
  const sparks = new SparkField(stage);

  const groundY = 1000;
  const foxX = 210;
  const fox = { y: groundY, vy: 0, jumps: 0, run: 0 };
  let scroll = 0;
  let speed = 7.2;
  let hits = 0;
  let ended = false;
  let invuln = 0;
  const denX = 4200;

  const obstacles: Obstacle[] = [
    { x: 820, w: 70, h: 46 },
    { x: 1280, w: 86, h: 58 },
    { x: 1760, w: 64, h: 42 },
    { x: 2240, w: 90, h: 62 },
    { x: 2720, w: 72, h: 48 },
    { x: 3180, w: 88, h: 56 },
    { x: 3620, w: 70, h: 44 },
  ];

  const sky = new Graphics();
  stage.addChild(sky);
  const moon = new Graphics();
  moon.blendMode = "add";
  bloom.addChild(moon);
  const trees = new Graphics();
  stage.addChild(trees);
  const ground = new Graphics();
  stage.addChild(ground);
  const hunt = new Graphics();
  stage.addChild(hunt);
  const foxG = new Graphics();
  stage.addChild(foxG);

  const title = label("MOON FOX", 32, "#fdba74");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 52);
  world.addChild(title);
  const info = label("Tap to jump. The hunters are behind you.", 16, "#fed7aa");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 98);
  world.addChild(info);
  miniInstall(world, 0xf97316);

  const hand = makeHand();
  hand.position.set(foxX + 70, groundY - 90);
  world.addChild(hand);

  function drawMoon() {
    moon.clear();
    moon.circle(560, 220, 54);
    moon.fill({ color: 0xfef3c7, alpha: 0.95 });
    moon.circle(560, 220, 90);
    moon.fill({ color: 0xfde68a, alpha: 0.18 });
  }

  function wrap(x: number, span: number) {
    return ((x % span) + span) % span;
  }

  function drawWorld() {
    sky.clear();
    sky.rect(0, 0, GAME_W, GAME_H);
    sky.fill(0x071018);
    sky.ellipse(360, 520, 420, 220);
    sky.fill({ color: 0x12263a, alpha: 0.55 });

    trees.clear();
    for (let i = 0; i < 10; i++) {
      const x = wrap(i * 160 - scroll * 0.22, 1600) - 80;
      trees.moveTo(x, groundY - 20);
      trees.lineTo(x + 28, groundY - 220 - (i % 3) * 40);
      trees.lineTo(x + 56, groundY - 20);
      trees.fill({ color: 0x0b1c28, alpha: 0.7 });
    }
    for (let i = 0; i < 8; i++) {
      const x = wrap(i * 210 - scroll * 0.55, 1680) - 60;
      trees.roundRect(x, groundY - 160, 22, 160, 6);
      trees.fill(0x132333);
      trees.ellipse(x + 11, groundY - 180, 48, 70);
      trees.fill(0x163044);
    }

    ground.clear();
    ground.rect(0, groundY, GAME_W, GAME_H - groundY);
    ground.fill(0x1c140e);
    ground.rect(0, groundY, GAME_W, 10);
    ground.fill(0x365314);
    for (const obs of obstacles) {
      const x = obs.x - scroll;
      if (x < -120 || x > GAME_W + 80) {
        continue;
      }
      ground.roundRect(x, groundY - obs.h, obs.w, obs.h, 8);
      ground.fill(0x44403c);
      ground.roundRect(x + 8, groundY - obs.h + 8, obs.w - 16, 10, 4);
      ground.fill(0x78716c);
    }

    const den = denX - scroll;
    if (den < GAME_W + 40) {
      ground.roundRect(den, groundY - 90, 86, 90, 18);
      ground.fill(0x0b1220);
      ground.circle(den + 43, groundY - 48, 28);
      ground.fill({ color: 0xfbbf24, alpha: 0.35 });
    }
  }

  function drawHunters(t: number) {
    hunt.clear();
    const close = 70 + hits * 46;
    hunt.rect(0, 0, close, GAME_H);
    hunt.fill({ color: 0x450a0a, alpha: 0.28 });
    for (let i = 0; i < 3; i++) {
      const hx = 36 + i * 28;
      const hy = groundY - 18 + Math.sin(t / 80 + i) * 4;
      hunt.ellipse(hx, hy, 22, 12);
      hunt.fill(0x1c1917);
      hunt.circle(hx + 16, hy - 10, 9);
      hunt.fill(0x292524);
      hunt.circle(hx + 22, hy - 12, 8);
      hunt.fill({ color: 0xfacc15, alpha: 0.35 });
    }
  }

  function drawFox(t: number) {
    foxG.clear();
    const airborne = fox.y < groundY - 1;
    const bob = airborne ? 0 : Math.sin(t * 0.35) * 3;
    const y = fox.y + bob;
    const flash = invuln > 0 && Math.floor(t / 4) % 2 === 0;
    const fur = flash ? 0xfef3c7 : 0xf97316;
    const dark = flash ? 0xfde68a : 0xea580c;
    foxG.ellipse(-32, y - 18, 26, 11);
    foxG.fill(dark);
    foxG.ellipse(0, y - 16, 30, 15);
    foxG.fill(fur);
    foxG.circle(24, y - 30, 13);
    foxG.fill(fur);
    foxG.poly([16, y - 40, 12, y - 56, 24, y - 36]);
    foxG.fill(dark);
    foxG.poly([26, y - 40, 30, y - 56, 34, y - 34]);
    foxG.fill(dark);
    foxG.circle(28, y - 32, 2.4);
    foxG.fill(0x111827);
    foxG.ellipse(4, y - 10, 10, 6);
    foxG.fill(0xffedd5);
    const step = Math.sin(t * 0.4);
    foxG.roundRect(-16, y - 4, 7, 16 + step * 4, 3);
    foxG.fill(dark);
    foxG.roundRect(6, y - 4, 7, 16 - step * 4, 3);
    foxG.fill(dark);
    foxG.position.set(foxX, 0);
  }

  function endAd(win: boolean) {
    if (ended) {
      return;
    }
    ended = true;
    info.visible = false;
    hand.visible = false;
    fx.uFlash = 0.2;
    showEndcard(app, world, {
      title: "Moon Fox",
      subtitle: win
        ? "The den is safe. The forest is not."
        : "The hunt never sleeps. Run farther in-app.",
      accent: 0xf97316,
      icon: 0xfdba74,
    });
  }

  world.on("pointerdown", () => {
    if (ended) {
      return;
    }
    if (fox.jumps < 2) {
      fox.vy = -17.5;
      fox.jumps += 1;
      hand.visible = false;
      info.visible = false;
    }
  });

  drawMoon();

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    const t = app.ticker.lastTime / 16;
    fx.uTime += dt;
    fx.uFlash = Math.max(0, fx.uFlash - 0.02 * dt);
    sparks.tick(dt);
    if (Math.random() < 0.12) {
      sparks.burst(
        80 + Math.random() * 560,
        180 + Math.random() * 400,
        0xfde68a,
        1,
        0.6,
      );
    }

    if (!ended) {
      speed = Math.min(10.2, speed + dt * 0.004);
      scroll += speed * dt * 0.65;
      fox.vy += 0.95 * dt;
      fox.y += fox.vy * dt * 0.65;
      if (fox.y >= groundY) {
        fox.y = groundY;
        fox.vy = 0;
        fox.jumps = 0;
      }
      invuln = Math.max(0, invuln - dt);

      if (invuln <= 0) {
        for (const obs of obstacles) {
          const x = obs.x - scroll;
          const bodyLeft = foxX - 28;
          const bodyRight = foxX + 32;
          const bodyTop = fox.y - 52;
          if (
            bodyRight > x &&
            bodyLeft < x + obs.w &&
            bodyTop < groundY &&
            fox.y > groundY - obs.h - 2
          ) {
            hits += 1;
            invuln = 28;
            fox.vy = -8;
            speed = Math.max(5.4, speed - 1.6);
            fx.uFlash = 0.16;
            sparks.burst(foxX, fox.y - 20, 0xfb7185, 16, 7);
            if (hits >= 3) {
              endAd(false);
            }
          }
        }
      }

      if (scroll + foxX > denX + 20 && fox.y >= groundY - 2) {
        endAd(true);
      }
    }

    drawWorld();
    drawHunters(t);
    drawFox(t);
    hand.y = groundY - 90 + Math.sin(app.ticker.lastTime / 150) * 10;
  });

  return app;
}
