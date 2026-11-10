import { useState } from "react";
import { TruckVehicle, UnitInspectionLog } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";
import { getAppNowString } from "../utils/dateUtils";

type ChecklistStatus = "OK" | "Needs Attention" | "Not Checked";

interface UnitInspectionPageProps {
  vehicles: TruckVehicle[];
  inspectionLogs: UnitInspectionLog[];
  onAddInspectionLog: (log: Omit<UnitInspectionLog, "id">) => Promise<void>;
  onUpdateInspectionLog?: (log: UnitInspectionLog) => Promise<void>;
  onDeleteInspectionLog?: (id: string) => Promise<void>;
}

export default function UnitInspectionPage({
  vehicles,
  inspectionLogs,
  onAddInspectionLog,
  onUpdateInspectionLog,
  onDeleteInspectionLog,
}: UnitInspectionPageProps) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();

  const [search, setSearch] = useState("");
  const [filterTruckId, setFilterTruckId] = useState<string>("ALL");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLog, setEditingLog] = useState<UnitInspectionLog | null>(null);

  // Form State
  const [selectedTruckId, setSelectedTruckId] = useState<string>(vehicles[0]?.id || "");
  const [inspectionDate, setInspectionDate] = useState<string>(() => getAppNowString());
  const [inspectorName, setInspectorName] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | "">("");
  const [fuelLevelPercent, setFuelLevelPercent] = useState<number | "">("");
  const [fuelLiters, setFuelLiters] = useState<number | "">("");

  // BLOWBAGETS Checklist State - Defaults to "Not Checked"
  const [checklistBattery, setChecklistBattery] = useState<ChecklistStatus>("Not Checked");
  const [checklistLights, setChecklistLights] = useState<ChecklistStatus>("Not Checked");
  const [checklistOil, setChecklistOil] = useState<ChecklistStatus>("Not Checked");
  const [checklistWater, setChecklistWater] = useState<ChecklistStatus>("Not Checked");
  const [checklistBrakes, setChecklistBrakes] = useState<ChecklistStatus>("Not Checked");
  const [checklistAirPressure, setChecklistAirPressure] = useState<ChecklistStatus>("Not Checked");
  const [checklistGasFuel, setChecklistGasFuel] = useState<ChecklistStatus>("Not Checked");
  const [checklistElectrical, setChecklistElectrical] = useState<ChecklistStatus>("Not Checked");
  const [checklistTires, setChecklistTires] = useState<ChecklistStatus>("Not Checked");
  const [checklistSelfDriver, setChecklistSelfDriver] = useState<ChecklistStatus>("Not Checked");
  const [notes, setNotes] = useState("");

  const targetTruck = vehicles.find((v) => v.id === selectedTruckId);

  const markAllNotChecked = () => {
    setChecklistBattery("Not Checked");
    setChecklistLights("Not Checked");
    setChecklistOil("Not Checked");
    setChecklistWater("Not Checked");
    setChecklistBrakes("Not Checked");
    setChecklistAirPressure("Not Checked");
    setChecklistGasFuel("Not Checked");
    setChecklistElectrical("Not Checked");
    setChecklistTires("Not Checked");
    setChecklistSelfDriver("Not Checked");
  };

  const resetForm = () => {
    setSelectedTruckId(vehicles[0]?.id || "");
    setInspectionDate(getAppNowString());
    setInspectorName("");
    setOdometerKm("");
    setFuelLevelPercent("");
    setFuelLiters("");
    markAllNotChecked();
    setNotes("");
    setEditingLog(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (log: UnitInspectionLog) => {
    setEditingLog(log);
    setSelectedTruckId(log.truckId);
    setInspectionDate(log.inspectionDate);
    setInspectorName(log.inspectorName || "");
    setOdometerKm(log.odometerKm ?? "");
    setFuelLevelPercent(log.fuelLevelPercent ?? "");
    setFuelLiters(log.fuelLiters ?? "");
    setChecklistBattery(log.checklist.battery);
    setChecklistLights(log.checklist.lights);
    setChecklistOil(log.checklist.oil);
    setChecklistWater(log.checklist.water);
    setChecklistBrakes(log.checklist.brakes);
    setChecklistAirPressure(log.checklist.airPressure);
    setChecklistGasFuel(log.checklist.gasFuel);
    setChecklistElectrical(log.checklist.electrical);
    setChecklistTires(log.checklist.tires);
    setChecklistSelfDriver(log.checklist.selfDriverStatus);
    setNotes(log.notes || "");
    setShowAddForm(true);
  };

  const markAllPass = () => {
    setChecklistBattery("OK");
    setChecklistLights("OK");
    setChecklistOil("OK");
    setChecklistWater("OK");
    setChecklistBrakes("OK");
    setChecklistAirPressure("OK");
    setChecklistGasFuel("OK");
    setChecklistElectrical("OK");
    setChecklistTires("OK");
    setChecklistSelfDriver("OK");
  };

  const blowbagetsList = [
    { key: "B", label: "🔋 Battery", value: checklistBattery, setter: setChecklistBattery },
    { key: "L", label: "💡 Lights", value: checklistLights, setter: setChecklistLights },
    { key: "O", label: "🛢️ Oil", value: checklistOil, setter: setChecklistOil },
    { key: "W", label: "💧 Water / Coolant", value: checklistWater, setter: setChecklistWater },
    { key: "B2", label: "🛑 Brakes", value: checklistBrakes, setter: setChecklistBrakes },
    { key: "A", label: "💨 Air Pressure", value: checklistAirPressure, setter: setChecklistAirPressure },
    { key: "G", label: "⛽ Gas / Fuel", value: checklistGasFuel, setter: setChecklistGasFuel },
    { key: "E", label: "⚡ Electrical", value: checklistElectrical, setter: setChecklistElectrical },
    { key: "T", label: "🛞 Tires", value: checklistTires, setter: setChecklistTires },
    { key: "S", label: "👨‍✈️ Self / Driver", value: checklistSelfDriver, setter: setChecklistSelfDriver },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTruckId) {
      showAlert("Please select a truck unit.", "Validation Error", "warning");
      return;
    }

    const statuses = [
      checklistBattery,
      checklistLights,
      checklistOil,
      checklistWater,
      checklistBrakes,
      checklistAirPressure,
      checklistGasFuel,
      checklistElectrical,
      checklistTires,
      checklistSelfDriver,
    ];

    const defectCount = statuses.filter((s) => s === "Needs Attention").length;
    const overallStatus: "PASS" | "NEEDS ATTENTION" | "CRITICAL DEFECT" =
      defectCount === 0 ? "PASS" : defectCount >= 3 ? "CRITICAL DEFECT" : "NEEDS ATTENTION";

    const numFuelPercent = fuelLevelPercent !== "" ? Number(fuelLevelPercent) : undefined;
    const numFuelLiters = fuelLiters !== "" ? Number(fuelLiters) : undefined;

    if (editingLog && onUpdateInspectionLog) {
      const updatedLog: UnitInspectionLog = {
        ...editingLog,
        truckId: selectedTruckId,
        plateNumber: targetTruck?.plateNumber || editingLog.plateNumber,
        inspectionDate,
        inspectorName: inspectorName.trim() || undefined,
        odometerKm: odometerKm !== "" ? Number(odometerKm) : undefined,
        fuelLevelPercent: numFuelPercent,
        fuelLiters: numFuelLiters,
        overallStatus,
        checklist: {
          battery: checklistBattery,
          lights: checklistLights,
          oil: checklistOil,
          water: checklistWater,
          brakes: checklistBrakes,
          airPressure: checklistAirPressure,
          gasFuel: checklistGasFuel,
          electrical: checklistElectrical,
          tires: checklistTires,
          selfDriverStatus: checklistSelfDriver,
        },
        notes: notes.trim() || undefined,
      };
      await onUpdateInspectionLog(updatedLog);
    } else {
      const newLog: Omit<UnitInspectionLog, "id"> = {
        truckId: selectedTruckId,
        plateNumber: targetTruck?.plateNumber || "UNKNOWN",
        inspectionDate,
        inspectorName: inspectorName.trim() || undefined,
        odometerKm: odometerKm !== "" ? Number(odometerKm) : undefined,
        fuelLevelPercent: numFuelPercent,
        fuelLiters: numFuelLiters,
        overallStatus,
        checklist: {
          battery: checklistBattery,
          lights: checklistLights,
          oil: checklistOil,
          water: checklistWater,
          brakes: checklistBrakes,
          airPressure: checklistAirPressure,
          gasFuel: checklistGasFuel,
          electrical: checklistElectrical,
          tires: checklistTires,
          selfDriverStatus: checklistSelfDriver,
        },
        notes: notes.trim() || undefined,
      };

      await onAddInspectionLog(newLog);
    }

    resetForm();
  };

  const filteredLogs = inspectionLogs.filter((l) => {
    const matchesTruck = filterTruckId === "ALL" ? true : l.truckId === filterTruckId;
    const matchesSearch =
      l.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      (l.inspectorName && l.inspectorName.toLowerCase().includes(search.toLowerCase())) ||
      (l.notes && l.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesTruck && matchesSearch;
  });

  const totalInspections = inspectionLogs.length;
  const passCount = inspectionLogs.filter((l) => l.overallStatus === "PASS").length;
  const defectCount = inspectionLogs.filter((l) => l.overallStatus !== "PASS").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title & KPI Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            📋 Unit Safety &amp; Inspection
          </h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--text-dim)" }}>
            Perform fleet safety audits and record vehicle condition.
          </p>
        </div>

        {user && !showAddForm && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}>
            ➕ Record Unit Inspection
          </button>
        )}
      </div>

      {/* Analytics KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Inspections Conducted</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.3rem" }}>
            📋 {totalInspections} Audits
          </div>
        </div>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Passed Safety Audits</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)", marginTop: "0.3rem" }}>
            ✅ {passCount} Units OK
          </div>
        </div>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Defects / Maintenance Flagged</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: defectCount > 0 ? "var(--warning)" : "var(--text-muted)", marginTop: "0.3rem" }}>
            ⚠️ {defectCount} Units Needing Action
          </div>
        </div>
      </div>

      {/* Inspection Log Form */}
      {showAddForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--primary)" }}>
              {editingLog ? "✏️ Edit Unit Inspection" : "➕ Record Unit Inspection"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={resetForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Select Truck Unit *</label>
                <select
                  className="form-select"
                  value={selectedTruckId}
                  onChange={(e) => setSelectedTruckId(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚛 {v.plateNumber} ({v.modelType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="form-input"
                  value={inspectionDate.includes(" ") ? inspectionDate.replace(" ", "T") : inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inspector / Auditor Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Chief Mechanic Cardo"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Odometer Reading (KM)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 145000"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Tank Gauge (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="e.g. 75 (%)"
                  value={fuelLevelPercent}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setFuelLevelPercent(val);
                    if (val !== "") {
                      const cap = targetTruck?.fuelCapacityLiters || 300;
                      setFuelLiters(Math.round((val / 100) * cap));
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Remaining (Liters)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 225 (L)"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            {/* Common Fuel Gauge % Quick Reference Guide */}
            {(() => {
              const cap = targetTruck?.fuelCapacityLiters || 300;
              return (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "rgba(0, 212, 255, 0.04)",
                    border: "1px dashed var(--primary)",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "var(--primary)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    💡 Standard Truck Fuel Gauge Conversion Reference ({targetTruck?.plateNumber || "Unit"} Tank Capacity: {cap}L)
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem 1.2rem", color: "var(--text-dim)" }}>
                    <div><strong>Full (F)</strong> = <code>100%</code> ({cap}L)</div>
                    <div><strong>3/4 Gauge</strong> = <code>75%</code> ({Math.round(cap * 0.75)}L)</div>
                    <div><strong>1/2 Gauge</strong> = <code>50%</code> ({Math.round(cap * 0.50)}L)</div>
                    <div><strong>1/4 Gauge</strong> = <code>25%</code> ({Math.round(cap * 0.25)}L)</div>
                    <div><strong>Empty / Reserve (E)</strong> = <code>&le; 10%</code> (&le; {Math.round(cap * 0.10)}L)</div>
                  </div>
                </div>
              );
            })()}

            {/* BLOWBAGETS Checklist Grid */}
            <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>
                  🛠️ Inspection Items
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={markAllPass}
                  style={{ fontSize: "0.75rem", borderColor: "var(--success)", color: "var(--success)", fontWeight: 700 }}
                >
                  ⚡ Mark All Pass (OK)
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.85rem" }}>
                {blowbagetsList.map((item) => (
                  <div key={item.key} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", whiteSpace: "nowrap" }}>{item.label}</label>
                    <select className="form-select" style={{ fontSize: "0.8rem" }} value={item.value} onChange={(e) => item.setter(e.target.value as ChecklistStatus)}>
                      <option value="Not Checked">❓ Not Checked</option>
                      <option value="OK">✅ Pass</option>
                      <option value="Needs Attention">⚠️ Defect</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ margin: "1rem 0 0 0" }}>
                <label className="form-label">Mechanic Notes / Repair Action Required</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Front right tire thread worn out, scheduled for replacement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingLog ? "💾 Save Changes" : "💾 Save Inspection Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search Plate Number, Inspector, or Notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: "220px" }}
          value={filterTruckId}
          onChange={(e) => setFilterTruckId(e.target.value)}
        >
          <option value="ALL">🚛 All Truck Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber} ({v.modelType})
            </option>
          ))}
        </select>
      </div>

      {/* Inspection History Table */}
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Vehicle Unit</th>
              <th>Overall Status</th>
              <th>Inspection Summary</th>
              <th>Inspector / Odometer</th>
              <th>Notes</th>
              {user && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-dim)" }}>
                  No unit inspection logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.82rem" }}>
                    📅 {l.inspectionDate}
                  </td>
                  <td>
                    <strong>🚛 {l.plateNumber}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${l.overallStatus === "PASS"
                        ? "badge-success"
                        : l.overallStatus === "CRITICAL DEFECT"
                          ? "badge-danger"
                          : "badge-warning"
                        }`}
                    >
                      {l.overallStatus === "PASS" ? "✅ PASS" : l.overallStatus === "CRITICAL DEFECT" ? "🔴 CRITICAL DEFECT" : "⚠️ DEFECT"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: "320px" }}>
                      {Object.entries(l.checklist).map(([key, val]) => (
                        <span
                          key={key}
                          style={{
                            fontSize: "0.68rem",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "3px",
                            fontWeight: 700,
                            background: val === "OK" ? "rgba(16, 185, 129, 0.12)" : val === "Needs Attention" ? "rgba(244, 63, 94, 0.18)" : "rgba(255, 255, 255, 0.05)",
                            color: val === "OK" ? "var(--success)" : val === "Needs Attention" ? "#f43f5e" : "var(--text-dim)",
                            border: val === "Needs Attention" ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid transparent",
                          }}
                        >
                          {key.toUpperCase()}: {val === "OK" ? "OK" : val === "Needs Attention" ? "DEFECT" : "—"}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem" }}>👤 {l.inspectorName || "—"}</div>
                    {l.odometerKm !== undefined && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        🚗 {l.odometerKm.toLocaleString()} KM
                      </div>
                    )}
                    {l.fuelLevelPercent !== undefined && (
                      <div style={{ fontSize: "0.72rem", color: "#00d4ff", fontWeight: 700 }}>
                        ⛽ {l.fuelLevelPercent}% {l.fuelLiters !== undefined ? `(${l.fuelLiters}L)` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
                    {l.notes || "—"}
                  </td>
                  {user && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}
                          onClick={() => handleStartEdit(l)}
                        >
                          ✏️ Edit
                        </button>
                        {onDeleteInspectionLog && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: "var(--danger)", borderColor: "var(--danger)", padding: "0.2rem 0.5rem" }}
                            onClick={async () => {
                              const confirmed = await showConfirm(`Delete inspection record for ${l.plateNumber}?`, "Delete Inspection Log");
                              if (confirmed) {
                                await onDeleteInspectionLog(l.id);
                              }
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
