import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { User, Role } from "../../types";
import GeofenceMapPickerModal from "./GeofenceMapPickerModal";

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
  const [fetchingGps, setFetchingGps] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditingUser((prev) => ({
          ...prev!,
          allowed_latitude: Number(pos.coords.latitude.toFixed(6)),
          allowed_longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setFetchingGps(false);
      },
      (err) => {
        alert("Failed to acquire device GPS coordinates: " + err.message);
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
          geofence_enabled: Boolean(u.geofence_enabled),
          allowed_latitude: u.allowed_latitude !== null && u.allowed_latitude !== undefined ? Number(u.allowed_latitude) : null,
          allowed_longitude: u.allowed_longitude !== null && u.allowed_longitude !== undefined ? Number(u.allowed_longitude) : null,
          allowed_radius_meters: u.allowed_radius_meters ? Number(u.allowed_radius_meters) : 1000,
          geofence_label: u.geofence_label || "",
          allowed_geofences: typeof u.allowed_geofences === "string" ? JSON.parse(u.allowed_geofences) : (u.allowed_geofences || null),
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
      const geofenceEnabled = Boolean(editingUser.geofence_enabled);
      const allowedLat = editingUser.allowed_latitude !== undefined && editingUser.allowed_latitude !== null && editingUser.allowed_latitude !== ("" as any)
        ? Number(editingUser.allowed_latitude)
        : null;
      const allowedLng = editingUser.allowed_longitude !== undefined && editingUser.allowed_longitude !== null && editingUser.allowed_longitude !== ("" as any)
        ? Number(editingUser.allowed_longitude)
        : null;
      const allowedRadius = editingUser.allowed_radius_meters ? Number(editingUser.allowed_radius_meters) : 1000;
      const geofenceLabel = editingUser.geofence_label?.trim() || "";

      if (editingUser.id) {
        const userIdStr = String(editingUser.id);
        const query = isPg
          ? `UPDATE neutruck.users 
             SET name = $1, role_id = $2, is_active = ($3 = 1),
                 geofence_enabled = ($4 = 1), allowed_latitude = $5, allowed_longitude = $6,
                 allowed_radius_meters = $7, geofence_label = $8
             WHERE id = $9`
          : `UPDATE users 
             SET name = ?, role_id = ?, is_active = ?,
                 geofence_enabled = ?, allowed_latitude = ?, allowed_longitude = ?,
                 allowed_radius_meters = ?, geofence_label = ?
             WHERE id = ?`;
        
        const binds = [
          editingUser.name,
          roleIdStr,
          isActive ? 1 : 0,
          geofenceEnabled ? 1 : 0,
          allowedLat,
          allowedLng,
          allowedRadius,
          geofenceLabel,
          userIdStr,
        ];
        await db.execute(query, binds);
      } else {
        const newId = `USR-${Date.now()}`;
        const query = isPg
          ? `INSERT INTO neutruck.users 
             (id, name, username, password_hash, role_id, is_active, geofence_enabled, allowed_latitude, allowed_longitude, allowed_radius_meters, geofence_label)
             VALUES ($1, $2, $3, $4, $5, ($6 = 1), ($7 = 1), $8, $9, $10, $11)`
          : `INSERT INTO users 
             (id, name, username, password_hash, role_id, is_active, geofence_enabled, allowed_latitude, allowed_longitude, allowed_radius_meters, geofence_label)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const binds = [
          newId,
          editingUser.name,
          editingUser.username?.trim(),
          userPassword,
          roleIdStr,
          isActive ? 1 : 0,
          geofenceEnabled ? 1 : 0,
          allowedLat,
          allowedLng,
          allowedRadius,
          geofenceLabel,
        ];
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

            {/* Geolocation Access Restriction Section */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
                marginTop: "0.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>📍</span> Geolocation Access Restriction
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                    Restrict this user so they can only access the web app while physically present at an authorized facility, terminal, or garage.
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(editingUser?.geofence_enabled)}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser!,
                        geofence_enabled: e.target.checked,
                        allowed_radius_meters: editingUser?.allowed_radius_meters || 1000,
                      })
                    }
                  />
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: editingUser?.geofence_enabled ? "var(--primary)" : "var(--text-dim)",
                    }}
                  >
                    {editingUser?.geofence_enabled ? "Restricted (Geofence Enforced)" : "Unrestricted (Access Anywhere)"}
                  </span>
                </label>
              </div>

              {editingUser?.geofence_enabled && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginTop: "1rem",
                    paddingTop: "0.85rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "1rem" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.8rem" }}>Facility / Geofence Label *</label>
                      <input
                        type="text"
                        required={editingUser.geofence_enabled}
                        className="form-input"
                        placeholder="e.g. Mandaue Central Garage / Dispatch Hub"
                        value={editingUser?.geofence_label || ""}
                        onChange={(e) => setEditingUser({ ...editingUser!, geofence_label: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.8rem" }}>Target Latitude *</label>
                      <input
                        type="number"
                        step="0.000001"
                        required={editingUser.geofence_enabled}
                        className="form-input"
                        placeholder="e.g. 10.334185"
                        value={editingUser?.allowed_latitude ?? ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser!,
                            allowed_latitude: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.8rem" }}>Target Longitude *</label>
                      <input
                        type="number"
                        step="0.000001"
                        required={editingUser.geofence_enabled}
                        className="form-input"
                        placeholder="e.g. 123.945281"
                        value={editingUser?.allowed_longitude ?? ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser!,
                            allowed_longitude: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", margin: 0 }}>Allowed Radius:</label>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {[250, 500, 1000, 2000, 5000].map((radius) => (
                          <button
                            key={radius}
                            type="button"
                            className={`btn btn-xs ${
                              editingUser?.allowed_radius_meters === radius ? "btn-primary" : "btn-outline"
                            }`}
                            onClick={() => setEditingUser({ ...editingUser!, allowed_radius_meters: radius })}
                          >
                            {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="50"
                        step="50"
                        className="form-input form-input-sm"
                        style={{ width: "90px", fontSize: "0.8rem" }}
                        value={editingUser?.allowed_radius_meters || 1000}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser!,
                            allowed_radius_meters: parseInt(e.target.value, 10) || 1000,
                          })
                        }
                        title="Custom radius in meters"
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>meters</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowMapPicker(true)}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        <span>🗺️</span> Select on Map
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleGetCurrentLocation}
                        disabled={fetchingGps}
                        style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                      >
                        <span>📍</span> {fetchingGps ? "Acquiring Device GPS..." : "Set Current Location"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                <th>Location Access</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
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
                        {u.geofence_enabled && u.allowed_latitude !== null && u.allowed_latitude !== undefined ? (
                          <span
                            className="badge badge-warning"
                            title={`Restricted to ${u.geofence_label || "Facility"} within ${u.allowed_radius_meters || 1000}m`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <span>📍</span>
                            <span>{u.geofence_label || "Geofenced"} ({u.allowed_radius_meters ? (u.allowed_radius_meters >= 1000 ? `${u.allowed_radius_meters / 1000}km` : `${u.allowed_radius_meters}m`) : "1km"})</span>
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              color: "var(--text-dim)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            🌐 Anywhere
                          </span>
                        )}
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

      {showMapPicker && (
        <GeofenceMapPickerModal
          initialLat={editingUser?.allowed_latitude ?? null}
          initialLng={editingUser?.allowed_longitude ?? null}
          initialRadius={editingUser?.allowed_radius_meters || 1000}
          initialLabel={editingUser?.geofence_label || ""}
          onConfirm={({ latitude, longitude, radiusMeters, label }) => {
            setEditingUser((prev) => ({
              ...prev!,
              geofence_enabled: true,
              allowed_latitude: latitude,
              allowed_longitude: longitude,
              allowed_radius_meters: radiusMeters,
              geofence_label: label,
            }));
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
