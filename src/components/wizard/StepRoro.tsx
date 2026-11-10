import React from "react";
import { RoroRoute, DropoffStop } from "../../types";

interface StepRoroProps {
  isInterIsland: boolean;
  setIsInterIsland: (val: boolean) => void;
  roroRoute: string;
  setRoroRoute: (val: string) => void;
  shippingLine: string;
  setShippingLine: (val: string) => void;
  roroTicketFee: number;
  setRoroTicketFee: (val: number) => void;
  roroRoutes: RoroRoute[];
  roroSearch: string;
  setRoroSearch: (val: string) => void;
  pickupLocation: string;
  dropoffLocation: string;
  dropoffStops: DropoffStop[];
  onOpenRoroPage?: () => void;
}

export const StepRoro: React.FC<StepRoroProps> = ({
  isInterIsland,
  setIsInterIsland,
  roroRoute,
  setRoroRoute,
  shippingLine,
  setShippingLine,
  roroTicketFee,
  setRoroTicketFee,
  roroRoutes,
  roroSearch,
  setRoroSearch,
  dropoffStops,
  onOpenRoroPage,
}) => {
  const filteredRoroRoutes = roroRoutes.filter(
    (r) =>
      r.originPortName.toLowerCase().includes(roroSearch.toLowerCase()) ||
      r.destinationPortName.toLowerCase().includes(roroSearch.toLowerCase()) ||
      r.shippingLine.toLowerCase().includes(roroSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ padding: "1rem", border: "1px dashed var(--primary)", borderRadius: "8px", background: "rgba(0, 212, 255, 0.03)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", color: "var(--primary)" }}>
          <input
            type="checkbox"
            checked={isInterIsland}
            onChange={(e) => setIsInterIsland(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
          />
          🚢 Requires Inter-Island RoRo Ferry Passage / Maritime Shipping
        </label>
        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginTop: "0.25rem", marginLeft: "2.1rem" }}>
          Enable if cargo transit involves maritime vessel loading between island groups.
        </span>
      </div>

      {isInterIsland && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {roroRoutes.length > 0 && (
            <div style={{ padding: "0.45rem 0.75rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                ⚡ Auto Fill:
              </span>
              <input
                type="text"
                className="form-input"
                style={{ width: "150px", fontSize: "0.78rem", padding: "0.35rem 0.6rem" }}
                placeholder="🔍 Search port/line..."
                value={roroSearch}
                onChange={(e) => setRoroSearch(e.target.value)}
              />
              <select
                className="form-select"
                style={{ flex: 1, minWidth: "200px", fontSize: "0.78rem", padding: "0.35rem 1.8rem 0.35rem 0.6rem" }}
                defaultValue=""
                onChange={(e) => {
                  const selected = roroRoutes.find((r) => r.id === e.target.value);
                  if (selected) {
                    setRoroRoute(`${selected.originPortName} ➔ ${selected.destinationPortName}`);
                    setShippingLine(selected.shippingLine);
                    setRoroTicketFee(selected.defaultTicketFee || 0);
                  }
                }}
              >
                <option value="" disabled>Select Saved RoRo Route ({filteredRoroRoutes.length} found)...</option>
                {filteredRoroRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    🚢 {r.originPortName} ➔ {r.destinationPortName} ({r.shippingLine} — ₱{(r.defaultTicketFee || 0).toLocaleString()})
                  </option>
                ))}
              </select>
              {onOpenRoroPage && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={onOpenRoroPage}
                  style={{ whiteSpace: "nowrap", fontSize: "0.72rem", padding: "0.25rem 0.5rem" }}
                >
                  ⚙️ Manage Routes
                </button>
              )}
            </div>
          )}

          <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              🚢 Primary RoRo Ferry Passage Details
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">RoRo Route Passage</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Cebu Pier 3 Pier ➔ Tubigon Port Pier"
                  value={roroRoute}
                  onChange={(e) => setRoroRoute(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shipping Vessel Line</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lite Shipping / FastCat Lines"
                  value={shippingLine}
                  onChange={(e) => setShippingLine(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">RoRo Vessel Ticket Fee (₱)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 6500"
                  value={roroTicketFee || ""}
                  onChange={(e) => setRoroTicketFee(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {dropoffStops.length > 0 && dropoffStops.some((s) => s.roroLeg) && (
            <div style={{ padding: "0.85rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "0.82rem", color: "#f59e0b" }}>
              💡 <b>Multi-Leg Ferry Itinerary Detected:</b> You have defined individual RoRo ferry legs inside multi-stop dropoffs. Their total ticket fees will be summarized on dispatch.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
