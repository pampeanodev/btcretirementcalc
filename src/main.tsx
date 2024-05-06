import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import AxiosApiInterceptor from "./services/axios-interceptor.tsx";
import i18next, { resources } from "./locales/i18n.tsx";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Faq from "./components/Misc/Faq.tsx";
import Layout from "./Layout.tsx";

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: "faq",
        element: <Faq />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AxiosApiInterceptor />
    <RouterProvider router={router} />
  </React.StrictMode>,
);
