import React from "react";
import { TruckVehicle, DriverProfile, HelperProfile } from "../../types";

interface StepTruckProps {
  vehicles: TruckVehicle[];
  drivers: DriverProfile[];
  helpers?: HelperProfile[];
  selectedTruckId: string;
  setSelectedTruckId: (val: string) => void;
  selectedDriverName: string;
  setSelectedDriverName: (val: string) => void;
  selectedDriverPhone: string;
  setSelectedDriverPhone: (val: string) => void;
  driverRate: number | string;
  setDriverRate: (val: number | string) => void;
  helperName: string;
  setHelperName: (val: string) => void;
  helperPhone: string;
  setHelperPhone: (val: string) => void;
  helperCommission: number | string;
  setHelperCommission: (val: number | string) => void;
  initialJobTruckId?: string;
}

export const StepTruck: React.FC<StepTruckProps> = ({
  vehicles,
  drivers,
  helpers = [],
  selectedTruckId,
  setSelectedTruckId,
  selectedDriverName,
  setSelectedDriverName,
  selectedDriverPhone,
  setSelectedDriverPhone,
  driverRate,
  setDriverRate,
  helperName,
  setHelperName,
  helperPhone,
  setHelperPhone,
  helperCommission,
  setHelperCommission,
  initialJobTruckId,
}) => {
  const activeVehicles = vehicles.filter(
    (v) => v.status === "Available" || v.id === selectedTruckId || v.id === initialJobTruckId
  );

  const selectedTruck = vehicles.find((v) => v.id === selectedTruckId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. Fleet Vehicle Selection Section */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          <span>🚛 1. Fleet Vehicle Assignment</span>
          {selectedTruck && (
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", background: "rgba(16, 185, 129, 0.1)", padding: "0.2rem 0.55rem", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              {selectedTruck.modelType || "Truck"} ({selectedTruck.capacityTons} Tons Cap)
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Select Available Fleet Truck Unit *</label>
          <select
            className="form-select"
            value={selectedTruckId}
            onChange={(e) => {
              const truckId = e.target.value;
              setSelectedTruckId(truckId);
              const matchedTruck = vehicles.find((v) => v.id === truckId);
              if (matchedTruck) {
                if (matchedTruck.driverName) setSelectedDriverName(matchedTruck.driverName);
                if (matchedTruck.driverPhone) setSelectedDriverPhone(matchedTruck.driverPhone);
                if (matchedTruck.helperName) setHelperName(matchedTruck.helperName);
                if (matchedTruck.helperPhone) setHelperPhone(matchedTruck.helperPhone);
              }
            }}
          >
            <option value="" disabled>-- Select Fleet Unit Plate Number --</option>
            {activeVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                🚛 {v.plateNumber} ({v.modelType} — {v.capacityTons}T Payload Capacity) {v.status !== "Available" ? `[${v.status}]` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Driver Details Section */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          <span>👨‍✈️ 2. Primary Driver Details &amp; Rate</span>
          {drivers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)" }}>⚡ Auto Fill:</span>
              <select
                className="form-select"
                style={{ width: "170px", fontSize: "0.78rem", padding: "0.25rem 1.6rem 0.25rem 0.6rem" }}
                defaultValue=""
                onChange={(e) => {
                  const drv = drivers.find((d) => d.id === e.target.value);
                  if (drv) {
                    setSelectedDriverName(drv.name);
                    setSelectedDriverPhone(drv.phone);
                  }
                }}
              >
                <option value="" disabled>Select Driver Profile...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    👨‍✈️ {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Assigned Driver Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Juan Dela Cruz"
              value={selectedDriverName}
              onChange={(e) => setSelectedDriverName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Driver Phone Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 09171234567"
              value={selectedDriverPhone}
              onChange={(e) => setSelectedDriverPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Driver Rate / Commission (₱) *</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 1500"
              value={driverRate}
              onChange={(e) => setDriverRate(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* 3. Truck Helper / Assistant Section */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          <span>🧑‍🔧 3. Helper / Assistant Crew (Optional)</span>
          {helpers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)" }}>⚡ Auto Fill:</span>
              <select
                className="form-select"
                style={{ width: "170px", fontSize: "0.78rem", padding: "0.25rem 1.6rem 0.25rem 0.6rem" }}
                defaultValue=""
                onChange={(e) => {
                  const hlp = helpers.find((h) => h.id === e.target.value);
                  if (hlp) {
                    setHelperName(hlp.name);
                    setHelperPhone(hlp.phone);
                  }
                }}
              >
                <option value="" disabled>Select Helper Profile...</option>
                {helpers.map((h) => (
                  <option key={h.id} value={h.id}>
                    🧑‍🔧 {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Helper Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Pedro Penduko"
              value={helperName}
              onChange={(e) => setHelperName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Helper Phone Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 09189876543"
              value={helperPhone}
              onChange={(e) => setHelperPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Helper Trip Commission (₱)</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 500"
              value={helperCommission}
              onChange={(e) => setHelperCommission(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
