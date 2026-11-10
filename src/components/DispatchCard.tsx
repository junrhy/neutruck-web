import React from "react";
import { DispatchJob, TruckVehicle } from "../types";
import { sendWebhookEvent } from "../utils/webhook";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";

interface DispatchCardProps {
  job: DispatchJob;
  vehicles: TruckVehicle[];
  copiedId: string | null;
  onCopyText: (key: string, text: string) => void;
  onUpdateJobStatus: (id: string, status: DispatchJob["deliveryStatus"]) => Promise<void>;
  onOpenLocationModal: (job: DispatchJob) => void;
  onEditJob: (job: DispatchJob) => void;
  onPrintJob: (job: DispatchJob) => void;
  onToggleArchiveJob: (id: string) => Promise<void>;
  onDeleteJob?: (id: string) => Promise<void>;
}

export const DispatchCard: React.FC<DispatchCardProps> = ({
  job: j,
  vehicles,
  copiedId,
  onCopyText,
  onUpdateJobStatus,
  onOpenLocationModal,
  onEditJob,
  onPrintJob,
  onToggleArchiveJob,
  onDeleteJob,
}) => {
  const { user, hasPermission } = useAuth();
  const { showConfirm } = useDialog();
  const canSetInTransit = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("delivery_status_in_transit") || hasPermission("dispatch");
  const canSetDelivered = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("delivery_status_delivered");
  const canSetCancelled = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("delivery_status_cancelled");

  const matchedVehicle = vehicles.find((v) => v.id === j.truckId || v.plateNumber === j.truckPlate);
  const driverPhone = j.driverPhone || matchedVehicle?.driverPhone || "—";
  const enableFuelStep = localStorage.getItem("neutruck_enable_fuel_step") !== "false";
  const enableInspectionStep = localStorage.getItem("neutruck_enable_inspection_step") !== "false";
  const isCopied = copiedId === `driver-${j.id}`;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        padding: "1rem",
        position: "relative",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.65rem",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            📄 {j.waybillNumber}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
            ID: {j.id}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
            Date: {j.dispatchDate || "—"}
          </div>
        </div>

        <span
          className={`badge ${
            j.deliveryStatus === "Delivered"
              ? "badge-success"
              : j.deliveryStatus === "In Transit"
              ? "badge-primary"
              : j.deliveryStatus === "Returning / En Route Garage"
              ? "badge-warning"
              : j.deliveryStatus === "Onboard RoRo"
              ? "badge-primary"
              : j.deliveryStatus === "Port Queueing"
              ? "badge-warning"
              : j.deliveryStatus === "Dispatched"
              ? "badge-warning"
              : j.deliveryStatus === "Pending"
              ? "badge-warning"
              : j.deliveryStatus === "Draft"
              ? "badge-outline"
              : "badge-danger"
          }`}
          style={{ fontSize: "0.78rem", padding: "0.3rem 0.65rem", whiteSpace: "nowrap" }}
        >
          {j.deliveryStatus === "Delivered" && "✅ "}
          {j.deliveryStatus === "In Transit" && "🚚 "}
          {j.deliveryStatus === "Returning / En Route Garage" && "🔄 "}
          {j.deliveryStatus === "Onboard RoRo" && "⛴️ "}
          {j.deliveryStatus === "Port Queueing" && "⚓ "}
          {j.deliveryStatus === "Dispatched" && "📦 "}
          {j.deliveryStatus === "Pending" && "⏳ "}
          {j.deliveryStatus === "Draft" && "📝 "}
          {j.deliveryStatus === "Cancelled" && "🔴 "}
          {j.deliveryStatus}
        </span>
      </div>

      {/* Main Details Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", flex: 1 }}>
        {/* Client & Assigned Truck */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
            👤 Client: <strong>{j.clientName}</strong>
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            <div>
              🚚 Assigned Truck: <strong style={{ color: "var(--primary)" }}>{j.truckPlate}</strong>
            </div>
            {matchedVehicle?.modelType && (
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 500, paddingLeft: "1.35rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span>🏷️ {matchedVehicle.modelType}</span>
                {matchedVehicle.capacityTons > 0 && (
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", opacity: 0.85, fontWeight: 600 }}>
                    ({matchedVehicle.capacityTons}T Capacity)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Connected Dots Route Details */}
        <div style={{ display: "flex", gap: "0.65rem", background: "rgba(0,0,0,0.15)", padding: "0.55rem 0.75rem", borderLeft: "3px solid var(--primary)", borderRadius: "4px" }}>
          {/* Vertical Connecting Line with Dot Nodes */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "0.25rem", paddingBottom: "0.25rem" }}>
            {/* Origin Dot (Cyan Ring) */}
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2.5px solid var(--primary)", background: "var(--bg-main)", flexShrink: 0 }} title="Origin Pickup Point" />
            
            {/* RoRo Ferry Node Dots & Lines (if inter-island) */}
            {j.isInterIsland && (
              j.roroLegs && j.roroLegs.length > 0 ? (
                j.roroLegs.map((leg, idx) => (
                  <React.Fragment key={leg.id || idx}>
                    <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "var(--primary)", margin: "2px 0" }} />
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2.5px solid var(--primary)", background: "var(--primary-alpha)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} title={`Ferry Leg ${idx + 1}: ${leg.originPortName} ↔ ${leg.destinationPortName}`} />
                  </React.Fragment>
                ))
              ) : (
                <>
                  <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "var(--primary)", margin: "2px 0" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2.5px solid var(--primary)", background: "var(--primary-alpha)", flexShrink: 0 }} title="RoRo Ferry Transit Crossing" />
                </>
              )
            )}

            <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "linear-gradient(to bottom, var(--primary), var(--success))", margin: "2px 0" }} />

            {/* Multi-Stop Dropoff Dots or Single Dropoff Dot */}
            {j.dropoffStops && j.dropoffStops.length > 0 ? (
              j.dropoffStops.map((stop, idx) => (
                <React.Fragment key={stop.id || idx}>
                  {/* Intermediate Ferry Leg Dot if this stop requires a ferry passage before it */}
                  {stop.roroLeg && (
                    <>
                      <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "var(--primary)", margin: "2px 0" }} />
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2.5px solid var(--primary)", background: "var(--primary-alpha)", flexShrink: 0 }} title={`Ferry Passage before Stop #${idx + 1}: ${stop.roroLeg.originPortName} ↔ ${stop.roroLeg.destinationPortName}`} />
                    </>
                  )}
                  <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "var(--success)", margin: "2px 0" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: stop.isDelivered ? "var(--success)" : "rgba(16, 185, 129, 0.4)", border: "2px solid var(--success)", flexShrink: 0 }} title={`Stop ${idx + 1}: ${stop.locationName}`} />
                </React.Fragment>
              ))
            ) : (
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} title="Destination Dropoff Point" />
            )}

            {/* Optional Return Trip Connecting Line & Dot */}
            {j.hasReturnTrip && (
              <>
                <div style={{ width: "2px", flex: 1, minHeight: "14px", background: "linear-gradient(to bottom, var(--success), var(--warning))", margin: "2px 0" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2.5px solid var(--warning)", background: "var(--bg-main)", flexShrink: 0 }} title="Return Trip Destination" />
              </>
            )}
          </div>

          {/* Route Text Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1, fontSize: "0.83rem", lineHeight: "1.3" }}>
            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>Origin</span>
              <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{j.pickupLocation}</span>
            </div>

            {j.isInterIsland && (
              j.roroLegs && j.roroLegs.length > 0 ? (
                j.roroLegs.map((leg, idx) => (
                  <div key={leg.id || idx}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                      RoRo Ferry Leg #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {leg.originPortName} ↔ {leg.destinationPortName}
                      {leg.shippingLine && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>({leg.shippingLine})</span>}
                    </span>
                  </div>
                ))
              ) : (
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>RoRo Ferry Route</span>
                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{j.roroRoute}</span>
                </div>
              )
            )}

            {/* Dropoff Stops Listing with Interleaved RoRo Legs */}
            {j.dropoffStops && j.dropoffStops.length > 0 ? (
              j.dropoffStops.map((stop, idx) => (
                <React.Fragment key={stop.id || idx}>
                  {stop.roroLeg && (
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                        RoRo Ferry Passage (before Stop #{idx + 1})
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                        {stop.roroLeg.originPortName} ↔ {stop.roroLeg.destinationPortName}
                        {stop.roroLeg.shippingLine && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>({stop.roroLeg.shippingLine})</span>}
                      </span>
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                      Dropoff Stop #{idx + 1} {stop.isDelivered ? "✅" : ""}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{stop.locationName}</span>
                    {stop.cargoNotes && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        📦 {stop.cargoNotes}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))
            ) : (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>Dropoff Destination</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{j.dropoffLocation}</span>
              </div>
            )}

            {j.hasReturnTrip && (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>Return Trip</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {j.returnDestination || "Home Base Garage"} <span style={{ fontSize: "0.72rem", opacity: 0.85, color: "var(--text-muted)" }}>({j.returnCargoType || "Deadhead"})</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Current Position */}
        {j.currentLocation && (
          <div style={{ padding: "0.35rem 0.55rem", background: "var(--location-bg)", border: "1px solid var(--location-border)", borderRadius: "4px" }}>
            <div style={{ fontSize: "0.76rem", color: "var(--primary)", fontWeight: 700 }}>
              📍 Current Position: {j.currentLocation}
            </div>
            {j.lastLocationUpdate && (
              <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.1rem" }}>
                ⏱️ {j.lastLocationUpdate}
              </div>
            )}
          </div>
        )}

        {/* Structured Bottom Section: Driver, Cargo & Financial Fees */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px dashed var(--border)", paddingTop: "0.6rem" }}>
          {/* Driver Info & Cargo Badge Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "rgba(255, 255, 255, 0.02)", padding: "0.55rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
              {/* Primary Driver */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>Driver:</span>
                  <span>{j.driverName}</span>
                </div>
              </div>

              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "0.3rem", paddingLeft: "1.15rem" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>{driverPhone}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ padding: "0.08rem 0.25rem", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, marginLeft: "0.15rem" }}
                  title={`Copy Driver Contact: ${j.driverName} - ${driverPhone}`}
                  onClick={() => onCopyText(`driver-${j.id}`, `${j.driverName} - ${driverPhone}`)}
                >
                  {isCopied ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>

              {/* Driver Assistant / Helper */}
              {j.helperName && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginTop: "0.2rem", paddingTop: "0.35rem", borderTop: "1px dashed var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="17" y1="11" x2="23" y2="11"></line>
                    </svg>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>Helper:</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)" }}>{j.helperName}</span>
                  </div>
                  {j.helperPhone && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "0.3rem", paddingLeft: "1.15rem" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      <span>{j.helperPhone}</span>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: "0.08rem 0.25rem", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1, marginLeft: "0.15rem" }}
                        title={`Copy Helper Contact: ${j.helperName} - ${j.helperPhone}`}
                        onClick={() => onCopyText(`helper-${j.id}`, `${j.helperName} - ${j.helperPhone}`)}
                      >
                        {copiedId === `helper-${j.id}` ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
              {j.loadStatus === "Empty" && (
                <span className="badge badge-warning" style={{ fontSize: "0.68rem", padding: "0.18rem 0.45rem", fontWeight: 700 }}>
                  🚚 Empty Haul
                </span>
              )}
              {(j.vanSize || j.weightTons) && (
                <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "0.2rem 0.45rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v18M3 7h18M6 12l-3 6h6l-3-6zM18 12l-3 6h6l-3-6z"/>
                  </svg>
                  {j.vanSize ? `${j.vanSize}${j.weightTons ? ` (${j.weightTons}T)` : ""}` : `${j.weightTons} Tons`}
                </span>
              )}
              {j.isInterIsland && (
                <span className="badge badge-warning" style={{ fontSize: "0.68rem", padding: "0.18rem 0.4rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7M12 10V4m-3 3h6"/>
                  </svg>
                  Sea Transit
                </span>
              )}
            </div>
          </div>

          {/* Full-Width Cargo Spec & Freight Financial Box */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", background: "rgba(0, 212, 255, 0.04)", padding: "0.75rem 0.85rem", borderRadius: "8px", border: "1px dashed var(--primary)" }}>
            {/* Cargo Description (Full Width) */}
            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", display: "block", marginBottom: "0.2rem" }}>
                Cargo Description
              </span>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)", lineHeight: "1.35", wordBreak: "break-word" }}>
                {j.cargoDescription}
              </div>
            </div>

            {/* Row 1: Gross Freight Fee */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: "0.55rem", marginTop: "0.1rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                Gross Freight Fee
              </span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--success)" }}>
                  ₱{j.freightFee.toLocaleString()}
                </span>
                {j.hasReturnTrip && (j.returnFreightFee || 0) > 0 && (
                  <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700, marginLeft: "0.4rem" }}>
                    (+₱{(j.returnFreightFee || 0).toLocaleString()} Backhaul)
                  </span>
                )}
              </div>
            </div>

            {/* Equipment & Container Specs */}
            {(j.containerNumber || j.trailerNumber || j.sealNumber) && (
              <div style={{ fontSize: "0.72rem", background: "rgba(0, 212, 255, 0.05)", border: "1px solid var(--primary-alpha)", padding: "0.25rem 0.45rem", borderRadius: "4px", marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {j.containerNumber && <div>📦 Cont: <strong style={{ color: "var(--primary)" }}>{j.containerNumber}</strong></div>}
                {j.trailerNumber && <div>🚛 Trailer: <strong style={{ color: "var(--text-main)" }}>{j.trailerNumber}</strong></div>}
                {j.sealNumber && <div>🔒 Seal: <strong style={{ color: "var(--success)" }}>{j.sealNumber}</strong></div>}
              </div>
            )}



            {/* Pre-Trip Safety Checklist & Fuel Management Badges */}
            {((enableFuelStep && j.fuelManagement) || (enableInspectionStep && j.truckUnitChecklist)) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.2rem" }}>
                {enableFuelStep && j.fuelManagement && (
                  <div style={{ fontSize: "0.71rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span>⛽ Initial Fuel:</span>
                    <strong style={{ color: "var(--primary)" }}>
                      {j.fuelManagement.initialFuelLevelPercent ?? 0}% ({j.fuelManagement.initialLiters ?? 0} L)
                    </strong>
                  </div>
                )}
                {enableInspectionStep && j.truckUnitChecklist && (
                  <div style={{ fontSize: "0.68rem", display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                    <span style={{ color: j.truckUnitChecklist.tires === "OK" ? "var(--success)" : "var(--warning)", fontWeight: 700 }}>🛞 Tires:{j.truckUnitChecklist.tires}</span>
                    <span style={{ color: j.truckUnitChecklist.brakes === "OK" ? "var(--success)" : "var(--warning)", fontWeight: 700 }}>🛑 Brakes:{j.truckUnitChecklist.brakes}</span>
                    <span style={{ color: j.truckUnitChecklist.lights === "OK" ? "var(--success)" : "var(--warning)", fontWeight: 700 }}>💡 Lights:{j.truckUnitChecklist.lights}</span>
                  </div>
                )}
              </div>
            )}

            {/* Trip Expenses Subtitle Section */}
            <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                Trip Expenses
              </div>

              {/* Row 2: Driver Rate / Allowance */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", paddingLeft: "0.4rem" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Driver Rate / Allowance</span>
                <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                  ₱{(j.driverRate || 0).toLocaleString()}
                </span>
              </div>

              {(j.helperCommission || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", paddingLeft: "0.4rem" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Helper Commission</span>
                  <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                    ₱{(j.helperCommission || 0).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Row 3: Fuel Allowance */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", paddingLeft: "0.4rem" }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Fuel Allowance</span>
                <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                  ₱{(j.fuelAllowance || 0).toLocaleString()}
                  {j.hasReturnTrip && (j.returnFuelAllowance || 0) > 0 && (
                    <span style={{ color: "var(--text-dim)", marginLeft: "0.25rem", fontWeight: 500 }}>
                      (+₱{(j.returnFuelAllowance || 0).toLocaleString()} Ret)
                    </span>
                  )}
                </span>
              </div>

              {/* Row 3: RoRo Ticket Fees */}
              {(() => {
                const multiStopRoroSum = (j.dropoffStops || []).reduce((sum, st) => sum + (st.roroLeg?.ticketFee || 0), 0);
                const totalRoro = (j.roroTicketFee || 0) + multiStopRoroSum;
                const returnRoro = j.hasReturnTrip ? (j.returnRoroTicketFee || 0) : 0;
                if (totalRoro > 0 || returnRoro > 0) {
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem", paddingLeft: "0.4rem" }}>
                      <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>RoRo Ticket</span>
                      <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                        ₱{totalRoro.toLocaleString()}
                        {returnRoro > 0 && <span style={{ color: "var(--text-dim)", marginLeft: "0.25rem", fontWeight: 500 }}> (+₱{returnRoro.toLocaleString()} Ret)</span>}
                      </span>
                    </div>
                  );
                }
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.74rem", paddingLeft: "0.4rem", color: "var(--text-dim)" }}>
                    <span>RoRo Ticket</span>
                    <span>None (Direct Land)</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div
        className="card-footer"
        style={{
          background: "rgba(0, 0, 0, 0.22)",
          borderTop: "1px solid var(--border)",
          margin: "0.5rem -1rem -1rem -1rem",
          marginTop: "auto",
          padding: "0.75rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Update Status:
          </span>
          <select
            className="form-select"
            disabled={!user}
            title={!user ? "Login required to update dispatch status" : "Update dispatch delivery status"}
            style={{ padding: "0.3rem 0.5rem", fontSize: "0.78rem", flex: 1, fontWeight: 700, opacity: user ? 1 : 0.65, cursor: user ? "pointer" : "not-allowed" }}
            value={j.deliveryStatus}
            onChange={(e) => {
              const newStatus = e.target.value as DispatchJob["deliveryStatus"];
              onUpdateJobStatus(j.id, newStatus);
              sendWebhookEvent("dispatch.updated", { id: j.id, waybill: j.waybillNumber, status: newStatus });
            }}
          >
            {j.deliveryStatus === "Draft" && <option value="Draft">📝 Draft</option>}
            <option value="Pending">⏳ Pending (Booking)</option>
            <option value="Dispatched">📦 Dispatched</option>
            <option value="Port Queueing" disabled={!canSetInTransit}>{canSetInTransit ? "⚓ Port Withdrawal (Queueing)" : "🔒 Port Withdrawal"}</option>
            <option value="Onboard RoRo" disabled={!canSetInTransit}>{canSetInTransit ? "⛴️ Onboard RoRo" : "🔒 Onboard RoRo"}</option>
            <option value="In Transit" disabled={!canSetInTransit}>{canSetInTransit ? "🚚 In Transit (Delivery)" : "🔒 In Transit"}</option>
            <option value="Returning / En Route Garage">{canSetInTransit ? "🟠 Empty Pull Out (Returning)" : "🔒 Empty Pull Out"}</option>
            <option value="Delivered" disabled={!canSetDelivered}>{canSetDelivered ? "💚 Yard Gate In (Delivered)" : "🔒 Yard Gate In (Locked)"}</option>
            <option value="Cancelled" disabled={!canSetCancelled}>{canSetCancelled ? "🔴 Cancelled" : "🔒 Cancelled (Locked)"}</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", justifyContent: "flex-start" }}>
          {user && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}
              title="Log Current Location Checkpoint"
              onClick={() => onOpenLocationModal(j)}
            >
              📍 Position
            </button>
          )}
          {user && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}
              title="Edit Dispatch Record Details"
              onClick={() => onEditJob(j)}
            >
              ✏️ Edit
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}
            title="Print Official Freight Ticket"
            onClick={() => onPrintJob(j)}
          >
            📄 Print
          </button>
          {user && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}
              title={j.isArchived ? "Restore to Active" : "Archive Dispatch Record"}
              onClick={() => onToggleArchiveJob(j.id)}
            >
              {j.isArchived ? "📂 Unarchive" : "📦 Archive"}
            </button>
          )}
          {user && (j.deliveryStatus === "Cancelled" || j.isArchived) && onDeleteJob && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              style={{ padding: "0.2rem 0.4rem", fontSize: "0.72rem" }}
              title="Delete Dispatch Record"
              onClick={async () => {
                const confirmed = await showConfirm(`Are you sure you want to delete waybill ${j.waybillNumber}?`, "Delete Dispatch Record");
                if (confirmed) {
                  onDeleteJob(j.id);
                  sendWebhookEvent("dispatch.deleted", { id: j.id, waybill: j.waybillNumber });
                }
              }}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
