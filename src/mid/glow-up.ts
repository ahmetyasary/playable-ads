import { Container, Graphics } from "pixi.js";
import {
  GAME_W,
  createPlayable,
  label,
  makeHand,
  miniInstall,
  showEndcard,
} from "../playable";

type Step = {
  title: string;
  apply: (color: number) => void;
  colors: number[];
};

export async function startGlowUp(container: HTMLElement) {
  const { app, world } = await createPlayable(container, 0x2a1633);

  const hair = new Graphics();
  const shirt = new Graphics();
  const pants = new Graphics();
  const face = new Graphics();

  function drawHair(color: number) {
    hair.clear();
    hair.ellipse(0, -92, 70, 46);
    hair.fill(color);
  }

  function drawShirt(color: number) {
    shirt.clear();
    shirt.roundRect(-58, -22, 116, 96, 18);
    shirt.fill(color);
  }

  function drawPants(color: number) {
    pants.clear();
    pants.roundRect(-46, 70, 40, 88, 10);
    pants.fill(color);
    pants.roundRect(6, 70, 40, 88, 10);
    pants.fill(color);
  }

  drawHair(0x6b7280);
  drawShirt(0x9ca3af);
  drawPants(0x6b7280);
  face.circle(0, -40, 42);
  face.fill(0xfde7d0);
  face.circle(-14, -44, 5);
  face.fill(0x1f2937);
  face.circle(14, -44, 5);
  face.fill(0x1f2937);

  const spotlight = new Graphics();
  spotlight.ellipse(0, 40, 150, 28);
  spotlight.fill({ color: 0xf5d0fe, alpha: 0.18 });

  const character = new Container();
  character.position.set(GAME_W / 2, 520);
  character.addChild(spotlight, hair, shirt, pants, face);
  world.addChild(character);

  const title = label("GLOW UP", 34, "#fdf2f8");
  title.anchor.set(0.5, 0);
  title.position.set(GAME_W / 2, 56);
  world.addChild(title);

  const stepLabel = label("", 20, "#f5d0fe");
  stepLabel.anchor.set(0.5, 0);
  stepLabel.style.fontWeight = "700";
  stepLabel.position.set(GAME_W / 2, 108);
  world.addChild(stepLabel);

  miniInstall(world, 0xf472b6);

  const tray = new Graphics();
  tray.roundRect(70, 980, 580, 210, 28);
  tray.fill(0x1a0f22);
  world.addChild(tray);

  const options = new Container();
  world.addChild(options);

  const hand = makeHand();
  hand.visible = false;
  world.addChild(hand);

  let stepIndex = 0;
  let hintOn = true;
  let ended = false;

  const steps: Step[] = [
    {
      title: "Choose a hair color",
      colors: [0x1f2937, 0xf59e0b, 0xf472b6],
      apply: drawHair,
    },
    {
      title: "Choose a top",
      colors: [0x38bdf8, 0xf43f5e, 0x22c55e],
      apply: drawShirt,
    },
    {
      title: "Choose pants",
      colors: [0x111827, 0x7c3aed, 0xfb923c],
      apply: drawPants,
    },
  ];

  function clearOptions() {
    options.removeChildren().forEach((child) => child.destroy());
  }

  function showStep() {
    const step = steps[stepIndex];
    stepLabel.text = step.title;
    clearOptions();

    step.colors.forEach((color, i) => {
      const btn = new Graphics();
      btn.circle(0, 0, 38);
      btn.fill(color);
      btn.stroke({ width: 5, color: 0xffffff });
      btn.position.set(GAME_W / 2 + (i - 1) * 140, 1088);
      btn.eventMode = "static";
      btn.cursor = "pointer";
      options.addChild(btn);

      btn.on("pointerdown", () => {
        if (ended) {
          return;
        }
        hintOn = false;
        hand.visible = false;
        step.apply(color);
        character.scale.set(1.08);
        stepIndex += 1;
        if (stepIndex >= steps.length) {
          ended = true;
          stepLabel.visible = false;
          clearOptions();
          showEndcard(app, world, {
            title: "Glow Up",
            subtitle: "Dress, pose, and go viral in the app",
            accent: 0xf472b6,
            icon: 0xf9a8d4,
          });
        } else {
          showStep();
        }
      });
    });

    if (hintOn) {
      hand.position.set(options.children[0].x + 40, options.children[0].y + 20);
      hand.visible = true;
    }
  }

  app.ticker.add((ticker) => {
    if (character.scale.x > 1) {
      character.scale.set(
        Math.max(1, character.scale.x - ticker.deltaTime * 0.02),
      );
    }
    if (hand.visible) {
      hand.y =
        options.children[0].y + 20 + Math.sin(app.ticker.lastTime / 150) * 8;
    }
  });

  showStep();
  return app;
}
