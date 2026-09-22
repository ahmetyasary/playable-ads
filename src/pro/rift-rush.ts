import { Graphics } from "pixi.js";
import { SparkField, attachPostFx } from "../fx";
import {
  GAME_H,
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

type Gate = {
  z: number;
  x: number;
  y: number;
  kind: "ring" | "block";
  taken: boolean;
};

export async function startRiftRush(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x02010a);
  const fx = attachPostFx(world);
  fx.uAberration = 0.2;
  fx.uVignette = 1;
  const sparks = new SparkField(world);

  const title = label("RIFT RUSH", 34, "#a5f3fc");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 52);
  world.addChild(title);
  const info = label("Steer the rift. Hit the rings.", 17, "#67e8f9");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 98);
  world.addChild(info);
  miniInstall(world, 0x22d3ee);

  const tunnel = new Graphics();
  tunnel.blendMode = "add";
  world.addChild(tunnel);
  const shipG = new Graphics();
  shipG.blendMode = "add";
  world.addChild(shipG);

  const stars: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 900,
      y: (Math.random() - 0.5) * 1400,
      z: 40 + Math.random() * 900,
    });
  }

  const gates: Gate[] = [];
  for (let i = 0; i < 10; i++) {
    gates.push({
      z: 280 + i * 160,
      x: (Math.random() - 0.5) * 220,
      y: (Math.random() - 0.5) * 160,
      kind: i % 3 === 2 ? "block" : "ring",
      taken: false,
    });
  }

  let camZ = 0;
  let speed = 4.2;
  const ship = { x: 0, y: 40 };
  let dragging = false;
  let rings = 0;
  let ended = false;
  const hand = makeHand();
  hand.position.set(GAME_W / 2 + 40, 900);
  world.addChild(hand);

  function project(x: number, y: number, z: number) {
    const zz = z - camZ;
    if (zz < 12) {
      return null;
    }
    const f = 520 / zz;
    return {
      x: GAME_W / 2 + x * f,
      y: GAME_H * 0.58 + y * f,
      s: f,
      z: zz,
    };
  }

  function endAd(copy: string) {
    if (ended) {
      return;
    }
    ended = true;
    fx.uFlash = 0.25;
    showEndcard(app, world, {
      title: "Rift Rush",
      subtitle: copy,
      accent: 0x22d3ee,
      icon: 0x67e8f9,
    });
  }

  world.on("pointerdown", (e) => {
    if (ended) {
      return;
    }
    dragging = true;
    hand.visible = false;
    info.visible = false;
    const p = e.getLocalPosition(world);
    ship.x = (p.x - GAME_W / 2) * 0.7;
    ship.y = (p.y - GAME_H * 0.58) * 0.45;
  });
  world.on("pointermove", (e) => {
    if (!dragging || ended) {
      return;
    }
    const p = e.getLocalPosition(world);
    ship.x = Math.max(-240, Math.min(240, (p.x - GAME_W / 2) * 0.85));
    ship.y = Math.max(-180, Math.min(180, (p.y - GAME_H * 0.52) * 0.5));
  });
  world.on("pointerup", () => {
    dragging = false;
  });

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    fx.uTime += dt;
    fx.uFlash = Math.max(0, fx.uFlash - 0.02 * dt);
    sparks.tick(dt);
    if (ended) {
      return;
    }

    speed = Math.min(9, speed + dt * 0.01);
    fx.uAberration = 0.2 + speed * 0.08;
    camZ += speed * dt * 0.9;

    tunnel.clear();
    for (let i = 0; i < stars.length; i++) {
      stars[i].z -= speed * dt * 0.9;
      if (stars[i].z - camZ < 12) {
        stars[i].z = camZ + 700 + Math.random() * 200;
        stars[i].x = (Math.random() - 0.5) * 900;
        stars[i].y = (Math.random() - 0.5) * 1400;
      }
      const p = project(stars[i].x, stars[i].y, stars[i].z);
      if (!p) {
        continue;
      }
      tunnel.circle(p.x, p.y, Math.max(0.8, p.s * 0.04));
      tunnel.fill({ color: 0x67e8f9, alpha: Math.min(1, 18 / p.z) });
    }

    for (let depth = 9; depth >= 1; depth--) {
      const z = camZ + depth * 90;
      const p = project(0, 0, z);
      if (!p) {
        continue;
      }
      const size = 70 * p.s;
      tunnel.roundRect(p.x - size, p.y - size, size * 2, size * 2, 16);
      tunnel.stroke({
        width: Math.max(1, 6 * (1 / depth)),
        color: 0x22d3ee,
        alpha: 0.12 + depth * 0.03,
      });
    }

    for (const gate of gates) {
      if (gate.z < camZ + 24) {
        gate.z += 1600;
        gate.taken = false;
        gate.x = (Math.random() - 0.5) * 220;
        gate.y = (Math.random() - 0.5) * 160;
      }
      const p = project(gate.x, gate.y, gate.z);
      if (!p || p.z > 700) {
        continue;
      }
      const size = (gate.kind === "ring" ? 42 : 30) * p.s * 0.18;
      if (gate.kind === "ring") {
        tunnel.circle(p.x, p.y, size);
        tunnel.stroke({
          width: 6,
          color: gate.taken ? 0x4ade80 : 0xf0abfc,
          alpha: 0.9,
        });
      } else {
        tunnel.poly([
          p.x,
          p.y - size,
          p.x + size,
          p.y + size * 0.7,
          p.x - size,
          p.y + size * 0.7,
        ]);
        tunnel.fill({ color: 0xf43f5e, alpha: 0.85 });
      }

      const near = p.z < 70 && p.z > 28;
      const shipP = project(ship.x, ship.y, camZ + 64);
      if (near && shipP && !gate.taken) {
        const d = Math.hypot(p.x - shipP.x, p.y - shipP.y);
        if (gate.kind === "ring" && d < size * 0.95) {
          gate.taken = true;
          rings += 1;
          sparks.burst(p.x, p.y, 0xf0abfc, 18, 8);
          fx.uFlash = 0.12;
          if (rings >= 4) {
            endAd("The rift never closes. Full run unlocked.");
          }
        }
        if (gate.kind === "block" && d < size * 1.1) {
          gate.taken = true;
          sparks.burst(p.x, p.y, 0xf43f5e, 22, 9);
          endAd("Crash the gate. Rebuild the ship in-app.");
        }
      }
    }

    const sp = project(ship.x, ship.y, camZ + 64);
    shipG.clear();
    if (sp) {
      shipG.poly([
        sp.x,
        sp.y - 26,
        sp.x + 20,
        sp.y + 22,
        sp.x,
        sp.y + 10,
        sp.x - 20,
        sp.y + 22,
      ]);
      shipG.fill(0xecfeff);
      shipG.circle(sp.x, sp.y + 6, 18);
      shipG.fill({ color: 0x22d3ee, alpha: 0.4 });
    }

    hand.x = GAME_W / 2 + 40 + Math.sin(app.ticker.lastTime / 150) * 50;
  });

  return app;
}
