import { Container, Graphics } from "pixi.js";
import {
  GAME_H,
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

type PoolItem = {
  gfx: Graphics;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type UpgradeId = "speed" | "range" | "multi";

export async function startOneMoreWave(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x102616);

  const state = {
    phase: "wave1" as "wave1" | "upgrade" | "wave2" | "end",
    dragging: false,
    hp: 3,
    fireAcc: 0,
    spawnAcc: 0,
    waveTime: 0,
    speed: 5.4,
    range: 220,
    multi: 1,
    tx: GAME_W / 2,
    ty: GAME_H / 2,
  };

  const arena = new Graphics();
  arena.circle(GAME_W / 2, 640, 280);
  arena.fill({ color: 0x16351f, alpha: 0.9 });
  arena.stroke({ width: 6, color: 0x4ade80, alpha: 0.35 });
  world.addChild(arena);

  const stage = new Container();
  world.addChild(stage);

  const player = new Graphics();
  player.circle(0, 0, 20);
  player.fill(0x86efac);
  player.circle(8, -6, 5);
  player.fill(0x052e16);
  player.position.set(GAME_W / 2, 640);
  stage.addChild(player);

  const title = label("ONE MORE WAVE", 28, "#dcfce7");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 56);
  world.addChild(title);

  const hint = label("Drag. You shoot automatically.", 18, "#bbf7d0");
  hint.anchor.set(0.5, 0);
  hint.style.fontWeight = "700";
  hint.position.set(GAME_W / 2, 100);
  world.addChild(hint);

  const hpText = label("♥♥♥", 24, "#fb7185");
  hpText.position.set(28, 24);
  world.addChild(hpText);

  miniInstall(world, 0x4ade80);

  const hand = makeHand();
  hand.position.set(GAME_W / 2 + 70, 700);
  world.addChild(hand);

  const bullets: PoolItem[] = [];
  const enemies: PoolItem[] = [];

  function makePoolItem(color: number, radius: number): PoolItem {
    const gfx = new Graphics();
    gfx.circle(0, 0, radius);
    gfx.fill(color);
    gfx.visible = false;
    stage.addChild(gfx);
    return { gfx, active: false, x: 0, y: 0, vx: 0, vy: 0 };
  }

  for (let i = 0; i < 40; i++) {
    bullets.push(makePoolItem(0xfef08a, 5));
  }
  for (let i = 0; i < 30; i++) {
    enemies.push(makePoolItem(0xf87171, 14));
  }

  function grab(list: PoolItem[]) {
    let item = list.find((entry) => !entry.active);
    if (!item) {
      item = makePoolItem(
        list === bullets ? 0xfef08a : 0xf87171,
        list === bullets ? 5 : 14,
      );
      list.push(item);
    }
    item.active = true;
    item.gfx.visible = true;
    return item;
  }

  function release(item: PoolItem) {
    item.active = false;
    item.gfx.visible = false;
  }

  function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const enemy = grab(enemies);
    if (side === 0) {
      enemy.x = 80 + Math.random() * 560;
      enemy.y = 180;
    } else if (side === 1) {
      enemy.x = 640;
      enemy.y = 280 + Math.random() * 720;
    } else if (side === 2) {
      enemy.x = 80 + Math.random() * 560;
      enemy.y = 1100;
    } else {
      enemy.x = 80;
      enemy.y = 280 + Math.random() * 720;
    }
    enemy.gfx.position.set(enemy.x, enemy.y);
  }

  function nearestEnemy() {
    let best: PoolItem | null = null;
    let bestDist = 99999;
    for (const enemy of enemies) {
      if (!enemy.active) {
        continue;
      }
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = enemy;
      }
    }
    return best;
  }

  function shoot() {
    const target = nearestEnemy();
    if (!target) {
      return;
    }
    if (Math.hypot(target.x - player.x, target.y - player.y) > state.range) {
      return;
    }
    for (let i = 0; i < state.multi; i++) {
      const bullet = grab(bullets);
      const spread = (i - (state.multi - 1) / 2) * 0.2;
      const angle =
        Math.atan2(target.y - player.y, target.x - player.x) + spread;
      bullet.x = player.x;
      bullet.y = player.y;
      bullet.vx = Math.cos(angle) * 11;
      bullet.vy = Math.sin(angle) * 11;
      bullet.gfx.position.set(bullet.x, bullet.y);
    }
  }

  function hearts() {
    hpText.text =
      "♥".repeat(Math.max(0, state.hp)) + "♡".repeat(3 - Math.max(0, state.hp));
  }

  function endAd() {
    if (state.phase === "end") {
      return;
    }
    state.phase = "end";
    hint.visible = false;
    hand.visible = false;
    showEndcard(app, world, {
      title: "One More Wave",
      subtitle: "80 weapons. Endless hordes. Download now.",
      accent: 0x4ade80,
      icon: 0x86efac,
    });
  }

  function pickUpgrade(id: UpgradeId) {
    if (id === "speed") {
      state.speed = 7.4;
    } else if (id === "range") {
      state.range = 320;
    } else {
      state.multi = 3;
    }
    upgradeLayer.visible = false;
    state.phase = "wave2";
    state.waveTime = 0;
    hint.text = "WAVE 2";
    hint.visible = true;
  }

  const upgradeLayer = new Container();
  upgradeLayer.visible = false;
  world.addChild(upgradeLayer);

  function openUpgrades() {
    state.phase = "upgrade";
    hand.visible = false;
    upgradeLayer.removeChildren();

    const dim = new Graphics();
    dim.rect(0, 0, GAME_W, GAME_H);
    dim.fill({ color: 0x000000, alpha: 0.5 });
    upgradeLayer.addChild(dim);

    const heading = label("PICK ONE", 28, "#ffffff");
    heading.anchor.set(0.5);
    heading.position.set(GAME_W / 2, 430);
    upgradeLayer.addChild(heading);

    const cards: { id: UpgradeId; name: string }[] = [
      { id: "speed", name: "Speed" },
      { id: "range", name: "Range" },
      { id: "multi", name: "Multi" },
    ];

    cards.forEach((card, i) => {
      const box = new Graphics();
      box.roundRect(-90, -70, 180, 140, 18);
      box.fill(0x14532d);
      box.stroke({ width: 3, color: 0x86efac });
      box.position.set(GAME_W / 2 + (i - 1) * 200, 640);
      box.eventMode = "static";
      box.cursor = "pointer";
      upgradeLayer.addChild(box);

      const name = label(card.name, 20, "#ecfdf5");
      name.anchor.set(0.5);
      name.position.copyFrom(box.position);
      upgradeLayer.addChild(name);

      box.on("pointerdown", () => pickUpgrade(card.id));
    });

    upgradeLayer.visible = true;
  }

  world.on("pointerdown", (event) => {
    if (state.phase === "end" || state.phase === "upgrade") {
      return;
    }
    const pos = event.getLocalPosition(world);
    state.dragging = true;
    state.tx = pos.x;
    state.ty = pos.y;
    hand.visible = false;
    hint.visible = false;
  });

  world.on("pointermove", (event) => {
    if (!state.dragging || state.phase === "end" || state.phase === "upgrade") {
      return;
    }
    const pos = event.getLocalPosition(world);
    state.tx = Math.max(60, Math.min(GAME_W - 60, pos.x));
    state.ty = Math.max(220, Math.min(1100, pos.y));
  });

  world.on("pointerup", () => {
    state.dragging = false;
  });

  app.ticker.add((ticker) => {
    if (state.phase === "end" || state.phase === "upgrade") {
      return;
    }

    const dt = ticker.deltaTime;
    const dx = state.tx - player.x;
    const dy = state.ty - player.y;
    const distToPointer = Math.hypot(dx, dy);
    const maxStep = state.speed * dt * 0.7;
    if (distToPointer > 0.5) {
      const step = Math.min(maxStep, distToPointer);
      player.x += (dx / distToPointer) * step;
      player.y += (dy / distToPointer) * step;
    }

    hand.y = 700 + Math.sin(app.ticker.lastTime / 160) * 8;
    state.waveTime += dt / 60;
    state.spawnAcc += dt;
    state.fireAcc += dt;

    if (state.spawnAcc > (state.phase === "wave2" ? 16 : 26)) {
      state.spawnAcc = 0;
      spawnEnemy();
    }
    if (state.fireAcc > 12) {
      state.fireAcc = 0;
      shoot();
    }

    for (const bullet of bullets) {
      if (!bullet.active) {
        continue;
      }
      bullet.x += bullet.vx * dt * 0.65;
      bullet.y += bullet.vy * dt * 0.65;
      bullet.gfx.position.set(bullet.x, bullet.y);
      if (
        bullet.x < 0 ||
        bullet.x > GAME_W ||
        bullet.y < 160 ||
        bullet.y > 1180
      ) {
        release(bullet);
      }
    }

    for (const enemy of enemies) {
      if (!enemy.active) {
        continue;
      }
      const ex = player.x - enemy.x;
      const ey = player.y - enemy.y;
      const dist = Math.hypot(ex, ey) || 1;
      enemy.x += (ex / dist) * 1.5 * dt * 0.65;
      enemy.y += (ey / dist) * 1.5 * dt * 0.65;
      enemy.gfx.position.set(enemy.x, enemy.y);

      if (dist < 30) {
        release(enemy);
        state.hp -= 1;
        hearts();
        if (state.hp <= 0) {
          endAd();
          return;
        }
      }

      for (const bullet of bullets) {
        if (!bullet.active) {
          continue;
        }
        if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < 16) {
          release(bullet);
          release(enemy);
          break;
        }
      }
    }

    if (state.phase === "wave1" && state.waveTime > 7) {
      openUpgrades();
    }
    if (state.phase === "wave2" && state.waveTime > 6) {
      endAd();
    }
  });

  return app;
}
