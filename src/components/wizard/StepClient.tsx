import React from "react";
import { ClientShipper } from "../../types";

interface StepClientProps {
  clients?: ClientShipper[];
  clientSearch?: string;
  setClientSearch?: (val: string) => void;
  clientName: string;
  setClientName: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  waybillNumber: string;
  setWaybillNumber: (val: string) => void;
  dispatchDate?: string;
  setDispatchDate?: (val: string) => void;
  setPickupLocation?: (val: string) => void;
  cargoDescription?: string;
  setCargoDescription?: (val: string) => void;
  weightTons?: number | string;
  setWeightTons?: (val: number | string) => void;
  containerNumber?: string;
  setContainerNumber?: (val: string) => void;
  trailerNumber?: string;
  setTrailerNumber?: (val: string) => void;
  sealNumber?: string;
  setSealNumber?: (val: string) => void;
}

export const StepClient: React.FC<StepClientProps> = ({
  clients = [],
  clientSearch = "",
  setClientSearch,
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  waybillNumber,
  setWaybillNumber,
  dispatchDate,
  setDispatchDate,
  setPickupLocation,
}) => {
  const filteredClients = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.contactPhone.includes(clientSearch)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Auto-Fill Selector */}
      {clients.length > 0 && (
        <div style={{ padding: "0.45rem 0.75rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
            ⚡ Auto Fill:
          </span>
          {setClientSearch && (
            <input
              type="text"
              className="form-input"
              style={{ width: "150px", fontSize: "0.78rem", padding: "0.35rem 0.6rem" }}
              placeholder="🔍 Search client..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          )}
          <select
            className="form-select"
            style={{ flex: 1, minWidth: "200px", fontSize: "0.78rem", padding: "0.35rem 1.8rem 0.35rem 0.6rem" }}
            defaultValue=""
            onChange={(e) => {
              const selected = clients.find((c) => c.id === e.target.value);
              if (selected) {
                setClientName(selected.companyName);
                setClientPhone(selected.contactPhone || "");
                if (selected.defaultPickupLocation && setPickupLocation) {
                  setPickupLocation(selected.defaultPickupLocation);
                }
              }
            }}
          >
            <option value="" disabled>Select Saved Shipper / Consignee ({filteredClients.length} found)...</option>
            {filteredClients.map((c) => (
              <option key={c.id} value={c.id}>
                🏢 {c.companyName} ({c.contactPerson} — {c.contactPhone})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Client Shipper Information Card */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          🏢 Client &amp; Consignee Details
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Client / Shipper / Consignee Company Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. San Miguel Brewery Corp."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Client Contact Phone Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 09171234567"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ticket Serial Identification Card */}
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          📄 Dispatch Date & Serial Number
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Dispatch Date &amp; Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={
                dispatchDate
                  ? dispatchDate.includes("T")
                    ? dispatchDate.substring(0, 16)
                    : dispatchDate.replace(" ", "T").substring(0, 16)
                  : ""
              }
              onChange={(e) => {
                if (setDispatchDate) {
                  setDispatchDate(e.target.value.replace("T", " "));
                }
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Waybill Serial Number *</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={waybillNumber}
                onChange={(e) => setWaybillNumber(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setWaybillNumber(`WB-${Math.floor(10000 + Math.random() * 90000)}`)}
              >
                🎲 Auto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
