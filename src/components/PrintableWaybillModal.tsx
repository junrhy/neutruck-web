import { DispatchJob, TruckVehicle } from "../types";

interface PrintableWaybillModalProps {
  job: DispatchJob;
  vehicle?: TruckVehicle;
  companyName: string;
  companyLogo?: string;
  onClose: () => void;
}

export default function PrintableWaybillModal({
  job,
  vehicle,
  companyName,
  companyLogo = "",
  onClose,
}: PrintableWaybillModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-modal-overlay">
      <div className="printable-modal-container">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>📄 Official Printable Waybill Ticket ({job.waybillNumber})</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print Waybill / Bill of Lading
            </button>
            <button className="btn btn-outline" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Ticket Content Area */}
        <div className="printable-ticket" id="waybill-ticket">
          {/* Header Branding */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {companyLogo && (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  style={{ maxHeight: "65px", maxWidth: "140px", objectFit: "contain", borderRadius: "4px" }}
                />
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: "1.6rem", textTransform: "uppercase", letterSpacing: "1px", color: "#000" }}>
                  {companyName}
                </h1>
                <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 600, marginTop: "0.2rem" }}>
                  OFFICIAL FREIGHT WAYBILL &amp; BILL OF LADING
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  Inter-Island Cargo &amp; Heavy Hauling Logistics System
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#000", fontFamily: "monospace" }}>
                {job.waybillNumber}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#555", marginTop: "0.25rem" }}>
                Dispatch Date: <strong>{job.dispatchDate}</strong>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#555" }}>
                Job Ref ID: <span style={{ fontFamily: "monospace" }}>{job.id}</span>
              </div>
            </div>
          </div>

          {/* Shipper & Consignee Route Information */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: "#666", marginBottom: "0.5rem" }}>
                CLIENT SHIPPER DETAILS
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#000" }}>{job.clientName}</div>
              {job.clientPhone && <div style={{ fontSize: "0.85rem", color: "#333", marginTop: "0.2rem" }}>📞 Phone: {job.clientPhone}</div>}
              <div style={{ fontSize: "0.85rem", color: "#333", marginTop: "0.5rem" }}>
                📍 <strong>ORIGIN PICKUP:</strong> {job.pickupLocation}
              </div>
            </div>

            <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: "#666", marginBottom: "0.5rem" }}>
                CONSIGNEE DROP-OFF LOCATION
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#000" }}>
                ➔ {job.dropoffStops && job.dropoffStops.length > 0 ? `${job.dropoffStops.length} Dropoff Stops Route` : job.dropoffLocation}
              </div>

              {/* 1. Primary RoRo Sea Passage (Initial Sea Crossing after Origin) */}
              {job.isInterIsland && (job.roroRoute || (job.roroLegs && job.roroLegs.length > 0)) && (
                <div style={{ marginTop: "0.6rem" }}>
                  {job.roroLegs && job.roroLegs.length > 0 ? (
                    <div style={{ fontSize: "0.8rem", background: "#f0f9ff", color: "#0369a1", padding: "0.48rem 0.65rem", borderRadius: "4px", border: "1px solid #bae6fd" }}>
                      <strong>🚢 Primary RoRo Passage Itinerary ({job.roroLegs.length} Legs):</strong>
                      <div style={{ marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        {job.roroLegs.map((leg, idx) => (
                          <div key={leg.id || idx}>
                            Leg #{idx + 1}: <strong>{leg.originPortName} ➔ {leg.destinationPortName}</strong> {leg.shippingLine ? `(${leg.shippingLine})` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : job.roroRoute ? (
                    <div style={{ fontSize: "0.8rem", color: "#0369a1", padding: "0.4rem 0.6rem", background: "#f0f9ff", borderRadius: "4px", border: "1px solid #bae6fd" }}>
                      🚢 <strong>Primary RoRo Passage:</strong> {job.roroRoute} {job.shippingLine ? `(${job.shippingLine})` : ""}
                    </div>
                  ) : null}
                </div>
              )}

              {/* 2. Multi-Stop Dropoff Route (with per-stop ferry legs interleaved) */}
              {job.dropoffStops && job.dropoffStops.length > 0 && (
                <div style={{ marginTop: "0.6rem", borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#475569", marginBottom: "0.3rem" }}>
                    🛑 MULTI-STOP DROPOFF ROUTE ({job.dropoffStops.length} STOPS):
                  </div>
                  {job.dropoffStops.map((stop, idx) => (
                    <div key={stop.id || idx} style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginBottom: "0.35rem" }}>
                      {stop.roroLeg && (
                        <div style={{ fontSize: "0.76rem", background: "#f0f9ff", color: "#0369a1", padding: "0.3rem 0.55rem", borderRadius: "4px", border: "1px solid #bae6fd", marginTop: "0.15rem" }}>
                          🚢 <strong>Ferry Crossing before Stop #{idx + 1}:</strong> {stop.roroLeg.originPortName} ➔ {stop.roroLeg.destinationPortName} {stop.roroLeg.shippingLine ? `(${stop.roroLeg.shippingLine})` : ""}
                        </div>
                      )}
                      <div style={{ fontSize: "0.8rem", color: "#1e293b", padding: "0.1rem 0", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                        <span><strong>Stop #{idx + 1}:</strong> {stop.locationName}</span>
                        {stop.cargoNotes && (
                          <div style={{ fontSize: "0.75rem", color: "#475569", paddingLeft: "0.75rem", fontWeight: 500 }}>
                            📦 {stop.cargoNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {job.hasReturnTrip && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
                  <div style={{ fontSize: "0.82rem", background: "#f8fafc", color: "#0f172a", padding: "0.45rem 0.65rem", borderRadius: "4px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", color: "#475569" }}>
                      🔄 RETURN TRIP &amp; BACKHAUL ROUTE
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                      {job.returnDestination || "Home Base Garage"} <span style={{ fontWeight: 500, color: "#64748b" }}>({job.returnCargoType || "Deadhead"})</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Manifest & Cargo Details */}
          <div style={{ border: "1px solid #ccc", borderRadius: "6px", marginBottom: "1.5rem", overflow: "hidden" }}>
            <div style={{ background: "#f1f5f9", padding: "0.6rem 1rem", fontWeight: 800, fontSize: "0.8rem", textTransform: "uppercase", borderBottom: "1px solid #ccc", color: "#334155" }}>
              VEHICLE &amp; CARGO MANIFEST
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#000" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.6rem 1rem" }}>Assigned Truck &amp; Equipment</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Assigned Crew</th>
                  <th style={{ padding: "0.6rem 1rem" }}>Cargo Payload &amp; Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#000" }}>{job.truckPlate}</div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 500, marginTop: "0.1rem" }}>
                      {vehicle?.modelType || "Heavy Freight Van"}
                    </div>
                    {(job.containerNumber || job.trailerNumber || job.sealNumber) && (
                      <div style={{ fontSize: "0.75rem", color: "#1e293b", marginTop: "0.35rem", padding: "0.25rem 0.4rem", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                        {job.containerNumber && <div>📦 Cont: <strong>{job.containerNumber}</strong></div>}
                        {job.trailerNumber && <div>🚛 Trailer: <strong>{job.trailerNumber}</strong></div>}
                        {job.sealNumber && <div>🔒 Seal: <strong>{job.sealNumber}</strong></div>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                    <div>👨‍✈️ Driver: {job.driverName}</div>
                    {(job.helperName || vehicle?.helperName) && (
                      <div style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 600, marginTop: "0.15rem" }}>
                        🧑‍🔧 Helper: {job.helperName || vehicle?.helperName}
                      </div>
                    )}
                    {job.fuelManagement && (
                      <div style={{ fontSize: "0.74rem", color: "#475569", fontWeight: 600, marginTop: "0.35rem" }}>
                        ⛽ Fuel Tank: {job.fuelManagement.initialFuelLevelPercent}% ({job.fuelManagement.initialLiters} L)
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 700, color: "#000" }}>{job.cargoDescription}</div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 700, marginTop: "0.1rem" }}>
                      {job.vanSize ? `🚚 Size: ${job.vanSize}${job.weightTons ? ` (${job.weightTons} Tons)` : ""}` : (job.weightTons ? `⚖️ Weight: ${job.weightTons} Tons` : "—")}
                    </div>
                    {job.freightBillingTerms && (
                      <div style={{ fontSize: "0.74rem", color: "#0284c7", fontWeight: 700, marginTop: "0.25rem", padding: "0.15rem 0.35rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "3px", display: "inline-block" }}>
                        🏷️ Terms: {job.freightBillingTerms}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Pre-Trip Inspection Certification Bar on Printed Ticket */}
            {job.truckUnitChecklist && (
              <div style={{ padding: "0.5rem 1rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "0.74rem", color: "#334155", display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontWeight: 800 }}>🛠️ PRE-TRIP INSPECTION:</span>
                <span>Tires: <strong>{job.truckUnitChecklist.tires}</strong></span>
                <span>Brakes: <strong>{job.truckUnitChecklist.brakes}</strong></span>
                <span>Lights: <strong>{job.truckUnitChecklist.lights}</strong></span>
                <span>Oil: <strong>{job.truckUnitChecklist.oil}</strong></span>
                {job.truckUnitChecklist.checklistNotes && <span>(Notes: {job.truckUnitChecklist.checklistNotes})</span>}
              </div>
            )}
          </div>

          {/* Signatures & Proof of Delivery (POD) Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginTop: "2rem", paddingTop: "0.5rem", pageBreakInside: "avoid" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ height: "35px" }}></div>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", color: "#000" }}>
                {job.driverName.toUpperCase()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>Assigned Freight Truck Driver Signature</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ height: "35px" }}></div>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", color: "#000" }}>
                CONSIGNEE / RECEIVER SIGNATURE
              </div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>Proof of Delivery (POD) Confirmation &amp; Date Received</div>
            </div>
          </div>

          {/* Footer Notice */}
          <div style={{ textAlign: "center", fontSize: "0.68rem", color: "#94a3b8", marginTop: "1.5rem", borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
            Generated electronically by {companyName} Logistics Engine. Valid for port terminal entry and freight inspections.
          </div>
        </div>
      </div>
    </div>
  );
}
