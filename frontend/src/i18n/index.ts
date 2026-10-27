import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { common } from "./locales/ar/common";
import { errors } from "./locales/ar/errors";
import { ui } from "./locales/ar/ui";

// Arabic only for now. To add English: create locales/en with the same keys, register it
// in `resources`, and switch `lng` (and the theme direction) from a language selector.
export const defaultNS = "common";
export const resources = {
  ar: { common, errors, ui },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "ar",
  fallbackLng: "ar",
  defaultNS,
  ns: ["common", "errors", "ui"],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
