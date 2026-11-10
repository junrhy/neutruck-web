import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { User, Role } from "../../types";

interface UserManagementProps {
  db: Database | null;
}

export default function UserManagement({ db }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [userPassword, setUserPassword] = useState("password123");

  const loadData = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      let usersData: any[] = [];
      let rolesData: any[] = [];

      try {
        usersData = await db.select("SELECT * FROM neutruck.users ORDER BY id DESC");
      } catch (uErr: any) {
        console.warn("Retrying users without schema prefix...", uErr);
        try {
          usersData = await db.select("SELECT * FROM users ORDER BY id DESC");
        } catch (uErr2: any) {
          console.error("Error fetching users from DB:", uErr2);
          setError(`Failed to fetch users: ${uErr2.message || String(uErr2)}`);
        }
      }

      try {
        rolesData = await db.select("SELECT * FROM neutruck.roles ORDER BY name ASC");
      } catch (rErr: any) {
        try {
          rolesData = await db.select("SELECT * FROM roles ORDER BY name ASC");
        } catch (_) {}
      }

      setUsers(
        (usersData || []).map((u) => ({
          id: String(u.id),
          name: u.name,
          username: u.username,
          role_id: String(u.role_id),
          is_active: u.is_active === 1 || u.is_active === true || u.is_active === "1",
        }))
      );
      setRoles(
        (rolesData || []).map((r) => ({
          id: String(r.id),
          name: r.name,
          description: r.description,
        }))
      );
    } catch (err: any) {
      console.error("UserManagement loadData error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [db]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !db) return;

    try {
      const dbPath = String((db as any).path || (db as any).connection?.url || "");
      let isPg = dbPath.includes("postgres");
      if (!isPg) {
        // Probe if neutruck schema exists in current database
        try {
          await db.select("SELECT 1 FROM neutruck.users LIMIT 1");
          isPg = true;
        } catch (_) {
          isPg = false;
        }
      }

      const isActive = Boolean(editingUser.is_active);
      const roleIdStr = String(editingUser.role_id || "1");

      if (editingUser.id) {
        const userIdStr = String(editingUser.id);
        const query = isPg
          ? "UPDATE neutruck.users SET name = $1, role_id = $2, is_active = ($3 = 1) WHERE id = $4"
          : "UPDATE users SET name = ?, role_id = ?, is_active = ? WHERE id = ?";
        
        const binds = [editingUser.name, roleIdStr, isActive ? 1 : 0, userIdStr];
        await db.execute(query, binds);
      } else {
        const newId = `USR-${Date.now()}`;
        const query = isPg
          ? "INSERT INTO neutruck.users (id, name, username, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, $5, ($6 = 1))"
          : "INSERT INTO users (id, name, username, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?)";
        
        const binds = [newId, editingUser.name, editingUser.username?.trim(), userPassword, roleIdStr, isActive ? 1 : 0];
        await db.execute(query, binds);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Save user error:", err);
      setError(err.message || String(err));
    }
  };

  const toggleUserActive = async (u: User) => {
    if (!db) return;
    try {
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
      const nextActive = u.is_active ? 0 : 1;
      const query = isPg
        ? "UPDATE neutruck.users SET is_active = ($1 = 1) WHERE id = $2"
        : "UPDATE users SET is_active = ? WHERE id = ?";
      await db.execute(query, [nextActive, String(u.id)]);
      loadData();
    } catch (err: any) {
      console.error("Toggle user error:", err);
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>👤 Freight Staff User Accounts</h3>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Register dispatchers, fleet managers, gate checkers, and administrator accounts.
          </p>
        </div>
        {!isFormOpen && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingUser({ name: "", username: "", role_id: roles[0]?.id || "1", is_active: true });
              setUserPassword("password123");
              setIsFormOpen(true);
            }}
          >
            ➕ Register Staff User
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "rgba(244, 63, 94, 0.15)", borderRadius: "8px", color: "#f43f5e", fontSize: "0.85rem", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {isFormOpen && (
        <div style={{ padding: "1.5rem", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "12px" }}>
          <h4 style={{ margin: "0 0 1.25rem 0", color: "var(--text-main)" }}>
            {editingUser?.id ? "✏️ Edit Staff User" : "✨ Register New Staff Account"}
          </h4>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingUser?.name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser!, name: e.target.value })}
                  placeholder="e.g. Maria Santos"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser?.id}
                  className="form-input"
                  value={editingUser?.username || ""}
                  onChange={(e) => setEditingUser({ ...editingUser!, username: e.target.value })}
                  placeholder="e.g. dispatcher_santos"
                />
              </div>

              {!editingUser?.id && (
                <div className="form-group">
                  <label className="form-label">Default Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Assigned Role</label>
                <select
                  className="form-select"
                  value={editingUser?.role_id || ""}
                  onChange={(e) => setEditingUser({ ...editingUser!, role_id: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                💾 Save User Account
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading user accounts...</div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>User Account</th>
                <th>Username</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
                    No staff user accounts found. Click <strong>"➕ Register Staff User"</strong> above or check your database connection.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleObj = roles.find((r) => String(r.id) === String(u.role_id));
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "rgba(0, 212, 255, 0.15)",
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.85rem"
                          }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{u.username}</td>
                      <td>
                        <span className="badge badge-purple">🛡️ {roleObj ? roleObj.name : "Custom Role"}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                            onClick={() => {
                              setEditingUser(u);
                              setIsFormOpen(true);
                            }}
                          >
                            ✏️ Edit
                          </button>
                          {u.username !== "admin" && (
                            <button
                              className={`btn ${u.is_active ? "btn-danger" : "btn-primary"}`}
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                              onClick={() => toggleUserActive(u)}
                            >
                              {u.is_active ? "🚫 Disable" : "✅ Enable"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
