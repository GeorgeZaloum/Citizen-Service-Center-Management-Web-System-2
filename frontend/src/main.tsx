import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/alexandria/500.css";
import "@fontsource/alexandria/700.css";
import "./i18n";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { USE_MOCKS } from "./api/endpoints";
import { App } from "./app/App";

async function start() {
  // VITE_USE_MOCKS=true: answer from the in-memory mock server. With false the mock code
  // is not even included in the bundle (the condition is replaced at build time).
  if (USE_MOCKS) {
    const { installMocks } = await import("./mocks");
    installMocks();
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
