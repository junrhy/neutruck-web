import React, { useState } from "react";
import { User } from "../types";

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return { error: `Server error (${res.status} ${res.statusText})` };
  }
}

interface UnauthorizedGeofenceScreenProps {
  user: User;
  currentLat: number | null;
  currentLng: number | null;
  distanceMeters: number | null;
  geoError: string | null;
  onRetry: () => void;
  onBypass: () => void;
  onLogout: () => void;
}

export default function UnauthorizedGeofenceScreen({
  user,
  currentLat,
  currentLng,
  distanceMeters,
  geoError,
  onRetry,
  onBypass,
  onLogout,
}: UnauthorizedGeofenceScreenProps) {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const allowedRadius = user.allowed_radius_meters || 1000;
  const targetLabel = user.geofence_label || "Authorized Facility";

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) return;

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/security/admin-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword,
          label: `Geofence Bypass by ${adminUsername} for user ${user.username}`,
        }),
      });

      const data = await safeJson(res);
      if (res.ok && data.success) {
        onBypass();
      } else {
        setAdminError(data.error || "Invalid administrator credentials.");
      }
    } catch (err: any) {
      setAdminError(err.message || "Failed to contact authorization server.");
    } finally {
      setAdminLoading(false);
    }
  };

  const isPermissionDenied = Boolean(
    geoError &&
      (geoError.toLowerCase().includes("denied") ||
        geoError.toLowerCase().includes("permission") ||
        geoError.toLowerCase().includes("blocked"))
  );

  // Friendly human distance description
  const formattedDistance =
    distanceMeters !== null
      ? distanceMeters >= 1000
        ? `approx. ${(distanceMeters / 1000).toFixed(1)} km away`
        : `approx. ${Math.round(distanceMeters)} meters away`
      : "Location not detected";

  const formattedRadius =
    allowedRadius >= 1000
      ? `${(allowedRadius / 1000).toFixed(1)} km`
      : `${allowedRadius} meters`;

  const displayName = user.name || user.username || "Staff";

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
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-card, rgba(255, 255, 255, 0.04))",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: "2.25rem",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          gap: "1.35rem",
        }}
      >
        {/* Header Icon & Friendly Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: isPermissionDenied
                ? "rgba(245, 158, 11, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
              border: isPermissionDenied
                ? "1px solid rgba(245, 158, 11, 0.3)"
                : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              margin: "0 auto 1rem auto",
            }}
          >
            {isPermissionDenied ? "📍⚠️" : "🏢🔒"}
          </div>

          <h2
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "var(--text-main)",
              letterSpacing: "-0.01em",
            }}
          >
            {isPermissionDenied
              ? "Location Permission Needed"
              : "You're Outside the Work Location"}
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "var(--text-dim)",
              lineHeight: "1.55",
            }}
          >
            {isPermissionDenied ? (
              <>
                Hi <strong>{displayName}</strong>, please allow your browser to share
                your location so we can verify you are on-site at{" "}
                <strong style={{ color: "var(--text-main)" }}>{targetLabel}</strong>.
              </>
            ) : (
              <>
                Hi <strong>{displayName}</strong>, this account can only be accessed while
                on-site at{" "}
                <strong style={{ color: "var(--text-main)" }}>{targetLabel}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Clear, Human-Friendly Status Card */}
        {isPermissionDenied ? (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "14px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>🔒</span>
              <span style={{ fontWeight: 600, color: "var(--warning)", fontSize: "0.95rem" }}>
                Location Permission is Blocked
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-dim)", lineHeight: "1.5" }}>
              By browser security design, websites cannot automatically force the permission popup back open once it was blocked. You can re-enable it in 2 quick steps:
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "0.85rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.83rem" }}>
                <span
                  style={{
                    background: "var(--primary)",
                    color: "#000",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  1
                </span>
                <span>
                  Click the <strong>padlock (🔒)</strong> or <strong>tune / site settings</strong> icon at the far left of your browser's address bar.
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.83rem" }}>
                <span
                  style={{
                    background: "var(--primary)",
                    color: "#000",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  2
                </span>
                <span>
                  Change <strong>Location</strong> from <em>Block</em> to <strong>Allow</strong>.
                </span>
              </div>
            </div>

            <div
              style={{
                padding: "0.65rem 0.85rem",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>⚡</span>
              <span>
                NeuTruck will <strong>automatically detect</strong> when you flip the switch and verify your location!
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.15)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.15rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🏢 Required Location:
              </span>
              <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                {targetLabel}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                📍 Current Status:
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color:
                    distanceMeters !== null && distanceMeters <= allowedRadius
                      ? "#10b981"
                      : "#ef4444",
                }}
              >
                {formattedDistance}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.85rem",
              }}
            >
              <span style={{ color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🎯 Allowed Perimeter:
              </span>
              <span style={{ color: "var(--primary)", fontWeight: 500 }}>
                Within {formattedRadius}
              </span>
            </div>

            {/* Friendly Guidance Box */}
            <div
              style={{
                marginTop: "0.25rem",
                padding: "0.75rem 0.9rem",
                background: "rgba(59, 130, 246, 0.08)",
                borderRadius: "8px",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                fontSize: "0.8rem",
                color: "var(--text-dim)",
                lineHeight: "1.45",
              }}
            >
              <span>
                💡 <strong>Already at the office?</strong> Ensure Wi-Fi is turned on to improve device accuracy, then tap <em>Refresh Location</em>. If you are working off-site, a supervisor can approve your session below.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRetry}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.925rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderRadius: "10px",
            }}
          >
            <span>🔄</span> Refresh Location Check
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowAdminModal(true)}
              style={{
                padding: "0.65rem",
                fontSize: "0.85rem",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
              title="Request a manager or administrator to authorize off-site access"
            >
              <span>🔓</span> Supervisor Unlock
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onLogout}
              style={{
                padding: "0.65rem",
                fontSize: "0.85rem",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>

        {/* Collapsible Technical / GPS Details for IT / Admins */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setShowTechDetails(!showTechDetails)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "0.78rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0",
              margin: "0 auto",
            }}
          >
            <span>⚙️</span>
            <span>{showTechDetails ? "Hide Technical GPS Details" : "View Technical GPS Details"}</span>
            <span style={{ fontSize: "0.7rem" }}>{showTechDetails ? "▲" : "▼"}</span>
          </button>

          {showTechDetails && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.85rem 1rem",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "0.76rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                fontFamily: "monospace",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-dim)" }}>Target Coordinates:</span>
                <span style={{ color: "var(--text-main)" }}>
                  {user.allowed_latitude?.toFixed(5) ?? "N/A"},{" "}
                  {user.allowed_longitude?.toFixed(5) ?? "N/A"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-dim)" }}>Detected Coordinates:</span>
                <span style={{ color: currentLat !== null ? "var(--text-main)" : "#f59e0b" }}>
                  {currentLat !== null && currentLng !== null
                    ? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`
                    : "Unavailable"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-dim)" }}>Exact Distance:</span>
                <span style={{ color: "var(--text-main)" }}>
                  {distanceMeters !== null
                    ? `${Math.round(distanceMeters).toLocaleString()} meters`
                    : "N/A"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-dim)" }}>Allowed Radius:</span>
                <span style={{ color: "var(--text-main)" }}>{allowedRadius} meters</span>
              </div>
              {geoError && (
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingTop: "0.4rem",
                    color: "#f59e0b",
                    wordBreak: "break-word",
                  }}
                >
                  Error: {geoError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin / Supervisor Emergency Unlock Modal */}
      {showAdminModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAdminModal(false)}
        >
          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 45px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "1.1rem" }}>
                <span>🔓</span> Supervisor / Admin Approval
              </h4>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => setShowAdminModal(false)}
                style={{ borderRadius: "50%", width: "28px", height: "28px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "0.825rem", color: "var(--text-dim)", lineHeight: "1.45" }}>
              An authorized supervisor or administrator can approve a temporary session bypass to allow working outside the designated facility.
            </p>

            {adminError && (
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "0.8rem",
                }}
              >
                ⚠️ {adminError}
              </div>
            )}

            <form onSubmit={handleAdminUnlock} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Admin / Manager Username</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="e.g. admin"
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Admin / Manager Password</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowAdminModal(false)}
                  disabled={adminLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={adminLoading}
                >
                  {adminLoading ? "Verifying..." : "Approve Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


