import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ActivationScreenProps {
  onActivated: () => void;
}

export default function ActivationScreen({ onActivated }: ActivationScreenProps) {
  const [fingerprint, setFingerprint] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchFingerprint() {
      try {
        const res = await invoke<string>("get_machine_fingerprint");
        if (res) {
          setFingerprint(res);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to invoke get_machine_fingerprint:", err);
      }
      
      // Fallback if desktop backend call fails
      let localFallback = localStorage.getItem("neugate_fallback_fp");
      if (!localFallback) {
        localFallback = "NEUT-WIN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem("neugate_fallback_fp", localFallback);
      }
      setFingerprint(localFallback);
      setLoading(false);
    }
    fetchFingerprint();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setActivating(true);
    setError(null);

    try {
      const res = await fetch("https://enterprise.neulify.com/api/licenses/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Token": "neulify_desktop_app_secret_token_2026",
        },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          machine_id: fingerprint,
          app_name: "NeuTruck",
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success" && data.data?.is_active) {
        localStorage.setItem("neutruck_license_key", licenseKey.trim());
        onActivated();
        return;
      } else {
        setError(data.message || "Invalid or inactive license key for NeuTruck.");
      }
    } catch (err: any) {
      // Fallback offline hardware check
      try {
        const valid = await invoke<boolean>("activate_license_key", { key: licenseKey.trim() });
        if (valid) {
          localStorage.setItem("neutruck_license_key", licenseKey.trim());
          onActivated();
          return;
        }
      } catch (_) {}
      setError("Verification failed. Invalid license key for this machine fingerprint.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0e1a 0%, #1e293b 100%)",
      color: "#f8fafc",
      padding: "2rem"
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        background: "rgba(19, 27, 46, 0.8)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "2.5rem",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🚛</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "#00d4ff" }}>NeuTruck Activation</h2>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>
            A valid hardware license key is required to authorize and run this fleet dispatch terminal.
          </p>
        </div>

        {error && (
          <div style={{
            padding: "0.85rem 1rem",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "8px",
            color: "#f43f5e",
            fontSize: "0.85rem",
            marginBottom: "1.5rem"
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "1rem" }}>
            Reading hardware identifiers...
          </div>
        ) : (
          <form onSubmit={handleActivate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8" }}>Hardware Machine Fingerprint</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#38bdf8",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {copied ? "✓ Copied" : "Copy Fingerprint"}
                </button>
              </div>
              <div style={{
                padding: "0.75rem 1rem",
                background: "#0a0e1a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                color: "#f8fafc",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                textAlign: "center",
                fontWeight: 600,
                userSelect: "all"
              }}>
                {fingerprint}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                License Key
              </label>
              <input
                type="text"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="e.g. NEUT-1A2B-3C4D-5E6F"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "#0a0e1a",
                  border: "1px solid #1e293b",
                  color: "#f8fafc",
                  fontSize: "0.9rem",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "center",
                  fontWeight: 600
                }}
                disabled={activating}
              />
            </div>

            <button
              type="submit"
              disabled={activating || !licenseKey.trim()}
              style={{
                padding: "0.85rem",
                borderRadius: "8px",
                background: "#00d4ff",
                color: "#000000",
                border: "none",
                fontWeight: 800,
                fontSize: "0.95rem",
                cursor: activating ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {activating ? "Verifying License..." : "🔑 Activate Terminal"}
            </button>
          </form>
        )}

        <div style={{
          textAlign: "center",
          marginTop: "2rem",
          fontSize: "0.78rem",
          color: "var(--text-dim)",
          lineHeight: "1.5"
        }}>
          Provide your machine fingerprint to receive your activation key or request via the{" "}
          <button
            type="button"
            onClick={async () => {
              try {
                const { openUrl } = await import("@tauri-apps/plugin-opener");
                await openUrl("https://enterprise.neulify.com/license-portal");
              } catch (_) {
                window.open("https://enterprise.neulify.com/license-portal", "_blank");
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary)",
              textDecoration: "underline",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              font: "inherit"
            }}
          >
            License Portal
          </button>.
        </div>
      </div>
    </div>
  );
}
