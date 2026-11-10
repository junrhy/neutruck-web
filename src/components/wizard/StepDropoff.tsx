import React from "react";
import { DropoffDestination, DropoffStop } from "../../types";

interface StepDropoffProps {
  dropoffLocation: string;
  setDropoffLocation: (val: string) => void;
  dropoffStops: DropoffStop[];
  setDropoffStops: React.Dispatch<React.SetStateAction<DropoffStop[]>>;
  destinations: DropoffDestination[];
  destinationSearch: string;
  setDestinationSearch: (val: string) => void;
}

export const StepDropoff: React.FC<StepDropoffProps> = ({
  dropoffLocation,
  setDropoffLocation,
  dropoffStops,
  setDropoffStops,
  destinations,
  destinationSearch,
  setDestinationSearch,
}) => {
  const filteredDestinations = destinations.filter(
    (d) =>
      d.hubName.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      d.cityProvince.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      (d.receiverName && d.receiverName.toLowerCase().includes(destinationSearch.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Route Type Toggle */}
      <div style={{ display: "flex", gap: "1rem", background: "var(--bg-main)", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <button
          type="button"
          className={`tab-btn ${dropoffStops.length === 0 ? "active" : ""}`}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => setDropoffStops([])}
        >
          📍 Direct Point-to-Point Single Destination
        </button>
        <button
          type="button"
          className={`tab-btn ${dropoffStops.length > 0 ? "active" : ""}`}
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => {
            if (dropoffStops.length === 0) {
              setDropoffStops([
                { id: `stop-${Date.now()}-1`, locationName: dropoffLocation || "" },
                { id: `stop-${Date.now()}-2`, locationName: "" },
              ]);
            }
          }}
        >
          🗺️ Dynamic Multi-Stop Delivery Itinerary
        </button>
      </div>

      {destinations.length > 0 && dropoffStops.length === 0 && (
        <div style={{ padding: "0.45rem 0.75rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
            ⚡ Auto Fill:
          </span>
          <input
            type="text"
            className="form-input"
            style={{ width: "150px", fontSize: "0.78rem", padding: "0.35rem 0.6rem" }}
            placeholder="🔍 Search hub/city..."
            value={destinationSearch}
            onChange={(e) => setDestinationSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ flex: 1, minWidth: "200px", fontSize: "0.78rem", padding: "0.35rem 1.8rem 0.35rem 0.6rem" }}
            defaultValue=""
            onChange={(e) => {
              const selected = destinations.find((d) => d.id === e.target.value);
              if (selected) {
                setDropoffLocation(`${selected.hubName} (${selected.cityProvince})`);
              }
            }}
          >
            <option value="" disabled>Select Saved Destination Hub ({filteredDestinations.length} found)...</option>
            {filteredDestinations.map((d) => (
              <option key={d.id} value={d.id}>
                📍 {d.hubName} — {d.cityProvince}
              </option>
            ))}
          </select>
        </div>
      )}

      {dropoffStops.length === 0 ? (
        <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
            ➔ Primary Consignee Dropoff Destination
          </div>
          <div className="form-group">
            <label className="form-label">Dropoff Facility / Receiver Address *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Tubigon Warehouse Hub (Tubigon, Bohol)"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ margin: 0 }}>
              🗺️ Multi-Stop Dropoff Waypoints ({dropoffStops.length} Stops) *
            </label>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setDropoffStops((prev) => [
                  ...prev,
                  { id: `stop-${Date.now()}`, locationName: "", cargoNotes: "" },
                ])
              }
            >
              ➕ Add Delivery Stop
            </button>
          </div>

          {dropoffStops.map((stop, index) => (
            <div
              key={stop.id}
              style={{
                padding: "1rem",
                background: "var(--bg-main)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}>
                  🛑 Delivery Stop #{index + 1}
                </span>
                {dropoffStops.length > 2 && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem" }}
                    onClick={() => setDropoffStops((prev) => prev.filter((s) => s.id !== stop.id))}
                  >
                    🗑️ Remove Stop
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Dropoff Location Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`e.g. Stop #${index + 1} Store / Warehouse`}
                    value={stop.locationName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDropoffStops((prev) =>
                        prev.map((s) => (s.id === stop.id ? { ...s, locationName: val } : s))
                      );
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cargo Dropoff Notes / Items</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Unload 10 Pallets, Receiver Contact"
                    value={stop.cargoNotes || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDropoffStops((prev) =>
                        prev.map((s) => (s.id === stop.id ? { ...s, cargoNotes: val } : s))
                      );
                    }}
                  />
                </div>
              </div>

              {/* Optional RoRo leg for this specific stop */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id={`roro-check-${stop.id}`}
                  checked={!!stop.roroLeg}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDropoffStops((prev) =>
                      prev.map((s) =>
                        s.id === stop.id
                          ? {
                              ...s,
                              roroLeg: checked
                                ? {
                                    id: `roro-leg-${Date.now()}`,
                                    originPortName: "",
                                    destinationPortName: "",
                                    shippingLine: "",
                                    ticketFee: 0,
                                  }
                                : undefined,
                            }
                          : s
                      )
                    );
                  }}
                />
                <label htmlFor={`roro-check-${stop.id}`} style={{ fontSize: "0.78rem", cursor: "pointer", color: "var(--primary)" }}>
                  🚢 Requires Inter-Island RoRo Ferry Passage Before This Stop
                </label>
              </div>

              {stop.roroLeg && (
                <div style={{ padding: "0.75rem", background: "rgba(0, 212, 255, 0.03)", borderRadius: "6px", border: "1px dashed var(--primary)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.72rem" }}>Origin Port</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                      placeholder="e.g. Cebu Pier 3"
                      value={stop.roroLeg.originPortName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDropoffStops((prev) =>
                          prev.map((s) =>
                            s.id === stop.id && s.roroLeg
                              ? { ...s, roroLeg: { ...s.roroLeg, originPortName: val } }
                              : s
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.72rem" }}>Destination Port</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                      placeholder="e.g. Tubigon Port"
                      value={stop.roroLeg.destinationPortName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDropoffStops((prev) =>
                          prev.map((s) =>
                            s.id === stop.id && s.roroLeg
                              ? { ...s, roroLeg: { ...s.roroLeg, destinationPortName: val } }
                              : s
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.72rem" }}>Shipping Line</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                      placeholder="e.g. Lite Shipping"
                      value={stop.roroLeg.shippingLine || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDropoffStops((prev) =>
                          prev.map((s) =>
                            s.id === stop.id && s.roroLeg
                              ? { ...s, roroLeg: { ...s.roroLeg, shippingLine: val } }
                              : s
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.72rem" }}>Ferry Ticket Fee (₱)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                      placeholder="e.g. 6500"
                      value={stop.roroLeg.ticketFee || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDropoffStops((prev) =>
                          prev.map((s) =>
                            s.id === stop.id && s.roroLeg
                              ? { ...s, roroLeg: { ...s.roroLeg, ticketFee: val } }
                              : s
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

