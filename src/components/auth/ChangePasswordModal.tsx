import { useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import { useAuth } from "../../hooks/useAuth";

interface ChangePasswordModalProps {
  db: Database | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChangePasswordModal({ db, onSuccess, onCancel }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }

    if (!user || !db) {
      setError("Database or session unavailable.");
      return;
    }

    setLoading(true);

    try {
      let users: any[] = [];
      try {
        users = await db.select("SELECT * FROM neutruck.users WHERE id = $1 OR username = $2 LIMIT 1", [user.id, user.username]);
      } catch (_) {
        try {
          users = await db.select("SELECT * FROM users WHERE id = ? OR username = ? LIMIT 1", [user.id, user.username]);
        } catch (_) {}
      }

      const dbUser = users.length > 0 ? users[0] : null;
      if (dbUser) {
        if (dbUser.password_hash !== currentPassword) {
          throw new Error("Incorrect current password.");
        }
      } else {
        if (currentPassword !== "password123") {
          throw new Error("Incorrect current password.");
        }
      }

      const dbPath = String((db as any).path || (db as any).connection?.url || "");
      let isPg = dbPath.includes("postgres");
      if (!isPg) {
        try {
          await db.select("SELECT 1 FROM neutruck.users LIMIT 1");
          isPg = true;
        } catch (_) {
          isPg = false;
        }
      }

      if (dbUser) {
        const query = isPg
          ? "UPDATE neutruck.users SET password_hash = $1 WHERE id = $2 OR username = $3"
          : "UPDATE users SET password_hash = ? WHERE id = ? OR username = ?";
        await db.execute(query, [newPassword.trim(), dbUser.id, dbUser.username]);
      } else {
        const insertQuery = isPg
          ? "INSERT INTO neutruck.users (id, name, username, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, 1, true)"
          : "INSERT INTO users (id, name, username, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1, 1)";
        await db.execute(insertQuery, [user.id, user.name, user.username, newPassword.trim()]);
      }

      setSuccessMsg("Password updated successfully!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(10, 14, 26, 0.85)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem"
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        background: "var(--bg-card, #131b2e)",
        border: "1px solid var(--border, rgba(255,255,255,0.1))",
        borderRadius: "16px",
        padding: "2rem",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔑</div>
          <h2 style={{ margin: "0 0 0.35rem 0", fontSize: "1.35rem", color: "var(--text-main)" }}>
            Change Password
          </h2>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Update security credentials for account <strong>{user?.name}</strong>
          </p>
        </div>

        {error && (
          <div style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#f43f5e",
            fontSize: "0.82rem",
            fontWeight: 600,
            marginBottom: "1.25rem",
            textAlign: "center"
          }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981",
            fontSize: "0.82rem",
            fontWeight: 600,
            marginBottom: "1.25rem",
            textAlign: "center"
          }}>
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Current Password</label>
            <input
              type="password"
              required
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>New Password</label>
            <input
              type="password"
              required
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Confirm New Password</label>
            <input
              type="password"
              required
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            {onCancel && (
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              style={{ flex: 1 }}
            >
              {loading ? "Updating..." : "💾 Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
