import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CustomDialogProvider } from "./components/common/CustomDialogModal";

// Immediate Theme & Appearance Restoration before React render
(function initAppearance() {
  try {
    const savedMode = localStorage.getItem("neutruck_theme_mode") || "dark";
    if (savedMode === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    const savedAccent = localStorage.getItem("neutruck_accent_color") || "cyan";
    if (savedAccent !== "cyan") {
      document.documentElement.setAttribute("data-accent", savedAccent);
    } else {
      document.documentElement.removeAttribute("data-accent");
    }

    const savedBg = localStorage.getItem("neutruck_bg_image") || "";
    if (savedBg) {
      document.documentElement.style.setProperty("--custom-bg-image", `url('${savedBg}')`);
    } else {
      document.documentElement.style.removeProperty("--custom-bg-image");
    }
  } catch (e) {
    console.error("Appearance restoration error", e);
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CustomDialogProvider>
      <App />
    </CustomDialogProvider>
  </React.StrictMode>,
);
