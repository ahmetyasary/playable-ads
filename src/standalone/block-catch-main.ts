import { blockCopy, setAppLang, type AppLang } from "../mid/block-catch-i18n";
import { startBlockCatch } from "../mid/block-catch";

const game = document.getElementById("game")!;
const howtoBtn = document.getElementById("howto-btn") as HTMLButtonElement;
const guide = document.getElementById("guide") as HTMLElement;
const stepsEl = guide.querySelector('[data-copy="steps"]') as HTMLOListElement;
const goalEl = guide.querySelector(
  '[data-copy="goal"]',
) as HTMLParagraphElement;
const closeBtn = guide.querySelector(".close") as HTMLButtonElement;
const langBtns = [
  ...document.querySelectorAll<HTMLButtonElement>("#lang-switch .lang"),
];

function applyUi(lang: AppLang) {
  const text = blockCopy(lang);
  howtoBtn.textContent = text.howto;
  closeBtn.textContent = text.close;
  goalEl.textContent = text.goal;
  stepsEl.innerHTML = text.steps.map((step) => `<li>${step}</li>`).join("");
  for (const btn of langBtns) {
    btn.classList.toggle("is-on", btn.dataset.lang === lang);
  }
}

howtoBtn.addEventListener("click", () => {
  guide.hidden = !guide.hidden;
});

closeBtn.addEventListener("click", () => {
  guide.hidden = true;
});

for (const btn of langBtns) {
  btn.addEventListener("click", () => {
    const next: AppLang = btn.dataset.lang === "tr" ? "tr" : "en";
    setAppLang(next);
    applyUi(next);
  });
}

setAppLang("en");
applyUi("en");
void startBlockCatch(game);
