import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add("native-app");

  // Android WebView has no Notification API — avoid crashes from any code path.
  if (typeof window !== "undefined" && !("Notification" in window)) {
    const stub = {
      permission: "denied" as NotificationPermission,
      requestPermission: async () => "denied" as const,
    };
    Object.defineProperty(window, "Notification", {
      value: stub,
      configurable: true,
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
