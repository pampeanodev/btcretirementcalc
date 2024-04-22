import i18next from "i18next";

import translationEnglish from "./en.json";
import translationSpanish from "./es.json";
import translationPortuguese from "./pt.json";

export const resources = {
  en: {
    translation: translationEnglish,
  },
  es: {
    translation: translationSpanish,
  },
  pt: {
    translation: translationPortuguese,
  },
};

export default i18next;
