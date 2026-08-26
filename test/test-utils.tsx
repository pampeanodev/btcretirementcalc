import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { resources } from "../src/locales/i18n";

/**
 * Mirrors the i18next bootstrap in main.tsx, minus LanguageDetector: tests pin
 * the language to English so assertions do not depend on the host locale.
 */
export const initI18n = async () => {
  if (i18next.isInitialized) {
    return;
  }
  await i18next.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
};

/**
 * InputPanel reads useSearchParams, so anything rendering it needs a router
 * above it. main.tsx uses createBrowserRouter; a memory router is the test-side
 * equivalent and keeps each test's URL isolated.
 */
export const renderWithRouter = (ui: ReactElement, initialEntries: string[] = ["/"]) => {
  const router = createMemoryRouter([{ path: "/", element: ui }], { initialEntries });
  return render(<RouterProvider router={router} />);
};
