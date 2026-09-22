import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import handTapUrl from "./assets/hand-tap.png";
import handTip from "./assets/hand-tap.json";

export const GAME_W = 720;
export const GAME_H = 1280;
export const FONT = "Nunito, Arial, sans-serif";

let handTexture: Texture | null = null;

export async function preloadHand() {
  handTexture = await Assets.load(handTapUrl);
  return handTexture;
}

export async function createPlayable(
  container: HTMLElement,
  background: number,
) {
  await document.fonts.ready;
  await preloadHand();

  const app = new Application();
  await app.init({
    background: 0x07080d,
    resizeTo: container,
    antialias: true,
    autoDensity: true,
    preference: "webgl",
    resolution: Math.min(window.devicePixelRatio || 1, 3),
  });
  container.appendChild(app.canvas);

  const root = new Container();
  app.stage.addChild(root);
  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  const frame = new Graphics();
  frame.roundRect(-6, -6, GAME_W + 12, GAME_H + 12, 40);
  frame.fill(0x1c2030);
  root.addChild(frame);

  const bg = new Graphics();
  bg.roundRect(0, 0, GAME_W, GAME_H, 36);
  bg.fill(background);
  root.addChild(bg);

  const clip = new Graphics();
  clip.roundRect(0, 0, GAME_W, GAME_H, 36);
  clip.fill(0xffffff);
  root.addChild(clip);

  const world = new Container();
  world.mask = clip;
  world.eventMode = "static";
  world.hitArea = new Rectangle(0, 0, GAME_W, GAME_H);
  root.addChild(world);

  const fit = () => {
    const pad = 24;
    const scale = Math.min(
      (app.screen.width - pad * 2) / GAME_W,
      (app.screen.height - pad * 2) / GAME_H,
    );
    root.scale.set(scale);
    root.x = (app.screen.width - GAME_W * scale) / 2;
    root.y = (app.screen.height - GAME_H * scale) / 2;
  };
  fit();
  app.renderer.on("resize", fit);

  return { app, world };
}

export function label(text: string, size: number, fill: string) {
  return new Text({
    text,
    style: {
      fill,
      fontSize: size,
      fontFamily: FONT,
      fontWeight: "800",
      align: "center",
    },
  });
}

export function makeHand() {
  const root = new Container();
  const rings = new Graphics();
  const texture = handTexture ?? Texture.from(handTapUrl);
  const sprite = new Sprite(texture);
  sprite.anchor.set(handTip.tipX / handTip.w, handTip.tipY / handTip.h);
  sprite.scale.set(0.28);

  root.addChild(rings, sprite);
  root.rotation = -0.2;
  root.scale.set(1);
  (root as Container & { tapRings: Graphics }).tapRings = rings;
  return root;
}

export function pulseHandTap(hand: Container, time: number, active: boolean) {
  const rings = (hand as Container & { tapRings?: Graphics }).tapRings;
  if (!rings) {
    return;
  }
  rings.clear();
  if (!active) {
    return;
  }
  for (let i = 0; i < 2; i++) {
    const p = (time / 650 + i * 0.5) % 1;
    const radius = 16 + p * 22;
    rings.arc(0, 0, radius, -Math.PI * 0.85, -Math.PI * 0.15);
    rings.stroke({
      width: 3.5,
      color: 0xffffff,
      alpha: (1 - p) * 0.85,
      cap: "round",
    });
  }
}

export function showEndcard(
  app: Application,
  parent: Container,
  opts: {
    title: string;
    subtitle: string;
    accent: number;
    icon: number;
    cta?: string;
    thanks?: string;
  },
) {
  const overlay = new Graphics();
  overlay.rect(0, 0, GAME_W, GAME_H);
  overlay.fill({ color: 0x05060a, alpha: 0.72 });
  parent.addChild(overlay);

  const card = new Graphics();
  card.roundRect(70, 360, 580, 560, 32);
  card.fill(0x12151f);
  card.stroke({ width: 2, color: 0x2a3148 });
  parent.addChild(card);

  const icon = new Graphics();
  icon.roundRect(-54, -54, 108, 108, 28);
  icon.fill(opts.icon);
  icon.position.set(GAME_W / 2, 470);
  parent.addChild(icon);

  const stars = label("★★★★★", 28, "#fbbf24");
  stars.anchor.set(0.5);
  stars.position.set(GAME_W / 2, 560);
  parent.addChild(stars);

  const title = label(opts.title, 36, "#ffffff");
  title.anchor.set(0.5);
  title.position.set(GAME_W / 2, 620);
  parent.addChild(title);

  const subtitle = label(opts.subtitle, 18, "#c5c9d8");
  subtitle.anchor.set(0.5);
  subtitle.style.fontWeight = "700";
  subtitle.position.set(GAME_W / 2, 668);
  parent.addChild(subtitle);

  const cta = new Graphics();
  cta.roundRect(-150, -34, 300, 68, 18);
  cta.fill(opts.accent);
  cta.position.set(GAME_W / 2, 790);
  cta.eventMode = "static";
  cta.cursor = "pointer";
  parent.addChild(cta);

  const ctaLabel = opts.cta ?? "INSTALL";
  const thanksLabel = opts.thanks ?? "THANKS!";
  const ctaText = label(ctaLabel, 26, "#0b1220");
  ctaText.anchor.set(0.5);
  ctaText.position.copyFrom(cta.position);
  parent.addChild(ctaText);

  let done = false;
  cta.on("pointerdown", () => {
    done = true;
    ctaText.text = thanksLabel;
  });

  app.ticker.add(() => {
    const pulse = 1 + Math.sin(app.ticker.lastTime / 180) * 0.045;
    cta.scale.set(pulse);
  });

  return {
    setCopy(next: { subtitle: string; cta: string; thanks: string }) {
      subtitle.text = next.subtitle;
      if (!done) {
        ctaText.text = next.cta;
      } else {
        ctaText.text = next.thanks;
      }
    },
  };
}

export function miniInstall(
  parent: Container,
  accent: number,
  copy?: {
    install?: string;
    ok?: string;
  },
) {
  const btn = new Graphics();
  btn.roundRect(0, 0, 128, 40, 12);
  btn.fill(accent);
  btn.position.set(GAME_W - 148, 24);
  btn.eventMode = "static";
  btn.cursor = "pointer";
  parent.addChild(btn);

  const text = label(copy?.install ?? "INSTALL", 14, "#0b1220");
  text.anchor.set(0.5);
  text.position.set(GAME_W - 84, 44);
  parent.addChild(text);

  let pressed = false;
  btn.on("pointerdown", () => {
    pressed = true;
    text.text = copy?.ok ?? "OK";
  });

  return {
    setCopy(next: { install: string; ok: string }) {
      if (!pressed) {
        text.text = next.install;
      } else {
        text.text = next.ok;
      }
    },
  };
}
