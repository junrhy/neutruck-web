import React, { useState, useEffect } from "react";
import { AllowedIp } from "../../types";
import { useDialog } from "../common/CustomDialogModal";

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return { error: `Server error (${res.status} ${res.statusText}). Backend server may need to be restarted.` };
  }
}

export default function SecurityIpManagement() {
  const { showAlert, showConfirm } = useDialog();

  const [loading, setLoading] = useState(true);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [clientIp, setClientIp] = useState("");
  const [allowedIps, setAllowedIps] = useState<AllowedIp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [ipInput, setIpInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/ip-status");
      if (res.ok) {
        const data = await safeJson(res);
        setWhitelistEnabled(Boolean(data.whitelistEnabled));
        setClientIp(data.clientIp || "");
        setAllowedIps(data.allowedIps || []);
      }
    } catch (err: any) {
      console.error("Failed to load IP security status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const isCurrentIpWhitelisted = allowedIps.some((item) => {
    if (!item.is_active) return false;
    const p = item.ip_address.trim().toLowerCase();
    const c = clientIp.trim().toLowerCase();
    if (p === "*" || p === c) return true;
    if ((c === "127.0.0.1" || c === "::1") && (p === "127.0.0.1" || p === "::1" || p === "localhost")) return true;
    if (p.endsWith(".*") && c.startsWith(p.slice(0, -2) + ".")) return true;
    return false;
  });

  const handleToggleWhitelist = async () => {
    const nextState = !whitelistEnabled;
    const confirmMsg = nextState
      ? "Enabling the IP Whitelist will restrict access to all pages of the app. Only devices connecting from authorized IP addresses will be able to access NeuTruck. Your current IP will be automatically authorized. Proceed?"
      : "Are you sure you want to disable the IP Whitelist? Any device with network access will be able to reach the application.";

    const confirmed = await showConfirm(confirmMsg, nextState ? "Enable IP Whitelist" : "Disable IP Whitelist", {
      confirmLabel: nextState ? "Enable Enforcement" : "Disable Enforcement",
      type: nextState ? "warning" : "info",
    });

    if (!confirmed) return;

    setToggling(true);
    try {
      const res = await fetch("/api/security/ip-whitelist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        setWhitelistEnabled(nextState);
        await showAlert(
          nextState
            ? "IP Whitelist is now active! Only allowed IP addresses can access the application."
            : "IP Whitelist has been disabled. Open access restored.",
          "Security Setting Updated",
          "success"
        );
        fetchStatus();
      } else {
        const err = await safeJson(res);
        showAlert(err.error || "Failed to update whitelist setting", "Error", "danger");
      }
    } catch (err: any) {
      showAlert(err.message || "Network error", "Error", "danger");
    } finally {
      setToggling(false);
    }
  };

  const handleQuickAddCurrentIp = async () => {
    if (!clientIp) return;
    try {
      const res = await fetch("/api/security/ip-whitelist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: clientIp,
          label: "Current Workstation",
          description: "Added via Quick Authorization in Settings",
        }),
      });
      if (res.ok) {
        await showAlert(`IP Address ${clientIp} has been whitelisted!`, "Device Authorized", "success");
        fetchStatus();
      } else {
        const err = await safeJson(res);
        showAlert(err.error || "Failed to add IP", "Error", "danger");
      }
    } catch (err: any) {
      showAlert(err.message || "Network error", "Error", "danger");
    }
  };

  const handleAddIpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipInput.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/security/ip-whitelist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: ipInput.trim(),
          label: labelInput.trim() || "Authorized Device",
          description: descInput.trim(),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setIpInput("");
        setLabelInput("");
        setDescInput("");
        await showAlert("IP Address successfully added to the authorized list.", "IP Whitelisted", "success");
        fetchStatus();
      } else {
        const err = await safeJson(res);
        showAlert(err.error || "Failed to add IP address", "Error", "danger");
      }
    } catch (err: any) {
      showAlert(err.message || "Network error", "Error", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: AllowedIp) => {
    try {
      const nextActive = !item.is_active;
      const res = await fetch("/api/security/ip-whitelist/toggle-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_active: nextActive }),
      });
      if (res.ok) {
        setAllowedIps((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: nextActive } : i))
        );
      }
    } catch (err) {
      console.error("Toggle active error:", err);
    }
  };

  const handleDeleteIp = async (item: AllowedIp) => {
    const confirmed = await showConfirm(
      `Are you sure you want to remove ${item.ip_address} (${item.label}) from the whitelist?`,
      "Remove Allowed IP",
      { confirmLabel: "Delete IP", type: "danger" }
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/security/ip-whitelist/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (res.ok) {
        setAllowedIps((prev) => prev.filter((i) => i.id !== item.id));
        showAlert("IP Address removed from whitelist.", "Removed", "info");
      } else {
        const err = await safeJson(res);
        showAlert(err.error || "Failed to delete IP", "Error", "danger");
      }
    } catch (err: any) {
      showAlert(err.message || "Network error", "Error", "danger");
    }
  };

  const filteredIps = allowedIps.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.ip_address.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Info */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius, 12px)",
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.4rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🛡️</span> IP Address Whitelist & Access Control
            </h3>
            <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: "1.5" }}>
              Control which devices and networks are allowed to access NeuTruck. When enabled, only computers and terminals connecting from approved IP addresses can open any page in this application.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-sm, 8px)",
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              color: "var(--text-main)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              whiteSpace: "nowrap",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Enforcement Status & Toggle Card */}
      <div
        style={{
          background: whitelistEnabled ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
          border: `1px solid ${whitelistEnabled ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.3)"}`,
          borderRadius: "var(--radius, 12px)",
          padding: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: whitelistEnabled ? "rgba(16, 185, 129, 0.16)" : "rgba(239, 68, 68, 0.16)",
              color: whitelistEnabled ? "var(--success, #10b981)" : "var(--danger, #ef4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            {whitelistEnabled ? "🔒" : "🔓"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-main)" }}>
                IP Whitelist Enforcement:
              </span>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "20px",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  background: whitelistEnabled ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)",
                  color: whitelistEnabled ? "var(--success, #10b981)" : "var(--danger, #ef4444)",
                  border: `1px solid ${whitelistEnabled ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                }}
              >
                {whitelistEnabled ? "ACTIVE (STRICT)" : "DISABLED (OPEN)"}
              </span>
            </div>
            <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.82rem" }}>
              {whitelistEnabled
                ? "All app pages are restricted to authorized IP addresses. Unauthorized visitors are blocked."
                : "The application is currently accessible from any network IP."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleWhitelist}
          disabled={toggling}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "var(--radius-sm, 8px)",
            background: whitelistEnabled ? "var(--danger, #ef4444)" : "var(--success, #10b981)",
            color: "#ffffff",
            border: "none",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: toggling ? "wait" : "pointer",
            boxShadow: whitelistEnabled ? "0 4px 12px rgba(239, 68, 68, 0.25)" : "0 4px 12px rgba(16, 185, 129, 0.25)",
          }}
        >
          {toggling
            ? "Updating..."
            : whitelistEnabled
            ? "Turn OFF Whitelist"
            : "Turn ON Whitelist"}
        </button>
      </div>

      {/* Current IP Address Banner */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius, 12px)",
          padding: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--primary-alpha, rgba(2, 132, 199, 0.12))",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
            }}
          >
            💻
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Your Current Device IP Address
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.2rem" }}>
              <span
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--primary)",
                }}
              >
                {clientIp || "Resolving..."}
              </span>
              <span
                style={{
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: isCurrentIpWhitelisted ? "rgba(16, 185, 129, 0.14)" : "rgba(245, 158, 11, 0.14)",
                  color: isCurrentIpWhitelisted ? "var(--success, #10b981)" : "var(--warning, #d97706)",
                  border: `1px solid ${isCurrentIpWhitelisted ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                }}
              >
                {isCurrentIpWhitelisted ? "✓ Whitelisted" : "⚠️ Not Whitelisted"}
              </span>
            </div>
          </div>
        </div>

        {!isCurrentIpWhitelisted && clientIp && (
          <button
            type="button"
            onClick={handleQuickAddCurrentIp}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-sm, 8px)",
              background: "var(--primary)",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span>+</span> Allow / Whitelist Current IP
          </button>
        )}
      </div>

      {/* Whitelist Table Section */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius, 12px)",
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
              Authorized IP Addresses ({allowedIps.length})
            </h4>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Devices connecting from these IPs will be permitted full access when whitelist is enabled.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input
              type="text"
              placeholder="Search IP or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                width: "200px",
                fontSize: "0.82rem",
                padding: "0.45rem 0.75rem",
              }}
            />
            <button
              type="button"
              onClick={() => {
                setIpInput(clientIp || "");
                setLabelInput("");
                setDescInput("");
                setShowAddModal(true);
              }}
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: "var(--radius-sm, 8px)",
                background: "var(--primary)",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span>+</span> Add IP Address
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                <th style={{ padding: "0.75rem 0.5rem" }}>IP ADDRESS</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>DEVICE / LABEL</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>DESCRIPTION</th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>STATUS</th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredIps.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                    {searchQuery ? "No matching IP addresses found." : "No IP addresses have been added yet."}
                  </td>
                </tr>
              ) : (
                filteredIps.map((item) => {
                  const isCurrent = item.ip_address.trim() === clientIp.trim();
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: isCurrent ? "var(--primary-alpha, rgba(2, 132, 199, 0.08))" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              color: item.is_active ? "var(--primary)" : "var(--text-muted)",
                            }}
                          >
                            {item.ip_address}
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: "var(--primary-alpha)",
                                color: "var(--primary)",
                                padding: "0.1rem 0.45rem",
                                borderRadius: "4px",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {item.label}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-dim)" }}>
                        {item.description || "—"}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: item.is_active ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            color: item.is_active ? "var(--success, #10b981)" : "var(--text-muted)",
                            border: `1px solid ${item.is_active ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`,
                            cursor: "pointer",
                          }}
                        >
                          {item.is_active ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteIp(item)}
                          style={{
                            padding: "0.3rem 0.65rem",
                            borderRadius: "6px",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: "var(--danger, #ef4444)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add IP Modal */}
      {showAddModal && (
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
              maxWidth: "460px",
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius, 16px)",
              padding: "1.75rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              color: "var(--text-main)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>🛡️</span> Add Authorized IP Address
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddIpSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                  IP Address <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="form-input"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="e.g. 192.168.1.100 or 192.168.1.*"
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, monospace",
                  }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                  Supports specific IPv4/IPv6, wildcard subnets (e.g. 192.168.1.*), or 127.0.0.1.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                  Device Name / Label <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="e.g. Dispatch Office Terminal 1"
                  style={{
                    width: "100%",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                  Description / Location (Optional)
                </label>
                <textarea
                  rows={2}
                  className="form-input"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="e.g. Warehouse port desk workstation"
                  style={{
                    width: "100%",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: "0.75rem",
                    borderRadius: "var(--radius-sm, 8px)",
                    background: "var(--primary)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: submitting ? "wait" : "pointer",
                  }}
                >
                  {submitting ? "Adding..." : "Add to Whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
