import { useState } from "react";
import { DropoffDestination, DispatchJob } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";

interface DropoffDestinationsPageProps {
  destinations: DropoffDestination[];
  jobs: DispatchJob[];
  onAddDestination: (destination: Omit<DropoffDestination, "id">) => void;
  onUpdateDestination: (destination: DropoffDestination) => void;
  onDeleteDestination: (id: string) => void;
}

export default function DropoffDestinationsPage({
  destinations,
  jobs,
  onAddDestination,
  onUpdateDestination,
  onDeleteDestination,
}: DropoffDestinationsPageProps) {
  const { user } = useAuth();
  const { showConfirm } = useDialog();
  const [showForm, setShowForm] = useState(false);
  const [editingDest, setEditingDest] = useState<DropoffDestination | null>(null);
  const [hubName, setHubName] = useState("");
  const [cityProvince, setCityProvince] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [defaultFreightFee, setDefaultFreightFee] = useState<number | "">("");
  const [search, setSearch] = useState("");

  const handleOpenAdd = () => {
    setEditingDest(null);
    setHubName("");
    setCityProvince("");
    setReceiverName("");
    setReceiverPhone("");
    setDefaultFreightFee("");
    setShowForm(true);
  };

  const handleOpenEdit = (dest: DropoffDestination) => {
    setEditingDest(dest);
    setHubName(dest.hubName);
    setCityProvince(dest.cityProvince);
    setReceiverName(dest.receiverName || "");
    setReceiverPhone(dest.receiverPhone || "");
    setDefaultFreightFee(dest.defaultFreightFee ?? "");
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDest(null);
    setHubName("");
    setCityProvince("");
    setReceiverName("");
    setReceiverPhone("");
    setDefaultFreightFee("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubName.trim() || !cityProvince.trim()) return;

    if (editingDest) {
      onUpdateDestination({
        id: editingDest.id,
        hubName: hubName.trim(),
        cityProvince: cityProvince.trim(),
        receiverName: receiverName.trim() || undefined,
        receiverPhone: receiverPhone.trim() || undefined,
        defaultFreightFee: defaultFreightFee !== "" ? Number(defaultFreightFee) : undefined,
      });
    } else {
      onAddDestination({
        hubName: hubName.trim(),
        cityProvince: cityProvince.trim(),
        receiverName: receiverName.trim() || undefined,
        receiverPhone: receiverPhone.trim() || undefined,
        defaultFreightFee: defaultFreightFee !== "" ? Number(defaultFreightFee) : undefined,
      });
    }

    handleCloseForm();
  };

  const filteredDestinations = destinations.filter(
    (d) =>
      d.hubName.toLowerCase().includes(search.toLowerCase()) ||
      d.cityProvince.toLowerCase().includes(search.toLowerCase()) ||
      (d.receiverName && d.receiverName.toLowerCase().includes(search.toLowerCase())) ||
      (d.receiverPhone && d.receiverPhone.includes(search))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>🏭 Dropoff Destinations Directory</h2>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem" }}>
            Directory of recurring warehouse hubs, distribution centers, and default freight charges.
          </p>
        </div>

        {user && !showForm && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            ➕ Register Dropoff Hub
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏭</div>
          <div className="stat-info">
            <span className="stat-title">Registered Destinations</span>
            <span className="stat-number">{destinations.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <span className="stat-title">Total Delivered Freight</span>
            <span className="stat-number">{jobs.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-title">With Default Rates</span>
            <span className="stat-number" style={{ color: "var(--primary)" }}>
              {destinations.filter((d) => d.defaultFreightFee && d.defaultFreightFee > 0).length}
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--primary)" }}>
              {editingDest ? "✏️ Edit Dropoff Destination Hub" : "🏭 Register New Dropoff Destination Hub"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseForm}>
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Warehouse / Hub Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. SM City Consolacion Distribution Center"
                  value={hubName}
                  onChange={(e) => setHubName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City / Province Location *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Consolacion, Cebu"
                  value={cityProvince}
                  onChange={(e) => setCityProvince(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receiver / Contact Person</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mark Fernandez (Warehouse Head)"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receiver Mobile Phone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 09191234567"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Standard Freight Fee (₱)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 28000"
                  value={defaultFreightFee}
                  onChange={(e) => setDefaultFreightFee(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline" onClick={handleCloseForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingDest ? "💾 Update Destination Hub" : "💾 Save Destination Hub"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Table */}
      <div className="table-card">
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>📋 Registered Dropoff Destinations Directory ({destinations.length})</div>
          <input
            type="text"
            className="form-input"
            style={{ width: "320px", padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
            placeholder="Search Hub Name, City, Receiver, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table style={{ minWidth: "850px" }}>
          <thead>
            <tr>
              <th>Destination Hub Name</th>
              <th>City / Province</th>
              <th>Receiver Contact</th>
              <th>Receiver Phone</th>
              <th>Default Freight Fee</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDestinations.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No dropoff destinations registered yet. Click "+ Register Dropoff Hub" above to add one.
                </td>
              </tr>
            ) : (
              filteredDestinations.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, color: "var(--text-main)" }}>🏭 {d.hubName}</td>
                  <td>{d.cityProvince}</td>
                  <td>{d.receiverName || "—"}</td>
                  <td style={{ fontFamily: "monospace", color: "var(--purple)", fontWeight: 600 }}>{d.receiverPhone || "—"}</td>
                  <td style={{ fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>
                    {d.defaultFreightFee && d.defaultFreightFee > 0 ? `₱${d.defaultFreightFee.toLocaleString()}` : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {user ? (
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEdit(d)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            const confirmed = await showConfirm(
                              `Are you sure you want to remove dropoff destination "${d.hubName}"?`,
                              "Delete Dropoff Destination",
                              { confirmLabel: "Delete Hub", type: "danger" }
                            );
                            if (confirmed) {
                              onDeleteDestination(d.id);
                            }
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Read-Only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
