import { useState } from "react";
import { HelperProfile } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";

interface HelpersPageProps {
  helpers: HelperProfile[];
  onAddHelper: (helper: Omit<HelperProfile, "id">) => Promise<void> | void;
  onUpdateHelper: (helper: HelperProfile) => Promise<void> | void;
  onDeleteHelper: (id: string) => Promise<void> | void;
}

export default function HelpersPage({
  helpers,
  onAddHelper,
  onUpdateHelper,
  onDeleteHelper,
}: HelpersPageProps) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingHelper, setEditingHelper] = useState<HelperProfile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseRestriction, setLicenseRestriction] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("Family");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<HelperProfile["status"]>("Available");
  const [notes, setNotes] = useState("");

  const filteredHelpers = helpers.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.phone.toLowerCase().includes(search.toLowerCase()) ||
    (h.licenseNumber && h.licenseNumber.toLowerCase().includes(search.toLowerCase())) ||
    (h.spouseName && h.spouseName.toLowerCase().includes(search.toLowerCase())) ||
    (h.emergencyContactName && h.emergencyContactName.toLowerCase().includes(search.toLowerCase())) ||
    (h.emergencyContactRelationship && h.emergencyContactRelationship.toLowerCase().includes(search.toLowerCase())) ||
    (h.address && h.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingHelper(null);
    setName("");
    setPhone("");
    setLicenseNumber("");
    setLicenseRestriction("");
    setSpouseName("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setEmergencyContactRelationship("Family");
    setAddress("");
    setStatus("Available");
    setNotes("");
    setShowForm(true);
  };

  const handleStartEdit = (h: HelperProfile) => {
    setEditingHelper(h);
    setName(h.name);
    setPhone(h.phone);
    setLicenseNumber(h.licenseNumber || "");
    setLicenseRestriction(h.licenseRestriction || "");
    setSpouseName(h.spouseName || "");
    setEmergencyContactName(h.emergencyContactName || "");
    setEmergencyContactPhone(h.emergencyContactPhone || "");
    setEmergencyContactRelationship(h.emergencyContactRelationship || "Family");
    setAddress(h.address || "");
    setStatus(h.status || "Available");
    setNotes(h.notes || "");
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingHelper(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showAlert("Please enter helper name and contact phone number.", "Validation Required", "warning");
      return;
    }

    if (editingHelper) {
      await onUpdateHelper({
        ...editingHelper,
        name: name.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        licenseRestriction: licenseRestriction.trim() || undefined,
        spouseName: spouseName.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: emergencyContactRelationship || undefined,
        address: address.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      });
    } else {
      await onAddHelper({
        name: name.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        licenseRestriction: licenseRestriction.trim() || undefined,
        spouseName: spouseName.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: emergencyContactRelationship || undefined,
        address: address.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      });
    }
    handleCloseForm();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🧑‍🔧</span> Truck Helpers Roster &amp; Directory
          </h2>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Manage registered truck helpers / assistant crew eligible for fleet dispatch assignments and emergency contacts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="text"
            className="form-input"
            style={{ width: "280px" }}
            placeholder="🔍 Search Name, Phone, Spouse, Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {user && !showForm && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              ➕ Register New Helper
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
              {editingHelper ? `✏️ Edit Helper Profile: ${editingHelper.name}` : "🧑‍🔧 Register Helper Profile"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Helper Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Pedro Penduko"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. 09179998877"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duty Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as HelperProfile["status"])}
                >
                  <option value="Available">Available for Dispatch</option>
                  <option value="On Duty">On Duty / Active Trip</option>
                  <option value="On Leave">On Leave / Off Duty</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">LTO License / ID (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. N01-99-001122 or Company ID"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">License / Restriction (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Assistant / Heavy Cargo Crew"
                  value={licenseRestriction}
                  onChange={(e) => setLicenseRestriction(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Spouse Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Juana Penduko"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Contact Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Juana Penduko"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Relationship</label>
                <select
                  className="form-select"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                >
                  <option value="Family">Family / Relative</option>
                  <option value="Wife">Wife</option>
                  <option value="Spouse">Spouse / Husband</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Siblings">Siblings</option>
                  <option value="Friend">Friend</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Contact Phone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 09171112233"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Home Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Brgy. Dampas, Tagbilaran City, Bohol"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes &amp; Qualifications</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Heavy cargo loading specialist"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline" onClick={handleCloseForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                💾 Save Helper Profile
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Helper ID</th>
              <th>Full Name</th>
              <th>Contact Number</th>
              <th>LTO License / ID</th>
              <th>Spouse Name</th>
              <th>Emergency Contact</th>
              <th>Address</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHelpers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No truck helpers found in roster directory.
                </td>
              </tr>
            ) : (
              filteredHelpers.map((h) => (
                <tr key={h.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{h.id}</td>
                  <td style={{ fontWeight: 700, fontSize: "0.95rem" }}>🧑‍🔧 {h.name}</td>
                  <td style={{ fontFamily: "monospace" }}>{h.phone}</td>
                  <td>
                    <div style={{ fontFamily: "monospace", fontWeight: 600 }}>{h.licenseNumber || "—"}</div>
                    {h.licenseRestriction && (
                      <span className="badge badge-purple" style={{ fontSize: "0.7rem", marginTop: "0.2rem" }}>
                        {h.licenseRestriction}
                      </span>
                    )}
                  </td>
                  <td>{h.spouseName || "—"}</td>
                  <td>
                    {h.emergencyContactName ? (
                      <div>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                          <span>{h.emergencyContactName}</span>
                          {h.emergencyContactRelationship && (
                            <span className="badge badge-purple" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
                              {h.emergencyContactRelationship}
                            </span>
                          )}
                        </div>
                        {h.emergencyContactPhone && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            📞 {h.emergencyContactPhone}
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{h.address || "—"}</td>
                  <td>
                    <span className={`badge ${
                      h.status === "Available" ? "badge-success" :
                      h.status === "On Duty" ? "badge-primary" : "badge-warning"
                    }`}>
                      {h.status || "Available"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      {user && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleStartEdit(h)}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {user && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            const confirmed = await showConfirm(`Are you sure you want to remove helper "${h.name}" from the roster?`, "Remove Helper Profile");
                            if (confirmed) {
                              onDeleteHelper(h.id);
                            }
                          }}
                        >
                          🗑️ Delete
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
    </div>
  );
}
