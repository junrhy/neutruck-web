import React, { useState } from "react";

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return { error: `Server error (${res.status} ${res.statusText})` };
  }
}

interface UnauthorizedIpScreenProps {
  clientIp: string;
  onUnlocked: () => void;
  onRefresh?: () => void;
}

export default function UnauthorizedIpScreen({
  clientIp,
  onUnlocked,
  onRefresh,
}: UnauthorizedIpScreenProps) {
  const [copied, setCopied] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(clientIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/security/ip-status");
      if (res.ok) {
        const data = await safeJson(res);
        if (data.isAllowed || !data.whitelistEnabled) {
          onUnlocked();
          return;
        }
      }
      onRefresh?.();
    } catch (_) {}
    finally {
      setRefreshing(false);
    }
  };

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/security/admin-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          label: deviceLabel.trim() || `Authorized Device (${clientIp})`,
        }),
      });

      const data = await safeJson(res);
      if (res.ok && data.success) {
        onUnlocked();
      } else {
        setError(data.error || "Invalid administrator credentials or unauthorized user.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact authorization server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-main)",
        color: "var(--text-main)",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius, 18px)",
          padding: "2.5rem 2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            border: "2px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1.25rem auto",
          }}
        >
          🛡️
        </div>

        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "var(--danger, #ef4444)" }}>
          Access Restricted
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-dim)", margin: "0 0 1.75rem 0", lineHeight: "1.5" }}>
          IP Address Whitelist enforcement is active. This device is not authorized to access the application.
        </p>

        {/* IP Address Card */}
        <div
          style={{
            background: "var(--bg-main)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm, 12px)",
            padding: "1.1rem 1.25rem",
            marginBottom: "1.75rem",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Your Detected IP Address
            </span>
            <button
              type="button"
              onClick={handleCopyIp}
              style={{
                background: "none",
                border: "none",
                color: copied ? "var(--success, #10b981)" : "var(--primary)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {copied ? "✓ Copied!" : "📋 Copy IP"}
            </button>
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--primary)",
              letterSpacing: "0.5px",
            }}
          >
            {clientIp || "Detecting..."}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => {
              setShowAdminModal(true);
              setError(null);
            }}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "var(--radius-sm, 10px)",
              background: "var(--primary)",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "0.92rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 12px var(--primary-alpha)",
            }}
          >
            <span>🔑</span> Admin Unlock & Whitelist IP
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "var(--radius-sm, 10px)",
              background: "var(--bg-main)",
              color: "var(--text-main)",
              border: "1px solid var(--border)",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: refreshing ? "wait" : "pointer",
            }}
          >
            {refreshing ? "Checking..." : "🔄 Refresh Connection Status"}
          </button>
        </div>

        <div style={{ marginTop: "1.75rem", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
          Need access? Copy your IP address above and request an administrator to add it to the <strong>IP Whitelist</strong> in Settings.
        </div>
      </div>

      {/* Admin Unlock Modal */}
      {showAdminModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius, 16px)",
              padding: "2rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              textAlign: "left",
              color: "var(--text-main)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                🔑 Administrator Unlock
              </h3>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  padding: "0.2rem",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.82rem", color: "var(--text-dim)" }}>
              Enter administrator credentials to immediately whitelist <strong>{clientIp}</strong> and enter the application.
            </p>

            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  color: "var(--danger, #ef4444)",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAdminUnlock} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  style={{
                    width: "100%",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                  Admin Password
                </label>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                  Device Name / Label (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="e.g. Dispatch Office Laptop"
                  style={{
                    width: "100%",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm, 8px)",
                    background: "transparent",
                    color: "var(--text-dim)",
                    border: "1px solid var(--border)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm, 8px)",
                    background: "var(--primary)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading ? "Authorizing..." : "Authorize & Proceed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
