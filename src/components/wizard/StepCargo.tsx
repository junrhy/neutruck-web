import React from "react";

export type FreightTerms = "Per Metric Ton (W.MT)" | "Revenue Ton (W/M.MT)" | "Liner Terms / Discharge (L.D)" | "Free In / Liner Out (FLT)" | "Free In and Out (FIO)" | "FIOST" | "Per Trip Flat Rate";

interface StepCargoProps {
  cargoDescription: string;
  setCargoDescription: (val: string) => void;
  weightTons: number | string;
  setWeightTons: (val: number | string) => void;
  vanSize: string;
  setVanSize: (val: string) => void;
  loadStatus: "Loaded" | "Empty";
  setLoadStatus: (val: "Loaded" | "Empty") => void;
  freightFee: number | string;
  setFreightFee: (val: number | string) => void;
  freightBillingTerms: FreightTerms | "";
  setFreightBillingTerms: (val: FreightTerms | "") => void;
}

export const StepCargo: React.FC<StepCargoProps> = ({
  cargoDescription,
  setCargoDescription,
  weightTons,
  setWeightTons,
  vanSize,
  setVanSize,
  loadStatus,
  setLoadStatus,
  freightFee,
  setFreightFee,
  freightBillingTerms,
  setFreightBillingTerms,
}) => {
  const showCargoWeight = localStorage.getItem("neutruck_show_cargo_weight") !== "false";
  const showBillingTerms = localStorage.getItem("neutruck_show_billing_terms") !== "false";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. Cargo Details Card */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          📦 1. Cargo Manifest, Haul Type, Van Size &amp; Weight
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Cargo Manifest Description (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. General Cargo, 20 Pallets, etc."
              value={cargoDescription}
              onChange={(e) => setCargoDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trip Cargo Condition</label>
            <select
              className="form-select"
              value={loadStatus}
              onChange={(e) => setLoadStatus(e.target.value as "Loaded" | "Empty")}
            >
              <option value="Loaded">Loaded</option>
              <option value="Empty">Empty</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cargo Van / Truck Size (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 20ft, 40ft, 10-Wheeler"
              value={vanSize}
              onChange={(e) => setVanSize(e.target.value)}
            />
          </div>

          {showCargoWeight && (
            <div className="form-group">
              <label className="form-label">Cargo Weight in Tons (Optional)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                placeholder="e.g. 18 (Optional)"
                value={weightTons}
                onChange={(e) => setWeightTons(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Freight Economics Card */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          💰 2. Freight Charges &amp; Billing Terms
        </div>

        <div style={{ display: "grid", gridTemplateColumns: showBillingTerms ? "1fr 1fr" : "1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Gross Freight Charge (₱) *</label>
            <input
              type="number"
              className="form-input"
              value={freightFee}
              onChange={(e) => setFreightFee(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          {showBillingTerms && (
            <div className="form-group">
              <label className="form-label">Freight Billing &amp; Handling Terms (Optional)</label>
              <select
                className="form-select"
                value={freightBillingTerms}
                onChange={(e) => setFreightBillingTerms(e.target.value as FreightTerms | "")}
              >
                <option value="">— None / Default —</option>
                <option value="Per Metric Ton (W.MT)">Per Metric Ton (W.MT)</option>
                <option value="Revenue Ton (W/M.MT)">Revenue Ton (W/M.MT)</option>
                <option value="Liner Terms / Discharge (L.D)">Liner Terms / Discharge (L.D)</option>
                <option value="Free In / Liner Out (FLT)">Free In / Liner Out (FLT)</option>
                <option value="Free In and Out (FIO)">Free In and Out (FIO)</option>
                <option value="FIOST">FIOST (Free In/Out, Stowed &amp; Trimmed)</option>
                <option value="Per Trip Flat Rate">Per Trip Flat Rate Billing</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
