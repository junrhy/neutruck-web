import React from "react";

interface StepFuelProps {
  trackTripFuel: boolean;
  setTrackTripFuel: (val: boolean) => void;
  fuelAllowance: number | string;
  setFuelAllowance: (val: number | string) => void;
  pricePerLiter: number | string;
  setPricePerLiter: (val: number | string) => void;
  distanceKm: number | string;
  setDistanceKm: (val: number | string) => void;
  initialFuelLevelPercent: number | string;
  setInitialFuelLevelPercent: (val: number | string) => void;
  initialLiters: number | string;
  setInitialLiters: (val: number | string) => void;
  addedFuelLiters: number | string;
  setAddedFuelLiters: (val: number | string) => void;
  fuelSource: "Garage Dispenser" | "External Gas Station" | "Fuel Card / Voucher";
  setFuelSource: (val: "Garage Dispenser" | "External Gas Station" | "Fuel Card / Voucher") => void;
  fuelCardNumber: string;
  setFuelCardNumber: (val: string) => void;
}

export const StepFuel: React.FC<StepFuelProps> = ({
  trackTripFuel,
  setTrackTripFuel,
  fuelAllowance,
  setFuelAllowance,
  pricePerLiter,
  setPricePerLiter,
  distanceKm,
  setDistanceKm,
  initialFuelLevelPercent,
  setInitialFuelLevelPercent,
  initialLiters,
  setInitialLiters,
  addedFuelLiters,
  setAddedFuelLiters,
  fuelSource,
  setFuelSource,
  fuelCardNumber,
  setFuelCardNumber,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ padding: "1rem", border: "1px dashed var(--primary)", borderRadius: "8px", background: "rgba(0, 212, 255, 0.03)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", color: "var(--primary)" }}>
          <input
            type="checkbox"
            checked={trackTripFuel}
            onChange={(e) => setTrackTripFuel(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
          />
          ⛽ Enable Per-Trip Fuel Allowance &amp; Consumption Tracking
        </label>
        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginTop: "0.25rem", marginLeft: "2.1rem" }}>
          Uncheck if your fleet monitors fuel per vehicle rather than per individual trip.
        </span>
      </div>

      {trackTripFuel && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* 1. Trip Fuel Budget & Consumption Metrics */}
          <div
            style={{
              padding: "1.25rem",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                💰 1. Trip Fuel Budget &amp; Price Metrics
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Fuel allowance, price per liter, and estimated haulage distance
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Trip Fuel Allowance (₱) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5000"
                  value={fuelAllowance}
                  onChange={(e) => setFuelAllowance(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fuel Price / Liter (₱/L)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="e.g. 68.50"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Estimated Distance (KM)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  placeholder="e.g. 350"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* 2. Initial Tank Level Section */}
          <div
            style={{
              padding: "1.25rem",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                ⛽ 2. Current Tank Level &amp; Gauge
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Current fuel level prior to trip dispatch
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fuel Tank Level (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="e.g. 75"
                  value={initialFuelLevelPercent}
                  onChange={(e) => setInitialFuelLevelPercent(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Current Fuel Volume (Liters)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  placeholder="e.g. 150"
                  value={initialLiters}
                  onChange={(e) => setInitialLiters(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* 3. Garage Dispenser / Additional Fuel Top-Up Section */}
          <div
            style={{
              padding: "1.25rem",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                🏭 3. Additional Garage Fuel Top-Up
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Add extra liters from internal garage pump dispenser if tank is insufficient
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Additional Fuel (Liters)</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  placeholder="e.g. 50 (if tank is low)"
                  value={addedFuelLiters}
                  onChange={(e) => setAddedFuelLiters(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Dispenser / Fuel Source</label>
                <select
                  className="form-select"
                  value={fuelSource}
                  onChange={(e) => setFuelSource(e.target.value as any)}
                >
                  <option value="Garage Dispenser">Garage Dispenser (Internal Pump)</option>
                  <option value="External Gas Station">External Gas Station</option>
                  <option value="Fuel Card / Voucher">Fuel Card / PO Voucher</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">PO Voucher / Ref. No. (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. GARAGE-PUMP-4021"
                  value={fuelCardNumber}
                  onChange={(e) => setFuelCardNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
