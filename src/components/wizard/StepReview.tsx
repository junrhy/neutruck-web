import React from "react";
import { DropoffStop, TruckVehicle } from "../../types";

type ChecklistStatus = "OK" | "Needs Attention" | "Not Checked";
type FreightTerms = "Per Metric Ton (W.MT)" | "Revenue Ton (W/M.MT)" | "Liner Terms / Discharge (L.D)" | "Free In / Liner Out (FLT)" | "Free In and Out (FIO)" | "FIOST" | "Per Trip Flat Rate";

interface StepReviewProps {
  clientName: string;
  clientPhone: string;
  waybillNumber: string;
  dispatchDate?: string;
  selectedTruckId: string;
  vehicles: TruckVehicle[];
  pickupLocation: string;
  dropoffLocation: string;
  dropoffStops: DropoffStop[];
  weightTons: number | string;
  freightFee: number | string;
  freightBillingTerms?: FreightTerms | "";
  loadStatus?: "Loaded" | "Empty";
  fuelAllowance: number | string;
  driverRate: number | string;
  helperCommission: number | string;
  containerNumber: string;
  trailerNumber: string;
  sealNumber: string;
  initialFuelLevelPercent: number | string;
  initialLiters: number | string;
  fuelCardNumber: string;
  checklistTires: ChecklistStatus;
  checklistLights: ChecklistStatus;
  checklistOil: ChecklistStatus;
  checklistBrakes: ChecklistStatus;
  checklistBattery: ChecklistStatus;
  checklistWater: ChecklistStatus;
  checklistNotes: string;
  isInterIsland: boolean;
  roroRoute: string;
  shippingLine: string;
  roroTicketFee: number;
  hasReturnTrip: boolean;
  returnDestination: string;
  returnCargoType: string;
  returnFreightFee: number | string;
  returnFuelAllowance: number | string;
  returnRoroTicketFee: number | string;
}

export const StepReview: React.FC<StepReviewProps> = ({
  clientName,
  clientPhone,
  waybillNumber,
  dispatchDate,
  selectedTruckId,
  vehicles,
  pickupLocation,
  dropoffLocation,
  dropoffStops,
  weightTons,
  freightFee,
  freightBillingTerms,
  loadStatus,
  fuelAllowance,
  driverRate,
  helperCommission,
  containerNumber,
  trailerNumber,
  sealNumber,
  initialFuelLevelPercent,
  initialLiters,
  fuelCardNumber,
  checklistTires,
  checklistLights,
  checklistOil,
  checklistBrakes,
  checklistBattery,
  checklistWater,
  checklistNotes,
  isInterIsland,
  roroRoute,
  shippingLine,
  roroTicketFee,
  hasReturnTrip,
  returnDestination,
  returnCargoType,
  returnFreightFee,
  returnFuelAllowance,
  returnRoroTicketFee,
}) => {
  const matchedTruck = vehicles.find((v) => v.id === selectedTruckId);

  // Financial Calculations
  const grossRevenue = (Number(freightFee) || 0) + (hasReturnTrip ? (Number(returnFreightFee) || 0) : 0);
  const totalRoroFee = (isInterIsland ? Number(roroTicketFee || 0) + dropoffStops.reduce((s, st) => s + (st.roroLeg?.ticketFee || 0), 0) : 0) + (hasReturnTrip ? Number(returnRoroTicketFee || 0) : 0);
  const totalExpenses = (Number(fuelAllowance) || 0) + (Number(driverRate) || 0) + (Number(helperCommission) || 0) + totalRoroFee + (hasReturnTrip ? (Number(returnFuelAllowance) || 0) : 0);
  const estNetProfit = grossRevenue - totalExpenses;
  const marginPercent = grossRevenue > 0 ? ((estNetProfit / grossRevenue) * 100).toFixed(1) : "0.0";

  // Capacity Calculation
  const capacityTons = matchedTruck?.capacityTons || 0;
  const currentWeight = Number(weightTons) || 0;
  const loadPercentage = capacityTons > 0 ? Math.min(Math.round((currentWeight / capacityTons) * 100), 150) : 0;
  const isOverloaded = capacityTons > 0 && currentWeight > capacityTons;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. Trip Net Profit & Revenue Economics Banner */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: estNetProfit >= 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
          borderRadius: "10px",
          border: `1px solid ${estNetProfit >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)" }}>
            📊 Estimated Trip Financial Economics
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: estNetProfit >= 0 ? "var(--success)" : "#ef4444", marginTop: "0.1rem" }}>
            Estimated Net Profit: ₱{estNetProfit.toLocaleString()} ({marginPercent}% Margin)
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8rem" }}>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.7rem" }}>TOTAL REVENUE</span>
            <strong style={{ color: "var(--success)" }}>₱{grossRevenue.toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.7rem" }}>TOTAL EXPENSES</span>
            <strong style={{ color: "#f59e0b" }}>₱{totalExpenses.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* 2. Main Summary Card */}
      <div
        style={{
          padding: "1.25rem",
          background: "var(--bg-main)",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "var(--primary)",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "0.5rem",
          }}
        >
          📋 DISPATCH TICKET PRE-ISSUANCE SUMMARY REVIEW
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", fontSize: "0.85rem" }}>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>CLIENT / SHIPPER / CONSIGNEE</span>
            <strong>{clientName || "Not Set"}</strong>
            {clientPhone && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>📞 {clientPhone}</div>}
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>WAYBILL TICKET NO. &amp; DATE</span>
            <strong style={{ color: "var(--primary)" }}>{waybillNumber}</strong>
            {dispatchDate && <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>📅 {dispatchDate}</div>}
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>ASSIGNED TRUCK &amp; CREW</span>
            <strong>🚛 {matchedTruck?.plateNumber || "Not Selected"}</strong>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              👨‍✈️ Driver: <strong>{matchedTruck?.driverName || "Unassigned"}</strong> {matchedTruck?.driverPhone ? `(📞 ${matchedTruck.driverPhone})` : ""}
            </div>
            {matchedTruck?.helperName && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.1rem" }}>
                🧑‍🔧 Helper: {matchedTruck.helperName} {matchedTruck.helperPhone ? `(📞 ${matchedTruck.helperPhone})` : ""}
              </div>
            )}
          </div>

          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>PICKUP ORIGIN</span>
            <strong>{pickupLocation || "Not Set"}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>DROPOFF DESTINATION</span>
            <strong>
              {dropoffStops.length > 0 ? `${dropoffStops.length} Dropoff Stops Route` : dropoffLocation || "Not Set"}
            </strong>
          </div>

          {/* Payload Utilization Meter Column */}
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>CARGO WEIGHT &amp; PAYLOAD LOAD</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.1rem" }}>
              <strong>{currentWeight} Tons</strong>
              {capacityTons > 0 && <span style={{ fontSize: "0.75rem", color: isOverloaded ? "#ef4444" : "var(--text-dim)" }}>/ {capacityTons}T Cap</span>}
            </div>
            {capacityTons > 0 && (
              <div style={{ marginTop: "0.35rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "0.15rem", fontWeight: 700, color: isOverloaded ? "#ef4444" : "var(--primary)" }}>
                  <span>{loadPercentage}% Loaded</span>
                  {isOverloaded && <span>⚠️ OVERLOADED!</span>}
                </div>
                <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(loadPercentage, 100)}%`,
                      background: isOverloaded ? "#ef4444" : loadPercentage > 90 ? "#f59e0b" : "var(--primary)",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>GROSS FREIGHT CHARGE</span>
            <strong style={{ color: "var(--success)" }}>₱{Number(freightFee || 0).toLocaleString()}</strong>
            {freightBillingTerms && (
              <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600, marginTop: "0.1rem" }}>
                🏷️ {freightBillingTerms}
              </div>
            )}
            {loadStatus === "Empty" && (
              <div style={{ fontSize: "0.72rem", color: "var(--amber)", fontWeight: 600, marginTop: "0.1rem" }}>
                🚚 Empty
              </div>
            )}
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>FUEL ALLOWANCE</span>
            <strong>₱{Number(fuelAllowance || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>DRIVER COMMISSION</span>
            <strong>₱{Number(driverRate || 0).toLocaleString()}</strong>
          </div>

          {(Number(helperCommission) || 0) > 0 && (
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>HELPER COMMISSION</span>
              <strong>₱{Number(helperCommission).toLocaleString()}</strong>
            </div>
          )}
          {(containerNumber || trailerNumber || sealNumber) && (
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>CONTAINER / TRAILER / SEAL</span>
              <strong style={{ fontSize: "0.8rem", color: "var(--primary)" }}>
                {[
                  containerNumber && `Cont: ${containerNumber}`,
                  trailerNumber && `Trl: ${trailerNumber}`,
                  sealNumber && `Seal: ${sealNumber}`,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </strong>
            </div>
          )}
          <div>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>INITIAL FUEL MANAGEMENT</span>
            <strong style={{ fontSize: "0.8rem" }}>
              ⛽ {initialFuelLevelPercent}% ({initialLiters} L){fuelCardNumber ? ` | PO: ${fuelCardNumber}` : ""}
            </strong>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
              PRE-TRIP SAFETY CHECKLIST
            </span>
            <div
              style={{
                fontSize: "0.78rem",
                display: "flex",
                gap: "0.8rem",
                flexWrap: "wrap",
                background: "rgba(0,0,0,0.2)",
                padding: "0.4rem 0.65rem",
                borderRadius: "4px",
                border: "1px solid var(--border)",
              }}
            >
              <span>🛞 Tires: <strong>{checklistTires}</strong></span>
              <span>💡 Lights: <strong>{checklistLights}</strong></span>
              <span>🛢️ Oil: <strong>{checklistOil}</strong></span>
              <span>🛑 Brakes: <strong>{checklistBrakes}</strong></span>
              <span>🔋 Battery: <strong>{checklistBattery}</strong></span>
              <span>💧 Water/Coolant: <strong>{checklistWater}</strong></span>
              {checklistNotes && <span style={{ color: "var(--warning)", width: "100%" }}>📝 Notes: {checklistNotes}</span>}
            </div>
          </div>
        </div>

        {/* Multi-Stop Route Breakout in Summary */}
        {dropoffStops.length > 0 && (
          <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "0.75rem", fontSize: "0.82rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "var(--primary)",
                marginBottom: "0.4rem",
                textTransform: "uppercase",
              }}
            >
              🛑 Multi-Stop Dropoff Route Breakdown ({dropoffStops.length} Stops):
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {dropoffStops.map((stop, idx) => (
                <div
                  key={stop.id || idx}
                  style={{
                    color: "var(--text-main)",
                    background: "rgba(255,255,255,0.02)",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <strong>Stop #{idx + 1}:</strong> {stop.locationName || "Unnamed Stop"}{" "}
                  {stop.cargoNotes && <span style={{ color: "var(--text-dim)", fontSize: "0.76rem" }}>({stop.cargoNotes})</span>}
                  {stop.roroLeg && (
                    <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "0.15rem" }}>
                      🚢 Ferry Crossing: <strong>{stop.roroLeg.originPortName} ➔ {stop.roroLeg.destinationPortName}</strong>{" "}
                      {stop.roroLeg.shippingLine ? `(${stop.roroLeg.shippingLine})` : ""}{" "}
                      {stop.roroLeg.ticketFee ? `— ₱${stop.roroLeg.ticketFee.toLocaleString()}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inter-Island RoRo Passage Summary */}
        {isInterIsland && (
          <div
            style={{
              marginTop: "0.25rem",
              padding: "0.75rem 1rem",
              background: "rgba(0, 212, 255, 0.05)",
              borderRadius: "6px",
              border: "1px dashed var(--primary)",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "var(--primary)" }}>⛴️ Inter-Island RoRo Sea Passages</strong>
              <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                Total Ferry Budget: ₱
                {(
                  Number(roroTicketFee || 0) +
                  dropoffStops.reduce((s, st) => s + (st.roroLeg?.ticketFee || 0), 0)
                ).toLocaleString()}
              </span>
            </div>

            {roroRoute && (
              <div style={{ color: "var(--text-main)" }}>
                🚢 Primary Sea Crossing: <strong>{roroRoute}</strong> {shippingLine ? `(${shippingLine})` : ""}{" "}
                {roroTicketFee ? `— ₱${roroTicketFee.toLocaleString()}` : ""}
              </div>
            )}

            {dropoffStops
              .filter((s) => s.roroLeg)
              .map((s, idx) => (
                <div key={s.id || idx} style={{ color: "var(--text-main)" }}>
                  🚢 Ferry Crossing before {s.locationName}:{" "}
                  <strong>
                    {s.roroLeg?.originPortName} ➔ {s.roroLeg?.destinationPortName}
                  </strong>{" "}
                  {s.roroLeg?.shippingLine ? `(${s.roroLeg.shippingLine})` : ""}{" "}
                  {s.roroLeg?.ticketFee ? `— ₱${s.roroLeg.ticketFee.toLocaleString()}` : ""}
                </div>
              ))}
          </div>
        )}

        {/* Return Trip Summary */}
        {hasReturnTrip && (
          <div
            style={{
              marginTop: "0.25rem",
              padding: "0.75rem 1rem",
              borderRadius: "6px",
              border: "1px dashed var(--primary)",
              fontSize: "0.82rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "var(--primary)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              RETURN TRIP &amp; BACKHAUL ROUTE SUMMARY
            </div>
            <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
              {returnDestination || "Home Base Garage"}{" "}
              <span style={{ fontWeight: 500, color: "var(--text-dim)" }}>({returnCargoType || "Deadhead"})</span>
            </div>
            {((Number(returnFuelAllowance) || 0) > 0 ||
              (Number(returnRoroTicketFee) || 0) > 0 ||
              (Number(returnFreightFee) || 0) > 0) && (
              <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginTop: "0.15rem", display: "flex", gap: "1rem" }}>
                {(Number(returnFreightFee) || 0) > 0 && (
                  <span>
                    💰 Backhaul Revenue:{" "}
                    <strong style={{ color: "var(--success)" }}>₱{Number(returnFreightFee).toLocaleString()}</strong>
                  </span>
                )}
                {(Number(returnFuelAllowance) || 0) > 0 && (
                  <span>
                    ⛽ Return Fuel: <strong>₱{Number(returnFuelAllowance).toLocaleString()}</strong>
                  </span>
                )}
                {(Number(returnRoroTicketFee) || 0) > 0 && (
                  <span>
                    ⛴️ Return RoRo Ticket: <strong>₱{Number(returnRoroTicketFee).toLocaleString()}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
