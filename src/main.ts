import { Application } from "pixi.js";
import { guideHasTr, renderGuide } from "./guides";
import { startDrawPath } from "./jr/draw-path";
import { startTapTitan } from "./jr/tap-titan";
import { startGlowUp } from "./mid/glow-up";
import { startOneMoreWave } from "./mid/one-more-wave";
import { startBlockCatch } from "./mid/block-catch";
import { startHuePour } from "./mid/hue-pour";
import { setAppLang, type AppLang } from "./mid/puzzle-lab-i18n";
import { startAetherSlash } from "./pro/aether-slash";
import { startOrbitHeist } from "./pro/orbit-heist";
import { startMoonFox } from "./pro/moon-fox";
import { startRiftRush } from "./pro/rift-rush";

const home = document.getElementById("home")!;
const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
const howtoBtn = document.getElementById("howto-btn") as HTMLButtonElement;
const langSwitch = document.getElementById("lang-switch") as HTMLElement;
const langBtns = [
  ...langSwitch.querySelectorAll<HTMLButtonElement>(".lang-btn"),
];
const guide = document.getElementById("guide")!;
const container = document.getElementById("pixi-container")!;

const games: Record<string, (el: HTMLElement) => Promise<Application>> = {
  "draw-path": startDrawPath,
  "tap-titan": startTapTitan,
  "glow-up": startGlowUp,
  "one-more-wave": startOneMoreWave,
  "hue-pour": startHuePour,
  "block-catch": startBlockCatch,
  "aether-slash": startAetherSlash,
  "orbit-heist": startOrbitHeist,
  "moon-fox": startMoonFox,
  "rift-rush": startRiftRush,
};

let currentApp: Application | null = null;
let lang: AppLang = "en";
let currentGame = "";

function gameIdFromHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

function syncLangUi() {
  for (const btn of langBtns) {
    btn.classList.toggle("is-on", btn.dataset.lang === lang);
  }
  howtoBtn.textContent = lang === "tr" ? "Nasıl oynanır" : "How to play";
}

function applyGuide() {
  if (!currentGame) {
    return;
  }
  const open = !guide.hidden;
  renderGuide(guide, currentGame, lang);
  guide.hidden = !open;
  syncLangUi();
  if (guideHasTr(currentGame)) {
    setAppLang(lang);
  }
}

function showHome() {
  home.hidden = false;
  backBtn.hidden = true;
  howtoBtn.hidden = true;
  langSwitch.hidden = true;
  document.body.classList.remove("has-lang");
  currentGame = "";
  lang = "en";
  setAppLang("en");
  syncLangUi();
  guide.hidden = true;
  container.classList.remove("is-on");
}

function showGame(id: string) {
  home.hidden = true;
  backBtn.hidden = false;
  howtoBtn.hidden = false;
  currentGame = id;
  lang = "en";
  const bilingual = guideHasTr(id);
  langSwitch.hidden = !bilingual;
  document.body.classList.toggle("has-lang", bilingual);
  container.classList.add("is-on");
  applyGuide();
  guide.hidden = true;
}

async function stopGame() {
  if (currentApp) {
    currentApp.destroy(true);
    currentApp = null;
  }
  container.innerHTML = "";
}

async function route() {
  const id = gameIdFromHash();
  await stopGame();

  if (!id || !games[id]) {
    showHome();
    return;
  }

  showGame(id);
  currentApp = await games[id](container);
  if (guideHasTr(id)) {
    setAppLang(lang);
  }
}

backBtn.addEventListener("click", () => {
  window.location.hash = "";
});

howtoBtn.addEventListener("click", () => {
  guide.hidden = !guide.hidden;
});

for (const btn of langBtns) {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang === "tr" ? "tr" : "en";
    applyGuide();
  });
}

guide.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.classList.contains("guide-close")) {
    guide.hidden = true;
  }
});

window.addEventListener("hashchange", () => {
  void route();
});

void route();
