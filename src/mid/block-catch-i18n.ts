import {
  getAppLang,
  onAppLang,
  setAppLang,
  type AppLang,
} from "./puzzle-lab-i18n";

export type { AppLang };
export { getAppLang, onAppLang, setAppLang };

export type BlockCatchCopy = {
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
  score: string;
};

export const BLOCK_CATCH_I18N: Record<AppLang, BlockCatchCopy> = {
  en: {
    info: "Drag blocks onto the board. Fill a row or column to clear it.",
    install: "INSTALL",
    installOk: "OK",
    endSubtitle: "Hundreds of block puzzles wait in the full game.",
    endCta: "INSTALL",
    endThanks: "THANKS!",
    howto: "How to play",
    close: "Close",
    steps: [
      "Drag a block from the tray onto the grid.",
      "Drop it where it fits. Green ghost = valid spot.",
      "Fill any full row or column to clear it and score.",
    ],
    goal: "Place all three blocks, clear the board, then INSTALL.",
    score: "SCORE",
  },
  tr: {
    info: "Blokları tahtaya sürükle. Dolu satır veya sütun temizlenir.",
    install: "YÜKLE",
    installOk: "TAMAM",
    endSubtitle: "Tam oyunda yüzlerce blok bulmacası seni bekliyor.",
    endCta: "YÜKLE",
    endThanks: "TEŞEKKÜRLER!",
    howto: "Nasıl oynanır",
    close: "Kapat",
    steps: [
      "Alttaki tepsiden bir bloğu sürükle.",
      "Sığdığı yere bırak. Yeşil gölge = uygun yer.",
      "Dolu satır veya sütunu tamamla; temizlenir ve puan gelir.",
    ],
    goal: "Üç bloğu yerleştir, tahtayı temizle, sonra YÜKLE’ye bas.",
    score: "PUAN",
  },
};

export function blockCopy(lang: AppLang = getAppLang()) {
  return BLOCK_CATCH_I18N[lang];
}
