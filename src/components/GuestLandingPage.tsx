import { useState, useEffect } from "react";

export default function GuestLandingPage() {
  const [hasCustomWallpaper, setHasCustomWallpaper] = useState<boolean>(() => {
    return !!localStorage.getItem("neutruck_bg_image");
  });

  useEffect(() => {
    const checkWallpaper = () => {
      setHasCustomWallpaper(!!localStorage.getItem("neutruck_bg_image"));
    };
    window.addEventListener("storage", checkWallpaper);
    const interval = setInterval(checkWallpaper, 1000);
    return () => {
      window.removeEventListener("storage", checkWallpaper);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`guest-landing-container ${!hasCustomWallpaper ? "has-default-hero" : ""}`}>
      {!hasCustomWallpaper && (
        <div className="guest-hero-content">
          <a
            href="https://neulify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="guest-hero-brand-tag"
            title="Visit Neulify Official Website"
          >
            <span>✨</span> A PRODUCT OF <strong style={{ color: "var(--primary)" }}>NEULIFY</strong>
          </a>

          <h1 className="guest-hero-title">NeuTruck Dispatch & Fleet Logistics</h1>
          <p className="guest-hero-subtitle">
            Moving your cargo with absolute precision, total peace of mind, and uncompromised reliability across every highway and sea passage.
          </p>

          <div className="guest-hero-badges">
            <div className="guest-hero-badge-item">
              <span className="badge-icon">⛴️</span>
              <span className="badge-text">RoRo Sea Transit</span>
            </div>
            <div className="guest-hero-badge-item">
              <span className="badge-icon">📦</span>
              <span className="badge-text">Dispatch Manifests</span>
            </div>
            <div className="guest-hero-badge-item">
              <span className="badge-icon">🔐</span>
              <span className="badge-text">Secure Access Control</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
