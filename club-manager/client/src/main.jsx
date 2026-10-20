import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);

/* register the offline service worker (not in the claude.ai demo) */
if ("serviceWorker" in navigator && !import.meta.env.VITE_DEMO) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
