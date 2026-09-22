export type AppLang = "en" | "tr";

export type PuzzleLabCopy = {
  info: string;
  install: string;
  installOk: string;
  endSubtitle: string;
  endCta: string;
  endThanks: string;
  howto: string;
  close: string;
  steps: string[];
  goal: string;
};

export const PUZZLE_LAB_I18N: Record<AppLang, PuzzleLabCopy> = {
  en: {
    info: "Match the top colors. Empty vials accept any color.",
    install: "INSTALL",
    installOk: "OK",
    endSubtitle: "Sort thousands of vials in the full game.",
    endCta: "INSTALL",
    endThanks: "THANKS!",
    howto: "How to play",
    close: "Close",
    steps: [
      "Tap a vial to pick it up.",
      "Tap another vial to pour. Tops must match, or the target must be empty.",
      "Tap the same vial again to put it down.",
    ],
    goal: "Make every vial a single color, then INSTALL.",
  },
  tr: {
    info: "Aynı üst renkleri birleştir. Boş tüpe her rengi dökebilirsin.",
    install: "YÜKLE",
    installOk: "TAMAM",
    endSubtitle: "Tam oyunda binlerce tüp seni bekliyor.",
    endCta: "YÜKLE",
    endThanks: "TEŞEKKÜRLER!",
    howto: "Nasıl oynanır",
    close: "Kapat",
    steps: [
      "Bir tüpe dokunarak seç.",
      "Başka bir tüpe dokunup dök. Üst renkler aynı olmalı; hedef boşsa her renk olur.",
      "Seçimi bırakmak için aynı tüpe tekrar dokun.",
    ],
    goal: "Her tüpü tek renge getir, sonra YÜKLE butonuna bas.",
  },
};

const EVENT = "puzzle-lab-lang";

export function getAppLang(): AppLang {
  const raw =
    document.documentElement.dataset.lang || document.documentElement.lang;
  return raw === "tr" ? "tr" : "en";
}

export function setAppLang(lang: AppLang) {
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { lang } }));
}

export function onAppLang(handler: (lang: AppLang) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ lang: AppLang }>).detail;
    handler(detail?.lang === "tr" ? "tr" : "en");
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function puzzleCopy(lang: AppLang = getAppLang()) {
  return PUZZLE_LAB_I18N[lang];
}
