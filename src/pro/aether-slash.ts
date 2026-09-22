import { Container, Graphics } from "pixi.js";
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

type Foe = {
  g: Graphics;
  glow: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  boss: boolean;
};

export async function startAetherSlash(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x070014);
  const stage = new Container();
  world.addChild(stage);
  const fx = attachPostFx(stage);
  fx.uAberration = 0.55;
  starfield(stage, 70, 0xb388ff);

  const nebula = new Graphics();
  nebula.blendMode = "add";
  nebula.circle(GAME_W * 0.5, 520, 260);
  nebula.fill({ color: 0x6d28d9, alpha: 0.16 });
  nebula.circle(160, 980, 180);
  nebula.fill({ color: 0x22d3ee, alpha: 0.1 });
  stage.addChild(nebula);

  const bloom = makeBloomLayer(stage);
  const sparks = new SparkField(stage);

  const title = label("AETHER SLASH", 32, "#e9d5ff");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 52);
  world.addChild(title);
  const info = label("Slash the wraiths", 18, "#c4b5fd");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 98);
  world.addChild(info);
  miniInstall(world, 0xc084fc);

  const slash = new Graphics();
  slash.blendMode = "add";
  stage.addChild(slash);
  const slashGlow = new Graphics();
  slashGlow.blendMode = "add";
  bloom.addChild(slashGlow);

  const foes: Foe[] = [];
  const points: { x: number; y: number }[] = [];
  let drawing = false;
  let ended = false;
  let kills = 0;
  let hitStop = 0;
  let spawnAcc = 0;
  let bossOut = false;

  function spawnFoe(boss = false) {
    const foe: Foe = {
      g: new Graphics(),
      glow: new Graphics(),
      x: 80 + Math.random() * 560,
      y: boss ? 240 : -40,
      vx: (Math.random() - 0.5) * 2.4,
      vy: boss ? 0.8 : 1.6 + Math.random(),
      r: boss ? 52 : 26,
      hp: boss ? 3 : 1,
      boss,
    };
    drawFoe(foe);
    foe.glow.blendMode = "add";
    bloom.addChild(foe.glow);
    stage.addChild(foe.g);
    foes.push(foe);
  }

  function drawFoe(foe: Foe) {
    foe.g.clear();
    foe.g.poly([
      0,
      -foe.r,
      foe.r * 0.7,
      foe.r * 0.6,
      0,
      foe.r * 0.2,
      -foe.r * 0.7,
      foe.r * 0.6,
    ]);
    foe.g.fill(foe.boss ? 0xf0abfc : 0x5b21b6);
    foe.g.circle(0, -4, foe.r * 0.28);
    foe.g.fill(0x22d3ee);
    foe.glow.clear();
    foe.glow.circle(0, 0, foe.r * 1.4);
    foe.glow.fill({ color: foe.boss ? 0xf472b6 : 0x22d3ee, alpha: 0.45 });
  }

  const hand = makeHand();
  hand.position.set(220, 860);
  world.addChild(hand);

  function kill(foe: Foe, i: number) {
    sparks.burst(
      foe.x,
      foe.y,
      foe.boss ? 0xf0abfc : 0x67e8f9,
      foe.boss ? 40 : 20,
      11,
    );
    fx.uFlash = 0.22;
    hitStop = foe.boss ? 10 : 5;
    foe.g.destroy();
    foe.glow.destroy();
    foes.splice(i, 1);
    kills += 1;
    if (!bossOut && kills >= 5) {
      bossOut = true;
      spawnFoe(true);
      info.text = "CUT THE TITAN";
      info.visible = true;
    }
  }

  function endAd() {
    if (ended) {
      return;
    }
    ended = true;
    showEndcard(app, world, {
      title: "Aether Slash",
      subtitle: "100+ blades. One realm to cut open.",
      accent: 0xc084fc,
      icon: 0x22d3ee,
    });
  }

  world.on("pointerdown", (e) => {
    if (ended) {
      return;
    }
    const p = e.getLocalPosition(world);
    drawing = true;
    points.length = 0;
    points.push({ x: p.x, y: p.y });
    hand.visible = false;
    info.visible = false;
  });
  world.on("pointermove", (e) => {
    if (!drawing || ended) {
      return;
    }
    const p = e.getLocalPosition(world);
    points.push({ x: p.x, y: p.y });
    if (points.length > 18) {
      points.shift();
    }
  });
  world.on("pointerup", () => {
    drawing = false;
    points.length = 0;
    slash.clear();
    slashGlow.clear();
  });

  spawnFoe();
  spawnFoe();

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    fx.uTime += dt;
    fx.uFlash = Math.max(0, fx.uFlash - 0.03 * dt);
    sparks.tick(dt);
    if (ended) {
      return;
    }
    if (hitStop > 0) {
      hitStop -= 1;
      return;
    }

    spawnAcc += dt;
    if (!bossOut && spawnAcc > 55) {
      spawnAcc = 0;
      spawnFoe();
    }

    slash.clear();
    slashGlow.clear();
    if (points.length > 1) {
      slash.moveTo(points[0].x, points[0].y);
      slashGlow.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        slash.lineTo(points[i].x, points[i].y);
        slashGlow.lineTo(points[i].x, points[i].y);
      }
      slash.stroke({ width: 7, color: 0x67e8f9, cap: "round" });
      slashGlow.stroke({ width: 22, color: 0x22d3ee, cap: "round" });
    }

    for (let i = foes.length - 1; i >= 0; i--) {
      const foe = foes[i];
      foe.x += foe.vx * dt * 0.55;
      foe.y += foe.vy * dt * 0.55;
      if (foe.x < 50 || foe.x > GAME_W - 50) {
        foe.vx *= -1;
      }
      foe.g.position.set(foe.x, foe.y);
      foe.glow.position.set(foe.x, foe.y);
      foe.g.rotation += 0.03 * dt;
      if (foe.y > GAME_H + 60) {
        foe.g.destroy();
        foe.glow.destroy();
        foes.splice(i, 1);
        continue;
      }
      if (points.length > 1) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        const dist = Math.hypot(last.x - foe.x, last.y - foe.y);
        const dist2 = Math.hypot(prev.x - foe.x, prev.y - foe.y);
        if (Math.min(dist, dist2) < foe.r + 10) {
          foe.hp -= 1;
          sparks.burst(foe.x, foe.y, 0xa5f3fc, 8, 6);
          if (foe.hp <= 0) {
            const wasBoss = foe.boss;
            kill(foe, i);
            if (wasBoss) {
              endAd();
            }
          }
        }
      }
    }

    hand.x = 220 + Math.sin(app.ticker.lastTime / 160) * 70;
  });

  return app;
}
