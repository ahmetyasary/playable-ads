import { Graphics } from "pixi.js";
import {
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

export async function startTapTitan(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x2a1014);

  let hp = 100;
  let won = false;
  let shake = 0;

  const title = label("TAP TITAN", 34, "#ffe4e6");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 56);
  world.addChild(title);

  const info = label("Tap to smash the titan", 18, "#fecaca");
  info.anchor.set(0.5, 0);
  info.style.fontWeight = "700";
  info.position.set(GAME_W / 2, 104);
  world.addChild(info);

  miniInstall(world, 0xf87171);

  const barBack = new Graphics();
  barBack.roundRect(120, 160, 480, 28, 14);
  barBack.fill(0x3f1d22);
  world.addChild(barBack);

  const bar = new Graphics();
  world.addChild(bar);

  const hpLabel = label("100%", 16, "#fff1f2");
  hpLabel.anchor.set(0.5);
  hpLabel.position.set(GAME_W / 2, 174);
  world.addChild(hpLabel);

  function drawBar() {
    bar.clear();
    bar.roundRect(124, 164, (472 * hp) / 100, 20, 10);
    bar.fill(0xfb7185);
    hpLabel.text = hp + "%";
  }
  drawBar();

  const floor = new Graphics();
  floor.ellipse(GAME_W / 2, 820, 210, 40);
  floor.fill({ color: 0x000000, alpha: 0.28 });
  world.addChild(floor);

  const boss = new Graphics();
  boss.circle(0, 18, 118);
  boss.fill(0xe11d48);
  boss.circle(-40, -10, 16);
  boss.fill(0x1f2937);
  boss.circle(40, -10, 16);
  boss.fill(0x1f2937);
  boss.circle(-40, -10, 6);
  boss.fill(0xffffff);
  boss.circle(40, -10, 6);
  boss.fill(0xffffff);
  boss.poly([-28, -118, -8, -70, -48, -70]);
  boss.fill(0x9f1239);
  boss.poly([28, -118, 8, -70, 48, -70]);
  boss.fill(0x9f1239);
  boss.position.set(GAME_W / 2, 640);
  boss.eventMode = "static";
  boss.cursor = "pointer";
  world.addChild(boss);

  const hand = makeHand();
  hand.position.set(GAME_W / 2 + 90, 700);
  world.addChild(hand);

  const bits: { gfx: ReturnType<typeof label>; life: number }[] = [];

  boss.on("pointerdown", () => {
    if (won) {
      return;
    }

    hp = Math.max(0, hp - 20);
    drawBar();
    info.visible = false;
    hand.visible = false;
    boss.scale.set(0.92);
    shake = 8;

    const dmg = label("-20", 28, "#fde047");
    dmg.anchor.set(0.5);
    dmg.position.set(GAME_W / 2 + (Math.random() * 120 - 60), 470);
    world.addChild(dmg);
    bits.push({ gfx: dmg, life: 36 });

    if (hp <= 0) {
      won = true;
      showEndcard(app, world, {
        title: "Tap Titan",
        subtitle: "Unlock 80 weapons in the full raid",
        accent: 0xfb7185,
        icon: 0xe11d48,
      });
    }
  });

  app.ticker.add(() => {
    if (boss.scale.x < 1) {
      boss.scale.set(Math.min(1, boss.scale.x + 0.03));
    }
    if (shake > 0) {
      boss.x = GAME_W / 2 + (Math.random() - 0.5) * shake;
      shake *= 0.8;
      if (shake < 0.4) {
        shake = 0;
        boss.x = GAME_W / 2;
      }
    }
    hand.y = 700 + Math.sin(app.ticker.lastTime / 160) * 10;
    for (let i = bits.length - 1; i >= 0; i--) {
      bits[i].gfx.y -= 2.4;
      bits[i].life -= 1;
      bits[i].gfx.alpha = bits[i].life / 36;
      if (bits[i].life <= 0) {
        bits[i].gfx.destroy();
        bits.splice(i, 1);
      }
    }
  });

  return app;
}
