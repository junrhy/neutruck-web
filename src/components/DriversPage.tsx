import { useState } from "react";
import { DriverProfile } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";

interface DriversPageProps {
  drivers: DriverProfile[];
  onAddDriver: (driver: Omit<DriverProfile, "id">) => Promise<void> | void;
  onUpdateDriver: (driver: DriverProfile) => Promise<void> | void;
  onDeleteDriver: (id: string) => Promise<void> | void;
}

export default function DriversPage({
  drivers,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
}: DriversPageProps) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverProfile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseRestriction, setLicenseRestriction] = useState("Code 8 / Heavy Vehicle");
  const [spouseName, setSpouseName] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("Family");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<DriverProfile["status"]>("Available");
  const [notes, setNotes] = useState("");

  const filteredDrivers = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.toLowerCase().includes(search.toLowerCase()) ||
    (d.licenseNumber && d.licenseNumber.toLowerCase().includes(search.toLowerCase())) ||
    (d.spouseName && d.spouseName.toLowerCase().includes(search.toLowerCase())) ||
    (d.emergencyContactName && d.emergencyContactName.toLowerCase().includes(search.toLowerCase())) ||
    (d.emergencyContactRelationship && d.emergencyContactRelationship.toLowerCase().includes(search.toLowerCase())) ||
    (d.address && d.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setName("");
    setPhone("");
    setLicenseNumber("");
    setLicenseRestriction("Code 8 / Heavy Vehicle");
    setSpouseName("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setEmergencyContactRelationship("Family");
    setAddress("");
    setStatus("Available");
    setNotes("");
    setShowForm(true);
  };

  const handleStartEdit = (d: DriverProfile) => {
    setEditingDriver(d);
    setName(d.name);
    setPhone(d.phone);
    setLicenseNumber(d.licenseNumber || "");
    setLicenseRestriction(d.licenseRestriction || "Code 8 / Heavy Vehicle");
    setSpouseName(d.spouseName || "");
    setEmergencyContactName(d.emergencyContactName || "");
    setEmergencyContactPhone(d.emergencyContactPhone || "");
    setEmergencyContactRelationship(d.emergencyContactRelationship || "Family");
    setAddress(d.address || "");
    setStatus(d.status || "Available");
    setNotes(d.notes || "");
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDriver(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showAlert("Please enter driver name and contact phone number.", "Validation Required", "warning");
      return;
    }

    if (editingDriver) {
      await onUpdateDriver({
        ...editingDriver,
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
      await onAddDriver({
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
            <span>👨‍✈️</span> Drivers Roster &amp; Directory
          </h2>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "var(--text-dim)" }}>
            Manage registered company drivers eligible to operate fleet vehicles across dispatch tickets and emergency contacts.
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
              ➕ Register New Driver
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
              {editingDriver ? `✏️ Edit Driver Profile: ${editingDriver.name}` : "👨‍✈️ Register Driver Profile"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Juan Dela Cruz"
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
                  placeholder="e.g. 09189876543"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Driver Duty Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DriverProfile["status"])}
                >
                  <option value="Available">Available for Dispatch</option>
                  <option value="On Duty">On Duty / Active Trip</option>
                  <option value="On Leave">On Leave / Off Duty</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">LTO License Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. N01-12-345678"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">License Restriction Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Code 8 / Heavy Vehicle"
                  value={licenseRestriction}
                  onChange={(e) => setLicenseRestriction(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Spouse Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maria Dela Cruz"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Contact Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maria Dela Cruz"
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
                  placeholder="e.g. Brgy. Booy, Tagbilaran City, Bohol"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes &amp; Qualifications</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hazmat Certified, 10 yrs experience"
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
                💾 Save Driver Record
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Full Name</th>
              <th>Contact Number</th>
              <th>LTO License / Restriction</th>
              <th>Spouse Name</th>
              <th>Emergency Contact</th>
              <th>Address</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No drivers found in roster directory.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{d.id}</td>
                  <td style={{ fontWeight: 700, fontSize: "0.95rem" }}>👨‍✈️ {d.name}</td>
                  <td style={{ fontFamily: "monospace" }}>{d.phone}</td>
                  <td>
                    <div style={{ fontFamily: "monospace", fontWeight: 600 }}>{d.licenseNumber || "—"}</div>
                    {d.licenseRestriction && (
                      <span className="badge badge-purple" style={{ fontSize: "0.7rem", marginTop: "0.2rem" }}>
                        {d.licenseRestriction}
                      </span>
                    )}
                  </td>
                  <td>{d.spouseName || "—"}</td>
                  <td>
                    {d.emergencyContactName ? (
                      <div>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                          <span>{d.emergencyContactName}</span>
                          {d.emergencyContactRelationship && (
                            <span className="badge badge-purple" style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}>
                              {d.emergencyContactRelationship}
                            </span>
                          )}
                        </div>
                        {d.emergencyContactPhone && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            📞 {d.emergencyContactPhone}
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{d.address || "—"}</td>
                  <td>
                    <span className={`badge ${
                      d.status === "Available" ? "badge-success" :
                      d.status === "On Duty" ? "badge-primary" : "badge-warning"
                    }`}>
                      {d.status || "Available"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      {user && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleStartEdit(d)}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {user && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            const confirmed = await showConfirm(`Are you sure you want to remove driver "${d.name}" from the roster?`, "Remove Driver Profile");
                            if (confirmed) {
                              onDeleteDriver(d.id);
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
