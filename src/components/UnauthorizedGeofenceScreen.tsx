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

  const isPermissionDenied =
    geoError &&
    (geoError.toLowerCase().includes("denied") ||
      geoError.toLowerCase().includes("permission") ||
      geoError.toLowerCase().includes("blocked"));

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
          maxWidth: "580px",
          background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "2.25rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: isPermissionDenied ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: isPermissionDenied ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.2rem",
              margin: "0 auto 1rem auto",
            }}
          >
            {isPermissionDenied ? "📍⚠️" : "📍🔒"}
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)" }}>
            {isPermissionDenied ? "Location Permission Required" : "Outside Authorized Location"}
          </h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-dim)", lineHeight: "1.5" }}>
            {isPermissionDenied
              ? `Staff account "${user.name}" (${user.username}) has geolocation access enforcement enabled. Please allow device location access to verify physical presence at ${targetLabel}.`
              : `Staff account "${user.name}" (${user.username}) is restricted to access the application only while within the designated perimeter of ${targetLabel}.`}
          </p>
        </div>

        {/* Location Status Breakdown Card */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Authorized Location:</span>
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{targetLabel}</span>
          </div>

          {user.allowed_latitude !== null && user.allowed_latitude !== undefined && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem" }}>
              <span style={{ color: "var(--text-dim)" }}>Target Coordinates:</span>
              <span style={{ fontFamily: "monospace", color: "var(--text-main)" }}>
                {user.allowed_latitude?.toFixed(5)}, {user.allowed_longitude?.toFixed(5)}
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Allowed Perimeter:</span>
            <span style={{ fontWeight: 600, color: "var(--primary)" }}>Within {allowedRadius} meters</span>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", fontSize: "0.825rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Current Detected Coordinates:</span>
            <span style={{ fontFamily: "monospace", color: currentLat !== null ? "var(--text-main)" : "#f59e0b" }}>
              {currentLat !== null && currentLng !== null
                ? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`
                : "Unavailable"}
            </span>
          </div>

          {distanceMeters !== null && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.825rem" }}>
              <span style={{ color: "var(--text-dim)" }}>Distance from Facility:</span>
              <span style={{ fontWeight: 700, color: distanceMeters <= allowedRadius ? "#10b981" : "#ef4444" }}>
                {(distanceMeters / 1000).toFixed(2)} km ({Math.round(distanceMeters).toLocaleString()} m away)
              </span>
            </div>
          )}

          {geoError && (
            <div
              style={{
                marginTop: "0.25rem",
                padding: "0.6rem 0.85rem",
                background: "rgba(245, 158, 11, 0.12)",
                borderRadius: "6px",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                fontSize: "0.78rem",
                color: "#f59e0b",
              }}
            >
              ⚠️ {geoError}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRetry}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            <span>🔄</span> Refresh Location Check
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowAdminModal(true)}
              style={{ padding: "0.65rem", fontSize: "0.85rem" }}
            >
              🔓 Admin Unlock
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onLogout}
              style={{ padding: "0.65rem", fontSize: "0.85rem" }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Browser Permission Help */}
        {isPermissionDenied && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "0.78rem",
              color: "var(--text-dim)",
              lineHeight: "1.4",
            }}
          >
            <strong>💡 How to Enable Location Access:</strong>
            <ol style={{ margin: "0.35rem 0 0 1.25rem", padding: 0 }}>
              <li>Click the <strong>Lock (🔒)</strong> or <strong>Site Settings</strong> icon in your browser URL bar.</li>
              <li>Find <strong>Location</strong> and switch it from <em>Block</em> to <strong>Allow</strong>.</li>
              <li>Click <strong>Refresh Location Check</strong> above.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Admin Emergency Unlock Modal */}
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
          }}
          onClick={() => setShowAdminModal(false)}
        >
          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>🔓</span> Administrator Override
              </h4>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => setShowAdminModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "0.825rem", color: "var(--text-dim)" }}>
              An authorized administrator may grant a temporary geofence bypass for this workstation session.
            </p>

            {adminError && (
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "6px",
                  color: "#ef4444",
                  fontSize: "0.8rem",
                }}
              >
                ⚠️ {adminError}
              </div>
            )}

            <form onSubmit={handleAdminUnlock} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Admin Username</label>
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
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Admin Password</label>
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
                  {adminLoading ? "Verifying..." : "Authorize Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
