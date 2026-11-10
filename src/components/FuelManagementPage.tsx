import { useState } from "react";
import { TruckVehicle, FuelTopupLog } from "../types";
import { useAuth } from "../hooks/useAuth";

interface FuelManagementPageProps {
  vehicles: TruckVehicle[];
  topupLogs: FuelTopupLog[];
  onAddTopupLog: (log: Omit<FuelTopupLog, "id">) => Promise<void>;
  onUpdateTopupLog?: (log: FuelTopupLog) => Promise<void>;
  onDeleteTopupLog: (id: string) => Promise<void>;
}

const CONTAINER_SOURCE_PRESETS = [
  "On-Site Container A",
  "On-Site Container B",
  "Tanker Truck A",
  "Tanker Truck B",
  "Gas Station"
];

const formatForDatetimeLocal = (dateStr?: string): string => {
  if (!dateStr) return new Date().toISOString().substring(0, 16);
  if (dateStr.includes("T")) return dateStr.substring(0, 16);
  // Convert "2026-09-30 14:30" to "2026-09-30T14:30"
  return dateStr.replace(" ", "T").substring(0, 16);
};

export default function FuelManagementPage({
  vehicles,
  topupLogs,
  onAddTopupLog,
  onUpdateTopupLog,
  onDeleteTopupLog,
}: FuelManagementPageProps) {
  const { user } = useAuth();
  const [selectedTruckId, setSelectedTruckId] = useState(vehicles[0]?.id || "");
  const [topupDate, setTopupDate] = useState(() => formatForDatetimeLocal());
  const [liters, setLiters] = useState<number | "">("");
  const [costPerLiter, setCostPerLiter] = useState<number | "">(90);
  const [location, setLocation] = useState("");
  const [containerSource, setContainerSource] = useState(CONTAINER_SOURCE_PRESETS[0]);
  const [customSource, setCustomSource] = useState("");
  const [odometerKm, setOdometerKm] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterTruckId, setFilterTruckId] = useState<string>("ALL");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelTopupLog | null>(null);

  const targetTruck = vehicles.find((v) => v.id === selectedTruckId);
  const calculatedTotalCost = (Number(liters) || 0) * (Number(costPerLiter) || 0);

  const resetForm = () => {
    setSelectedTruckId(vehicles[0]?.id || "");
    setTopupDate(formatForDatetimeLocal());
    setLiters("");
    setCostPerLiter(90);
    setLocation("");
    setContainerSource(CONTAINER_SOURCE_PRESETS[0]);
    setCustomSource("");
    setOdometerKm("");
    setNotes("");
    setEditingLog(null);
    setShowAddForm(false);
  };

  const handleStartEdit = (log: FuelTopupLog) => {
    setEditingLog(log);
    setSelectedTruckId(log.truckId);
    setTopupDate(formatForDatetimeLocal(log.topupDate));
    setLiters(log.liters);
    setCostPerLiter(log.costPerLiter || 0);
    setLocation(log.location || "");
    if (CONTAINER_SOURCE_PRESETS.includes(log.containerSource)) {
      setContainerSource(log.containerSource);
      setCustomSource("");
    } else {
      setContainerSource("CUSTOM");
      setCustomSource(log.containerSource);
    }
    setOdometerKm(log.odometerKm ?? "");
    setNotes(log.notes || "");
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTruckId || !liters) return;

    const sourceToSave = containerSource === "CUSTOM" ? customSource.trim() : containerSource;

    if (editingLog && onUpdateTopupLog) {
      const updatedLog: FuelTopupLog = {
        ...editingLog,
        truckId: selectedTruckId,
        plateNumber: targetTruck?.plateNumber || editingLog.plateNumber,
        topupDate,
        liters: Number(liters) || 0,
        costPerLiter: Number(costPerLiter) || 0,
        totalCost: calculatedTotalCost,
        location: location.trim(),
        containerSource: sourceToSave || "Depot Tank",
        odometerKm: typeof odometerKm === "number" ? odometerKm : null as any,
        notes: notes.trim() || undefined,
      };
      await onUpdateTopupLog(updatedLog);
    } else {
      const newLog: Omit<FuelTopupLog, "id"> = {
        truckId: selectedTruckId,
        plateNumber: targetTruck?.plateNumber || "UNKNOWN",
        topupDate,
        liters: Number(liters) || 0,
        costPerLiter: Number(costPerLiter) || 0,
        totalCost: calculatedTotalCost,
        location: location.trim(),
        containerSource: sourceToSave || "Depot Tank",
        odometerKm: typeof odometerKm === "number" ? odometerKm : null as any,
        notes: notes.trim() || undefined,
      };

      await onAddTopupLog(newLog);
    }
    resetForm();
  };

  const filteredLogs = topupLogs.filter((l) => {
    const matchesTruck = filterTruckId === "ALL" ? true : l.truckId === filterTruckId;
    const matchesSearch =
      l.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.containerSource.toLowerCase().includes(search.toLowerCase()) ||
      l.location.toLowerCase().includes(search.toLowerCase()) ||
      (l.driverName && l.driverName.toLowerCase().includes(search.toLowerCase())) ||
      (l.waybillNumber && l.waybillNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesTruck && matchesSearch;
  });

  // Analytics Metrics
  const totalFuelLiters = topupLogs.reduce((sum, l) => sum + (l.liters || 0), 0);
  const totalFuelCost = topupLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);
  const avgCostPerLiter = totalFuelLiters > 0 ? totalFuelCost / totalFuelLiters : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title & KPI Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🛢️ Fuel Top-Up &amp; Container Tank Monitoring</span>
          </h2>
          <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
            Dedicated refilling tracker, fleet tank balance monitoring, and container source audit
          </div>
        </div>

        {user && !showAddForm && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}>
            ➕ Record Fuel Top-Up
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Volume Refilled</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.3rem" }}>
            ⛽ {totalFuelLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters
          </div>
        </div>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Fuel Expenditure</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)", marginTop: "0.3rem" }}>
            ₱{totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Weighted Average Price / Liter</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warning)", marginTop: "0.3rem" }}>
            ₱{avgCostPerLiter.toFixed(2)} / L
          </div>
        </div>
      </div>

      {/* Dedicated Record Add / Edit Form */}
      {showAddForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--primary)" }}>
              {editingLog ? "✏️ Edit Fuel Top-Up Log" : "➕ Record Refill & Container Top-Up"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={resetForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Select Truck Unit *</label>
                <select
                  className="form-select"
                  value={selectedTruckId}
                  onChange={(e) => {
                    setSelectedTruckId(e.target.value);
                  }}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      🚛 {v.plateNumber} ({v.modelType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Top-Up Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="form-input"
                  value={topupDate}
                  onChange={(e) => setTopupDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Refill Station / Location *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Petron Pier 3 Terminal"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Source *</label>
                <select
                  className="form-select"
                  value={containerSource}
                  onChange={(e) => setContainerSource(e.target.value)}
                >
                  {CONTAINER_SOURCE_PRESETS.map((s) => (
                    <option key={s} value={s}>
                      🛢️ {s}
                    </option>
                  ))}
                  <option value="CUSTOM">✏️ Custom Source...</option>
                </select>
              </div>

              {containerSource === "CUSTOM" && (
                <div className="form-group">
                  <label className="form-label">Custom Source Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Depot Tanker Batch #4"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Fuel Volume Top-Up (Liters) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  className="form-input"
                  placeholder="e.g. 120.5"
                  value={liters}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setLiters("");
                    } else {
                      const num = parseFloat(val);
                      if (!isNaN(num)) setLiters(num);
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price per Liter (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="90.00"
                  value={costPerLiter}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setCostPerLiter("");
                    } else {
                      const num = parseFloat(val);
                      if (!isNaN(num)) setCostPerLiter(num);
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Calculated Total Cost</label>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ fontWeight: 700, color: "var(--success)" }}
                  value={`₱${calculatedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Odometer (KM - Optional)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 142500"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingLog ? "💾 Save Changes" : "💾 Record Fuel Top-Up"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Card */}
      <div className="table-card">
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            📜 Fuel Top-Up Audit Logs ({filteredLogs.length})
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              className="form-input"
              style={{ width: "240px", padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
              placeholder="Search Plate, Container, Station..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="form-select"
              style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.82rem" }}
              value={filterTruckId}
              onChange={(e) => setFilterTruckId(e.target.value)}
            >
              <option value="ALL">All Fleet Trucks</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  🚛 {v.plateNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Truck Plate</th>
              <th>Volume Top-Up</th>
              <th>Fuel Container Source</th>
              <th>Refill Station Location</th>
              <th>Total Cost</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
                  No fuel top-up records found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: "0.82rem", fontFamily: "monospace" }}>{log.topupDate}</td>
                  <td style={{ fontWeight: 700, fontSize: "0.95rem" }}>{log.plateNumber}</td>
                  <td>
                    <span className="badge badge-success" style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}>
                      ⛽ {log.liters} L
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                      🛢️ {log.containerSource}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>📍 {log.location}</td>
                  <td style={{ fontWeight: 800, color: "var(--success)", fontSize: "0.9rem" }}>
                    ₱{log.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {user && (
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: "0.25rem 0.55rem", fontSize: "0.72rem" }}
                          onClick={() => handleStartEdit(log)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: "0.25rem 0.55rem", fontSize: "0.72rem" }}
                          onClick={() => onDeleteTopupLog(log.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
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
