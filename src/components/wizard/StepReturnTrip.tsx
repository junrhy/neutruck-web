import React from "react";

interface StepReturnTripProps {
  hasReturnTrip: boolean;
  setHasReturnTrip: (val: boolean) => void;
  returnDestination: string;
  setReturnDestination: (val: string) => void;
  returnCargoType: "Empty Haul / Deadhead" | "Backhaul Cargo" | "Return Empty Pallets/Containers";
  setReturnCargoType: (val: "Empty Haul / Deadhead" | "Backhaul Cargo" | "Return Empty Pallets/Containers") => void;
  returnPayer: "Shipper Paid Round-Trip" | "Backhaul Client Paid" | "Company Expense";
  setReturnPayer: (val: "Shipper Paid Round-Trip" | "Backhaul Client Paid" | "Company Expense") => void;
  returnFreightFee: number | string;
  setReturnFreightFee: (val: number | string) => void;
  returnFuelAllowance: number | string;
  setReturnFuelAllowance: (val: number | string) => void;
  returnRoroTicketFee: number | string;
  setReturnRoroTicketFee: (val: number | string) => void;
}

export const StepReturnTrip: React.FC<StepReturnTripProps> = ({
  hasReturnTrip,
  setHasReturnTrip,
  returnDestination,
  setReturnDestination,
  returnCargoType,
  setReturnCargoType,
  returnPayer,
  setReturnPayer,
  returnFreightFee,
  setReturnFreightFee,
  returnFuelAllowance,
  setReturnFuelAllowance,
  returnRoroTicketFee,
  setReturnRoroTicketFee,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Return Trip & Backhaul Section Toggle */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", color: "var(--primary)" }}>
          <input
            type="checkbox"
            checked={hasReturnTrip}
            onChange={(e) => setHasReturnTrip(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
          />
          🔄 Enable Return Trip &amp; Backhaul Logistics Route
        </label>
        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginLeft: "2.1rem" }}>
          Check this option if truck returns to home base garage or picks up backhaul cargo on return leg.
        </span>
      </div>

      {hasReturnTrip && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              🔄 Return Leg Destination &amp; Cargo Type
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Return Destination Base</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Home Base Garage / Tagbilaran Depot"
                  value={returnDestination}
                  onChange={(e) => setReturnDestination(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Return Cargo Haul Type</label>
                <select
                  className="form-select"
                  value={returnCargoType}
                  onChange={(e) => setReturnCargoType(e.target.value as any)}
                >
                  <option value="Empty Haul / Deadhead">Empty Haul / Deadhead Return</option>
                  <option value="Backhaul Cargo">Backhaul Commercial Cargo</option>
                  <option value="Return Empty Pallets/Containers">Return Empty Pallets / Containers</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Return Trip Payer / Terms</label>
                <select
                  className="form-select"
                  value={returnPayer}
                  onChange={(e) => setReturnPayer(e.target.value as any)}
                >
                  <option value="Shipper Paid Round-Trip">Shipper Paid Round-Trip</option>
                  <option value="Backhaul Client Paid">Backhaul Client Paid</option>
                  <option value="Company Expense">Company Internal Expense</option>
                </select>
              </div>
            </div>
          </div>

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
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              💰 Return Trip Financial Expenses &amp; Allowances
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              {returnCargoType === "Backhaul Cargo" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Backhaul Freight Revenue (₱)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={returnFreightFee}
                    onChange={(e) => setReturnFreightFee(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Return Fuel Allowance (₱)</label>
                <input
                  type="number"
                  className="form-input"
                  value={returnFuelAllowance}
                  onChange={(e) => setReturnFuelAllowance(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Return RoRo Ferry Budget (₱)</label>
                <input
                  type="number"
                  className="form-input"
                  value={returnRoroTicketFee}
                  onChange={(e) => setReturnRoroTicketFee(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
