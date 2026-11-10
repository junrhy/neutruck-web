import { useState } from "react";
import { MaintenanceLog, TruckVehicle } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";
import { getNextSequentialId } from "../utils/idGenerator";

interface MaintenancePageProps {
  logs: MaintenanceLog[];
  vehicles: TruckVehicle[];
  onAddLog: (log: MaintenanceLog) => Promise<void> | void;
  onUpdateLog?: (log: MaintenanceLog) => Promise<void> | void;
  onDeleteLog?: (id: string) => Promise<void> | void;
}

export default function MaintenancePage({ logs, vehicles, onAddLog, onUpdateLog, onDeleteLog }: MaintenancePageProps) {
  const { user } = useAuth();
  const { showConfirm } = useDialog();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  // Form State
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [serviceType, setServiceType] = useState("Oil & Filter Replacement");
  const [cost, setCost] = useState<number>(4500);
  const [odometerKm, setOdometerKm] = useState<number>(125000);
  const [notes, setNotes] = useState("");

  const filteredLogs = logs.filter((l) =>
    l.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    l.serviceType.toLowerCase().includes(search.toLowerCase()) ||
    (l.notes && l.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingLog(null);
    setSelectedTruckId("");
    setServiceType("Oil & Filter Replacement");
    setCost(4500);
    setOdometerKm(125000);
    setNotes("");
    setShowAddForm(true);
  };

  const handleStartEdit = (log: MaintenanceLog) => {
    setEditingLog(log);
    setSelectedTruckId(log.truckId);
    setServiceType(log.serviceType || "Oil & Filter Replacement");
    setCost(log.cost || 0);
    setOdometerKm(log.odometerKm || 0);
    setNotes(log.notes || "");
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingLog(null);
    setSelectedTruckId("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTruckId) {
      alert("Please select a vehicle.");
      return;
    }

    const truck = vehicles.find((v) => v.id === selectedTruckId);

    if (editingLog) {
      const updatedLog: MaintenanceLog = {
        ...editingLog,
        truckId: selectedTruckId,
        plateNumber: truck?.plateNumber || editingLog.plateNumber,
        serviceType,
        cost: Number(cost),
        odometerKm: Number(odometerKm),
        notes: notes.trim(),
      };
      if (onUpdateLog) {
        await onUpdateLog(updatedLog);
      }
    } else {
      const newLog: MaintenanceLog = {
        id: getNextSequentialId("MNT", logs, 501),
        truckId: selectedTruckId,
        plateNumber: truck?.plateNumber || "TRK-000",
        serviceType,
        cost: Number(cost),
        serviceDate: new Date().toLocaleDateString("en-PH"),
        odometerKm: Number(odometerKm),
        notes: notes.trim(),
      };
      await onAddLog(newLog);
    }

    handleCloseForm();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search Plate Number, Service Type or Notes..."
          style={{ maxWidth: "400px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {user && !showAddForm && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            🔧 Record Repair / Maintenance
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              {editingLog ? `✏️ Edit Maintenance Record (${editingLog.id})` : "🔧 Fleet Maintenance Entry"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Select Truck</label>
                <select
                  className="form-select"
                  required
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                >
                  <option value="" disabled>Select Vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} ({v.modelType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Service / Repair Category</label>
                <select
                  className="form-select"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  <option value="Oil & Filter Replacement">Oil &amp; Filter Replacement</option>
                  <option value="Tire Replacement / Balancing">Tire Replacement / Balancing</option>
                  <option value="Brake Pad & Drum Service">Brake Pad &amp; Drum Service</option>
                  <option value="Engine Overhaul & Calibration">Engine Overhaul &amp; Calibration</option>
                  <option value="Air Brake System Repair">Air Brake System Repair</option>
                  <option value="Transmission & Differential Check">Transmission &amp; Differential Check</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Total Repair Cost (₱)</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Odometer Reading (km)</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Mechanic Notes &amp; Replaced Parts</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Replaced 4 rear tires, changed 15L synthetic oil"
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
                {editingLog ? "💾 Save Maintenance Changes" : "💾 Save Maintenance Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Vehicle Plate</th>
              <th>Service / Maintenance Type</th>
              <th>Odometer (km)</th>
              <th>Repair Cost</th>
              <th>Date Serviced</th>
              <th>Mechanic Notes</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No repair &amp; maintenance logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>{l.id}</td>
                  <td style={{ fontWeight: 700, fontSize: "0.95rem" }}>🚚 {l.plateNumber}</td>
                  <td><span className="badge badge-warning">{l.serviceType}</span></td>
                  <td style={{ fontFamily: "monospace" }}>{l.odometerKm.toLocaleString()} km</td>
                  <td style={{ fontWeight: 700, color: "var(--danger)" }}>₱{l.cost.toLocaleString()}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{l.serviceDate}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{l.notes || "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      {user && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleStartEdit(l)}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {user && onDeleteLog && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={async () => {
                            const confirmed = await showConfirm(
                              `Are you sure you want to remove maintenance record "${l.id}" (${l.plateNumber} — ${l.serviceType})?`,
                              "Delete Maintenance Log Entry"
                            );
                            if (confirmed) {
                              await onDeleteLog(l.id);
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
