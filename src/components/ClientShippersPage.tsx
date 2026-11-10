import { useState } from "react";
import { ClientShipper, DispatchJob, BillingColumnConfig } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";

interface ClientShippersPageProps {
  clients: ClientShipper[];
  jobs: DispatchJob[];
  onAddClient: (client: Omit<ClientShipper, "id">) => void;
  onUpdateClient: (client: ClientShipper) => void;
  onDeleteClient: (id: string) => void;
}

export const ALL_AVAILABLE_BILLING_COLUMNS: BillingColumnConfig[] = [
  { id: "si_no", label: "S.I NO.", enabled: true, width: "45px", align: "center" },
  { id: "transaction_date", label: "Transaction Date", enabled: true, width: "75px", align: "center" },
  { id: "waybill_no", label: "Waybill No.", enabled: true, width: "85px", align: "center" },
  { id: "service_mode", label: "Service Mode", enabled: true, width: "65px", align: "center" },
  { id: "shipping_line", label: "Shipping Line", enabled: true, width: "80px", align: "center" },
  { id: "container_no", label: "Container No.", enabled: true, width: "110px", align: "center" },
  { id: "seal_no", label: "Seal No.", enabled: true, width: "80px", align: "center" },
  { id: "trailer_no", label: "Trailer No.", enabled: false, width: "80px", align: "center" },
  { id: "pickup_location", label: "Pickup Origin", enabled: false, width: "100px", align: "center" },
  { id: "destination", label: "DEST.", enabled: true, width: "75px", align: "center" },
  { id: "cargo_desc", label: "Cargo Description", enabled: false, width: "110px", align: "left" },
  { id: "weight_tons", label: "Weight (Tons)", enabled: false, width: "70px", align: "right" },
  { id: "truck_plate", label: "Truck Plate", enabled: false, width: "80px", align: "center" },
  { id: "driver_name", label: "Driver Name", enabled: false, width: "95px", align: "left" },
  { id: "helper_name", label: "Helper / Assistant", enabled: false, width: "95px", align: "left" },
  { id: "roro_fee", label: "RoRo Ticket Fee", enabled: false, width: "85px", align: "right" },
  { id: "withdrawal_date", label: "Container Withdrawal Date", enabled: false, width: "100px", align: "center" },
  { id: "pullout_date", label: "Pull-Out Date", enabled: false, width: "90px", align: "center" },
  { id: "gatein_date", label: "Gate-In Date", enabled: false, width: "90px", align: "center" },
  { id: "return_dest", label: "Return Destination", enabled: false, width: "100px", align: "left" },
  { id: "delivery_status", label: "Delivery Status", enabled: false, width: "85px", align: "center" },
  { id: "fuel_allowance", label: "Fuel Allowance", enabled: false, width: "85px", align: "right" },
  { id: "weighing_fee", label: "Weighing fee", enabled: true, width: "75px", align: "right" },
  { id: "trucking_charges", label: "Trucking Charges", enabled: true, width: "90px", align: "right" },
  { id: "other_charges", label: "Other charges", enabled: false, width: "80px", align: "right" },
  { id: "total_amount", label: "Total Amount", enabled: true, width: "95px", align: "right" },
];

export const DEFAULT_BILLING_COLUMNS: BillingColumnConfig[] = ALL_AVAILABLE_BILLING_COLUMNS;

const EMPTY_FORM = {
  companyName: "",
  contactPerson: "",
  contactPhone: "",
  address: "",
  tinNumber: "",
  billingNumber: "",
  defaultPickupLocation: "",
  notes: "",
};

export default function ClientShippersPage({
  clients,
  jobs,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientShippersPageProps) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formColumns, setFormColumns] = useState<BillingColumnConfig[]>(DEFAULT_BILLING_COLUMNS);
  const [search, setSearch] = useState("");

  const setField = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormColumns(DEFAULT_BILLING_COLUMNS);
    setEditingId(null);
    setShowAddForm(true);
  };

  const openEdit = (c: ClientShipper) => {
    setForm({
      companyName: c.companyName,
      contactPerson: c.contactPerson || "",
      contactPhone: c.contactPhone || "",
      address: c.address || "",
      tinNumber: c.tinNumber || "",
      billingNumber: c.billingNumber || "",
      defaultPickupLocation: c.defaultPickupLocation || "",
      notes: c.notes || "",
    });
    setFormColumns(
      c.billingColumns && c.billingColumns.length > 0
        ? c.billingColumns
        : DEFAULT_BILLING_COLUMNS
    );
    setEditingId(c.id);
    setShowAddForm(true);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormColumns(DEFAULT_BILLING_COLUMNS);
  };

  const toggleFormColumn = (colId: string) => {
    setFormColumns((cols) =>
      cols.map((col) => (col.id === colId ? { ...col, enabled: !col.enabled } : col))
    );
  };

  const updateFormColumnLabel = (colId: string, newLabel: string) => {
    setFormColumns((cols) =>
      cols.map((col) => (col.id === colId ? { ...col, label: newLabel } : col))
    );
  };

  const moveFormColumn = (index: number, direction: "left" | "right") => {
    setFormColumns((cols) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= cols.length) return cols;
      const newCols = [...cols];
      const temp = newCols[index];
      newCols[index] = newCols[targetIndex];
      newCols[targetIndex] = temp;
      return newCols;
    });
  };

  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  const handleCreateFormCustomColumn = () => {
    if (!newColTitle.trim()) return;
    const cleanLabel = newColTitle.trim();
    const id = "custom_" + Date.now();
    setFormColumns((cols) => {
      // Insert before total_amount if present
      const totalIdx = cols.findIndex((c) => c.id === "total_amount");
      const newCol: BillingColumnConfig = {
        id,
        label: cleanLabel,
        enabled: true,
        width: "90px",
        align: "center",
      };
      if (totalIdx !== -1) {
        const copy = [...cols];
        copy.splice(totalIdx, 0, newCol);
        return copy;
      }
      return [...cols, newCol];
    });
    setNewColTitle("");
    setShowAddColModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.companyName.trim();
    if (!trimmedName) return;

    const isDuplicate = clients.some(
      (c) => c.companyName.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== editingId
    );

    if (isDuplicate) {
      showAlert(`A client shipper with the company name "${trimmedName}" already exists. Client company names must be unique.`, "Duplicate Company Name", "warning");
      return;
    }

    if (editingId) {
      onUpdateClient({
        id: editingId,
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        address: form.address.trim() || undefined,
        tinNumber: form.tinNumber.trim() || undefined,
        billingNumber: form.billingNumber.trim() || undefined,
        defaultPickupLocation: form.defaultPickupLocation.trim() || undefined,
        notes: form.notes.trim() || undefined,
        billingColumns: formColumns,
      });
    } else {
      onAddClient({
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        address: form.address.trim() || undefined,
        tinNumber: form.tinNumber.trim() || undefined,
        billingNumber: form.billingNumber.trim() || undefined,
        defaultPickupLocation: form.defaultPickupLocation.trim() || undefined,
        notes: form.notes.trim() || undefined,
        billingColumns: formColumns,
      });
    }
    closeForm();
  };

  const filteredClients = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactPerson || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.contactPhone || "").includes(search) ||
      (c.billingNumber || "").includes(search)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Control Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>👥 Client Shippers Registry</h2>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem" }}>
            Directory of recurring client accounts, phone numbers for SMS dispatches, and default pickup locations.
          </p>
        </div>

        {user && !showAddForm && (
          <button className="btn btn-primary" onClick={openAdd}>
            ➕ Add Client Shipper
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-title">Registered Shippers</span>
            <span className="stat-number">{clients.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <span className="stat-title">Total Dispatched Jobs</span>
            <span className="stat-number">{jobs.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📲</div>
          <div className="stat-info">
            <span className="stat-title">Verified Contact Phones</span>
            <span className="stat-number" style={{ color: "var(--primary)" }}>
              {clients.filter((c) => c.contactPhone && c.contactPhone.trim().length >= 10).length}
            </span>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: editingId ? "var(--warning)" : "var(--primary)" }}>
              {editingId ? "✏️ Edit Client Shipper Profile" : "👤 Register New Client Shipper Profile"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={closeForm}>
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Client Company Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Bohol Beverage Trading"
                  value={form.companyName}
                  onChange={setField("companyName")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Person Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Juan Reyes"
                  value={form.contactPerson}
                  onChange={setField("contactPerson")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Phone Number (For SMS Alerts)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 09171234567"
                  value={form.contactPhone}
                  onChange={setField("contactPhone")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Taxpayer Identification No. (TIN)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 000-123-456-000"
                  value={form.tinNumber}
                  onChange={setField("tinNumber")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dedicated Billing No. (Statement Reference)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 7400 (NRB)"
                  value={form.billingNumber}
                  onChange={setField("billingNumber")}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Official Billing Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. A.C. Cortes Avenue, Cambaro, Mandaue City"
                  value={form.address}
                  onChange={setField("address")}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Default Pickup Origin / Hub</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tagbilaran Port Pier 3"
                  value={form.defaultPickupLocation}
                  onChange={setField("defaultPickupLocation")}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Instructions (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Special gate clearance required"
                value={form.notes}
                onChange={setField("notes")}
              />
            </div>

            {/* Custom Billing Statement Columns per Client */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    📋 Billing Statement Custom Item Columns
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    Select which columns appear on this client's billing statement and edit custom header titles.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowAddColModal(true)}
                    style={{ fontSize: "0.75rem" }}
                  >
                    ➕ Add Custom Column
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setFormColumns(DEFAULT_BILLING_COLUMNS)}
                    style={{ fontSize: "0.75rem" }}
                  >
                    🔄 Reset to Default
                  </button>
                </div>
              </div>

              {/* Add Custom Column Inline Form */}
              {showAddColModal && (
                <div
                  style={{
                    padding: "0.75rem",
                    marginBottom: "0.85rem",
                    background: "rgba(0, 212, 255, 0.08)",
                    border: "1px solid var(--primary)",
                    borderRadius: "6px",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
                    🏷️ New Column Title:
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    autoFocus
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    placeholder="e.g. Booking Ref / Pier Gate Fee / Storage Charge..."
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFormCustomColumn()}
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateFormCustomColumn}
                    disabled={!newColTitle.trim()}
                    style={{ fontSize: "0.78rem" }}
                  >
                    ➕ Add Column
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setShowAddColModal(false);
                      setNewColTitle("");
                    }}
                    style={{ fontSize: "0.78rem" }}
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
                {formColumns.map((col, index) => (
                  <div
                    key={col.id}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: col.enabled ? "1px solid rgba(0,212,255,0.3)" : "1px solid var(--border)",
                      background: col.enabled ? "rgba(0,212,255,0.05)" : "rgba(255,255,255,0.01)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                      opacity: col.id === "total_amount" ? 0.8 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", fontWeight: 700, cursor: col.id === "total_amount" ? "default" : "pointer" }}>
                        <input
                          type="checkbox"
                          checked={col.enabled}
                          disabled={col.id === "total_amount"}
                          onChange={() => toggleFormColumn(col.id)}
                        />
                        <span style={{ color: col.enabled ? "var(--primary)" : "var(--text-dim)" }}>
                          {col.id.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </label>
                      <div style={{ display: "flex", gap: "0.2rem" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          disabled={index === 0}
                          onClick={() => moveFormColumn(index, "left")}
                          title="Move Left / Earlier"
                          style={{ padding: "0.1rem 0.35rem", fontSize: "0.7rem", lineHeight: 1 }}
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          disabled={index === formColumns.length - 1}
                          onClick={() => moveFormColumn(index, "right")}
                          title="Move Right / Later"
                          style={{ padding: "0.1rem 0.35rem", fontSize: "0.7rem", lineHeight: 1 }}
                        >
                          ▶
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      className="form-input"
                      value={col.label}
                      onChange={(e) => updateFormColumnLabel(col.id, e.target.value)}
                      placeholder="Header title..."
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.4rem", height: "auto" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className={`btn ${editingId ? "btn-warning" : "btn-primary"}`}>
                {editingId ? "✏️ Update Client Profile" : "💾 Save Client Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Client Shippers Table */}
      <div className="table-card">
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>📋 Registered Shippers Directory ({clients.length})</div>
          <input
            type="text"
            className="form-input"
            style={{ width: "320px", padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
            placeholder="Search Company, Contact, Phone, or Billing No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table style={{ minWidth: "850px" }}>
          <thead>
            <tr>
              <th>Client Company</th>
              <th>Billing No.</th>
              <th>Contact &amp; Phone</th>
              <th>Billing Address</th>
              <th>Total Dispatches</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No client shippers found. Click "+ Add Client Shipper" above to register a company.
                </td>
              </tr>
            ) : (
              filteredClients.map((c) => {
                const clientJobCount = jobs.filter((j) => j.clientName.toLowerCase() === c.companyName.toLowerCase()).length;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: "var(--text-main)" }}>
                      <div>{c.companyName}</div>
                      {c.tinNumber && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                          TIN: {c.tinNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 700 }}>
                      {c.billingNumber ? `#${c.billingNumber}` : "—"}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.contactPerson || "—"}</div>
                      <div style={{ fontFamily: "monospace", color: "var(--purple)", fontSize: "0.78rem" }}>{c.contactPhone || "—"}</div>
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>{c.address || c.defaultPickupLocation || "—"}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        📦 {clientJobCount} Jobs
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {user ? (
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEdit(c)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={async () => {
                              const confirmed = await showConfirm(`Are you sure you want to remove client shipper "${c.companyName}" from the registry?`, "Remove Client Shipper");
                              if (confirmed) {
                                onDeleteClient(c.id);
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
