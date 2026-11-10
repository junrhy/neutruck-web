import React from "react";
import { DropoffDestination } from "../../types";

interface StepOriginProps {
  pickupLocation: string;
  setPickupLocation: (val: string) => void;
  destinations: DropoffDestination[];
  destinationSearch: string;
  setDestinationSearch: (val: string) => void;
  onOpenDestinationsPage?: () => void;
}

export const StepOrigin: React.FC<StepOriginProps> = ({
  pickupLocation,
  setPickupLocation,
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
      {destinations.length > 0 && (
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
                setPickupLocation(`${selected.hubName} (${selected.cityProvince})`);
              }
            }}
          >
            <option value="" disabled>Select Saved Origin Hub ({filteredDestinations.length} found)...</option>
            {filteredDestinations.map((d) => (
              <option key={d.id} value={d.id}>
                📍 {d.hubName} — {d.cityProvince}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Origin Pickup Location Card */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          📍 Origin Loading Location
        </div>

        <div className="form-group">
          <label className="form-label">Pickup Origin Warehouse / Facility Address *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Cebu International Port Pier 4 Harbor Yard"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
          />
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
            Specify complete origin address, port dock berth, or distribution warehouse location.
          </div>
        </div>
      </div>
    </div>
  );
};
