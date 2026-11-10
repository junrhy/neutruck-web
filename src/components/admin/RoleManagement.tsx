import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Role, Permission } from "../../types";

interface RoleManagementProps {
  db: Database | null;
}

const DEFAULT_MODULES = [
  { id: "dispatch", name: "📦 Dispatch Board & GPS Map" },
  { id: "fleet", name: "🚚 Fleet Vehicles & Operations (Fuel, Inspections, Drivers, Helpers, Clients, RoRo, Destinations)" },
  { id: "waybills", name: "📑 Waybills & Freight Billing" },
  { id: "maintenance", name: "🔧 Vehicle Repairs & Maintenance" },
  { id: "reports", name: "📊 Intelligence & Analytics Reports" },
  { id: "sms", name: "💬 Communications & SMS Console" },
  { id: "users", name: "👥 Users & Roles Administration" },
  { id: "settings", name: "⚙️ System & Hardware Settings" },
];

export default function RoleManagement({ db }: RoleManagementProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<(Partial<Role> & { permission_ids: string[] }) | null>(null);

  const ALL_SYSTEM_PERMISSIONS: Permission[] = [
    { id: "dispatch", module_name: "dispatch", action_name: "Full Access to Dispatch Board & Map" },
    { id: "delivery_status_in_transit", module_name: "dispatch", action_name: "Set Delivery Status to In Transit / RoRo" },
    { id: "delivery_status_delivered", module_name: "dispatch", action_name: "Set Delivery Status to Delivered" },
    { id: "delivery_status_cancelled", module_name: "dispatch", action_name: "Set Delivery Status to Cancelled" },
    { id: "fleet", module_name: "fleet", action_name: "Full Access to Fleet Operations & Masters" },
    { id: "waybills", module_name: "waybills", action_name: "Full Access to Waybills & Billing" },
    { id: "billing_status_prepared", module_name: "waybills", action_name: "Set Statement Status to Prepared" },
    { id: "billing_status_checked", module_name: "waybills", action_name: "Set Statement Status to Checked" },
    { id: "billing_status_approved", module_name: "waybills", action_name: "Set Statement Status to Approved" },
    { id: "billing_delete_statement", module_name: "waybills", action_name: "Delete Saved Billing Statements" },
    { id: "maintenance", module_name: "maintenance", action_name: "Vehicle Repairs & Maintenance" },
    { id: "reports", module_name: "reports", action_name: "Full Access to Intelligence Reports" },
    { id: "report_daily_trip", module_name: "reports", action_name: "Access Daily Trip Report" },
    { id: "report_wingvan_trip", module_name: "reports", action_name: "Access Wingvan Trip & Payroll Report" },
    { id: "report_billing_statement", module_name: "reports", action_name: "Access Client Billing Statement" },
    { id: "report_overdue_statement", module_name: "reports", action_name: "Access Overdue Statements Report" },
    { id: "report_container", module_name: "reports", action_name: "Access Per Trip Delivery Report" },
    { id: "report_financial", module_name: "reports", action_name: "Access Revenue & Profitability P&L" },
    { id: "report_utilization", module_name: "reports", action_name: "Access Fleet Utilization Report" },
    { id: "report_collectibles", module_name: "reports", action_name: "Access Accounts Receivable (Collectibles)" },
    { id: "report_roro", module_name: "reports", action_name: "Access Inter-Island RoRo Passage Report" },
    { id: "report_maintenance", module_name: "reports", action_name: "Access Repair & Maintenance Expenses Report" },
    { id: "sms", module_name: "sms", action_name: "Access SMS Broadcast Console" },
    { id: "users", module_name: "users", action_name: "Users & Roles Administration" },
    { id: "settings", module_name: "settings", action_name: "System Settings" },
  ];

  const loadData = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      let rolesData: any[] = [];
      let permsData: any[] = [];

      try {
        rolesData = await db.select("SELECT * FROM neutruck.roles ORDER BY id ASC");
      } catch (rErr: any) {
        try {
          rolesData = await db.select("SELECT * FROM roles ORDER BY id ASC");
        } catch (rErr2: any) {
          console.error("Error fetching roles from DB:", rErr2);
          setError(`Failed to fetch roles: ${rErr2.message || String(rErr2)}`);
        }
      }

      try {
        permsData = await db.select("SELECT * FROM neutruck.permissions ORDER BY module_name ASC");
      } catch (pErr: any) {
        try {
          permsData = await db.select("SELECT * FROM permissions ORDER BY module_name ASC");
        } catch (_) {}
      }

      setRoles(
        (rolesData || []).map((r) => ({
          id: String(r.id),
          name: r.name,
          description: r.description,
        }))
      );

      const dbPerms: Permission[] = (permsData || []).map((p) => ({
        id: String(p.id),
        module_name: p.module_name,
        action_name: p.action_name,
      }));

      // Combine DB permissions with fallback permissions without duplicates
      const mergedPermsMap = new Map<string, Permission>();
      [...ALL_SYSTEM_PERMISSIONS, ...dbPerms].forEach((p) => mergedPermsMap.set(p.id, p));
      setPermissions(Array.from(mergedPermsMap.values()));
    } catch (err: any) {
      console.error("RoleManagement loadData error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [db]);

  const handleEditRole = async (r: Role) => {
    if (!db) return;
    try {
      const dbPath = String((db as any).path || (db as any).connection?.url || "");
      let isPg = dbPath.includes("postgres");
      if (!isPg) {
        try {
          await db.select("SELECT 1 FROM neutruck.roles LIMIT 1");
          isPg = true;
        } catch (_) {
          isPg = false;
        }
      }

      const roleIdVal = isPg ? Number(r.id) || 1 : Number(r.id) || r.id;
      const query = isPg
        ? "SELECT permission_id FROM neutruck.role_permissions WHERE role_id = $1"
        : "SELECT permission_id FROM role_permissions WHERE role_id = ?";
      
      const rolePerms: any[] = await db.select(query, [roleIdVal]);
      setEditingRole({
        ...r,
        permission_ids: rolePerms.map((rp) => String(rp.permission_id)),
      });
      setIsFormOpen(true);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !db) return;

    try {
      const dbPath = String((db as any).path || (db as any).connection?.url || "");
      let isPg = dbPath.includes("postgres");
      if (!isPg) {
        try {
          await db.select("SELECT 1 FROM neutruck.roles LIMIT 1");
          isPg = true;
        } catch (_) {
          isPg = false;
        }
      }

      let roleId = editingRole.id;
      if (roleId) {
        const roleIdVal = Number(roleId) || 1;
        const updateQuery = isPg
          ? "UPDATE neutruck.roles SET name = $1, description = $2 WHERE id = $3"
          : "UPDATE roles SET name = ?, description = ? WHERE id = ?";
        await db.execute(updateQuery, [editingRole.name, editingRole.description || "", roleIdVal]);

        const deletePermsQuery = isPg
          ? "DELETE FROM neutruck.role_permissions WHERE role_id = $1"
          : "DELETE FROM role_permissions WHERE role_id = ?";
        await db.execute(deletePermsQuery, [roleIdVal]);
      } else {
        const insertRoleQuery = isPg
          ? "INSERT INTO neutruck.roles (name, description) VALUES ($1, $2)"
          : "INSERT INTO roles (name, description) VALUES (?, ?)";
        const res: any = await db.execute(insertRoleQuery, [editingRole.name, editingRole.description || ""]);
        roleId = String(res.lastInsertId ?? res.lastInsertRowId ?? res.id);
      }

      const roleIdNum = Number(roleId) || 1;
      for (const pId of editingRole.permission_ids) {
        const insertPermQuery = isPg
          ? "INSERT INTO neutruck.role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
          : "INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)";
        await db.execute(insertPermQuery, [roleIdNum, pId]);
      }

      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  };

  const togglePermission = (permId: string) => {
    if (!editingRole) return;
    const exists = editingRole.permission_ids.includes(permId);
    const updated = exists
      ? editingRole.permission_ids.filter((id) => id !== permId)
      : [...editingRole.permission_ids, permId];
    setEditingRole({ ...editingRole, permission_ids: updated });
  };

  const handleDeleteRole = async (r: Role) => {
    if (!db) return;

    if (r.name === "Admin") {
      alert("The System Admin role cannot be deleted.");
      return;
    }

    try {
      const dbPath = String((db as any).path || (db as any).connection?.url || "");
      let isPg = dbPath.includes("postgres");
      if (!isPg) {
        try {
          await db.select("SELECT 1 FROM neutruck.roles LIMIT 1");
          isPg = true;
        } catch (_) {
          isPg = false;
        }
      }

      const roleIdVal = Number(r.id) || 1;
      const checkUsersQuery = isPg
        ? "SELECT id, name FROM neutruck.users WHERE role_id = $1 LIMIT 5"
        : "SELECT id, name FROM users WHERE role_id = ? LIMIT 5";
      
      const assignedUsers: any[] = await db.select(checkUsersQuery, [String(r.id)]);

      if (assignedUsers.length > 0) {
        const names = assignedUsers.map((u) => u.name).join(", ");
        alert(`Cannot delete role "${r.name}" because it is currently assigned to user(s): ${names}. Please reassign those users first.`);
        return;
      }

      if (confirm(`Are you sure you want to delete the role "${r.name}"?`)) {
        const delPermsQuery = isPg
          ? "DELETE FROM neutruck.role_permissions WHERE role_id = $1"
          : "DELETE FROM role_permissions WHERE role_id = ?";
        await db.execute(delPermsQuery, [roleIdVal]);

        const delRoleQuery = isPg
          ? "DELETE FROM neutruck.roles WHERE id = $1"
          : "DELETE FROM roles WHERE id = ?";
        await db.execute(delRoleQuery, [roleIdVal]);
        loadData();
      }
    } catch (err: any) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>🛡️ User Roles &amp; Access Control Matrix</h3>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Configure granular permissions per role.
          </p>
        </div>
        {!isFormOpen && (
          <button
            className="btn btn-outline"
            onClick={() => {
              setEditingRole({ name: "", description: "", permission_ids: [] });
              setIsFormOpen(true);
            }}
          >
            ➕ Create Custom Role
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
            {editingRole?.id ? `✏️ Edit Role: ${editingRole.name}` : "✨ Create New Custom Role"}
          </h4>

          <form onSubmit={handleSaveRole} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Role Name</label>
                <input
                  type="text"
                  required
                  disabled={editingRole?.name === "Admin"}
                  className="form-input"
                  value={editingRole?.name || ""}
                  onChange={(e) => setEditingRole({ ...editingRole!, name: e.target.value })}
                  placeholder="e.g. Fleet Gate Inspector"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingRole?.description || ""}
                  onChange={(e) => setEditingRole({ ...editingRole!, description: e.target.value })}
                  placeholder="e.g. Inspects haul trucks & records maintenance logs"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: "0.75rem", display: "block" }}>
                Module Permissions Matrix
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {DEFAULT_MODULES.map((mod) => {
                  const modPerms = permissions.filter((p) => p.module_name === mod.id);
                  return (
                    <div
                      key={mod.id}
                      style={{
                        padding: "1rem",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    >
                      <strong style={{ fontSize: "0.85rem", color: "var(--text-main)", display: "block", marginBottom: "0.5rem" }}>
                        {mod.name}
                      </strong>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {modPerms.length === 0 ? (
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-main)" }}>
                            <input
                              type="checkbox"
                              checked={editingRole?.permission_ids.includes(mod.id)}
                              onChange={() => togglePermission(mod.id)}
                              disabled={editingRole?.name === "Admin"}
                            />
                            Full Access to {mod.name}
                          </label>
                        ) : (
                          modPerms.map((p) => {
                            const hasFullAccess = editingRole?.permission_ids.includes(mod.id);
                            const isFullAccessItem = p.id === mod.id;
                            const isChecked = hasFullAccess || editingRole?.permission_ids.includes(p.id);
                            const isDisabled = editingRole?.name === "Admin" || (!isFullAccessItem && hasFullAccess);

                            return (
                              <label
                                key={p.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  fontSize: "0.8rem",
                                  color: isDisabled && !isFullAccessItem ? "var(--text-muted)" : "var(--text-main)",
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                  opacity: isDisabled && !isFullAccessItem ? 0.7 : 1,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.id)}
                                  disabled={isDisabled}
                                />
                                {p.action_name}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                💾 Save Role Permissions
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading roles...</div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
                    No roles found. Click <strong>"➕ Create Custom Role"</strong> above or check your database connection.
                  </td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="badge badge-purple">🛡️ {r.name}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{r.description || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                          onClick={() => handleEditRole(r)}
                        >
                          ✏️ Edit Matrix
                        </button>
                        {r.name !== "Admin" && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem" }}
                            onClick={() => handleDeleteRole(r)}
                          >
                            🗑 Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
