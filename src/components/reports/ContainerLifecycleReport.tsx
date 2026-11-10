import React, { useState } from "react";
import { DispatchJob } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface ContainerLifecycleReportProps {
  jobs: DispatchJob[];
}

type StageFilter = "all" | "withdrawal" | "delivery" | "pullout" | "gatein";
type ViewMode = "cards" | "table";

const formatMovementDateTime = (dateStr?: string, defaultTime: string = "08:00 AM") => {
  if (!dateStr) return "—";

  const cleanStr = dateStr.includes(" ") && !dateStr.includes("T") ? dateStr.replace(" ", "T") : dateStr;
  const d = new Date(cleanStr);

  if (isNaN(d.getTime())) return dateStr;

  const dateFormatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const hasExplicitTime = dateStr.includes(":") || dateStr.includes("T") || (dateStr.includes(" ") && (dateStr.includes("AM") || dateStr.includes("PM")));

  if (hasExplicitTime) {
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} ${timeFormatted}`;
  }

  return `${dateFormatted} ${defaultTime}`;
};

const parseStageDate = (dateStr?: string, defaultTime: string = "08:00 AM"): Date | null => {
  if (!dateStr) return null;
  const cleanStr = dateStr.includes(" ") && !dateStr.includes("T") ? dateStr.replace(" ", "T") : dateStr;
  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return null;

  const hasExplicitTime = dateStr.includes(":") || dateStr.includes("T") || (dateStr.includes(" ") && (dateStr.includes("AM") || dateStr.includes("PM")));
  if (!hasExplicitTime) {
    const dateOnly = cleanStr.substring(0, 10);
    const time24 = defaultTime.includes("08:00 AM")
      ? "08:00:00"
      : defaultTime.includes("09:30 AM")
      ? "09:30:00"
      : defaultTime.includes("01:00 PM")
      ? "13:00:00"
      : defaultTime.includes("03:30 PM")
      ? "15:30:00"
      : "17:00:00";
    return new Date(`${dateOnly}T${time24}`);
  }

  return d;
};

const getHumanReadableTimeDiff = (startDateStr?: string, endDateStr?: string, startDefault: string = "08:00 AM", endDefault: string = "09:30 AM"): string => {
  const start = parseStageDate(startDateStr, startDefault);
  const end = parseStageDate(endDateStr, endDefault);

  if (!start || !end) return "—";

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return "0 mins";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const mins = diffMinutes % 60;

  let parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

  return parts.join(" ");
};

export const ContainerLifecycleReport: React.FC<ContainerLifecycleReportProps> = ({ jobs }) => {
  const [containerSearch, setContainerSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Filter jobs based on date range, search & stage filter
  const filteredJobs = jobs.filter((j) => {
    // Date Range Filter
    if (!isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate)) return false;

    // Stage Filter
    if (stageFilter === "withdrawal" && !(j.containerMovement?.withdrawalDate || j.deliveryStatus === "Port Queueing")) return false;
    if (stageFilter === "delivery" && !(j.deliveryStatus === "In Transit" || j.deliveryStatus === "Dispatched")) return false;
    if (stageFilter === "pullout" && !(j.hasReturnTrip || j.containerMovement?.pullOutDate)) return false;
    if (stageFilter === "gatein" && !(j.deliveryStatus === "Delivered" || j.containerMovement?.gateInDate)) return false;

    // Search Query Filter
    if (!containerSearch.trim()) return true;
    const q = containerSearch.toLowerCase();
    return (
      (j.containerNumber && j.containerNumber.toLowerCase().includes(q)) ||
      (j.waybillNumber && j.waybillNumber.toLowerCase().includes(q)) ||
      (j.clientName && j.clientName.toLowerCase().includes(q)) ||
      (j.driverName && j.driverName.toLowerCase().includes(q)) ||
      (j.pickupLocation && j.pickupLocation.toLowerCase().includes(q)) ||
      (j.dropoffLocation && j.dropoffLocation.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Dedicated Per-Page Report Header */}
      <ReportHeader
        title="📦 Per Trip Delivery &amp; Container Movement Report"
        subtitle="Master 5-stage container movement tracking (Withdrawal ➔ Delivery ➔ Pull Out ➔ Gate In)."
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="container-lifecycle-report-sheet"
        pdfFilenamePrefix="Container_Movement_Report"
      />

      {/* Controls & Search Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", background: "var(--bg-card)", padding: "0.85rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            className="form-input"
            style={{ width: "290px", fontSize: "0.85rem" }}
            placeholder="🔍 Search Container, Waybill #, Client, Driver..."
            value={containerSearch}
            onChange={(e) => setContainerSearch(e.target.value)}
          />

          {/* Filter Chips */}
          <div style={{ display: "flex", gap: "0.35rem", background: "var(--location-bg)", padding: "0.25rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <button
              className="btn btn-sm"
              onClick={() => setStageFilter("all")}
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "4px",
                border: "none",
                fontWeight: 700,
                background: stageFilter === "all" ? "var(--primary)" : "transparent",
                color: stageFilter === "all" ? "#000" : "var(--text-main)",
              }}
            >
              All ({filteredJobs.length})
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setStageFilter("withdrawal")}
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "4px",
                border: "none",
                fontWeight: 700,
                background: stageFilter === "withdrawal" ? "var(--primary)" : "transparent",
                color: stageFilter === "withdrawal" ? "#000" : "var(--text-main)",
              }}
            >
              🩶 Withdrawal
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setStageFilter("delivery")}
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "4px",
                border: "none",
                fontWeight: 700,
                background: stageFilter === "delivery" ? "var(--warning)" : "transparent",
                color: stageFilter === "delivery" ? "#000" : "var(--text-main)",
              }}
            >
              🧡 In Transit
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setStageFilter("pullout")}
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "4px",
                border: "none",
                fontWeight: 700,
                background: stageFilter === "pullout" ? "var(--purple)" : "transparent",
                color: stageFilter === "pullout" ? "#fff" : "var(--text-main)",
              }}
            >
              🟠 Pull Out
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setStageFilter("gatein")}
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                borderRadius: "4px",
                border: "none",
                fontWeight: 700,
                background: stageFilter === "gatein" ? "var(--success)" : "transparent",
                color: stageFilter === "gatein" ? "#fff" : "var(--text-main)",
              }}
            >
              💚 Gate In
            </button>
          </div>
        </div>

        {/* View Mode Toggle Switcher */}
        <div style={{ display: "flex", gap: "0.25rem", background: "var(--location-bg)", padding: "0.25rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
          <button
            className="btn btn-sm"
            onClick={() => setViewMode("cards")}
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.3rem 0.75rem",
              borderRadius: "4px",
              border: "none",
              background: viewMode === "cards" ? "var(--primary)" : "transparent",
              color: viewMode === "cards" ? "#000" : "var(--text-main)",
            }}
          >
            📱 Visual Cards
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setViewMode("table")}
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.3rem 0.75rem",
              borderRadius: "4px",
              border: "none",
              background: viewMode === "table" ? "var(--primary)" : "transparent",
              color: viewMode === "table" ? "#000" : "var(--text-main)",
            }}
          >
            📊 Matrix Table
          </button>
        </div>
      </div>

      <div id="container-lifecycle-report-sheet" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Render Mode A: Visual Cards View */}
        {viewMode === "cards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {filteredJobs.length > 0 ? (
            filteredJobs.map((j) => {
              const movement = j.containerMovement || {};
              const isWithdrawalDone = true;
              const isDeliveryDone = j.deliveryStatus === "Delivered" || j.deliveryStatus === "In Transit" || j.deliveryStatus === "Returning / En Route Garage";
              const isPullOutDone = j.deliveryStatus === "Delivered" || j.deliveryStatus === "Returning / En Route Garage" || (j.hasReturnTrip && j.deliveryStatus !== "Pending");
              const isGateInDone = j.deliveryStatus === "Delivered" || !!movement.gateInDate;

              // Calculate active stage for hero badge
              let activeStageLabel = "Booking Confirmed";
              let activeStageColor = "var(--primary)";
              if (isGateInDone) {
                activeStageLabel = "Stage 5: Gated In Yard (Completed)";
                activeStageColor = "var(--success)";
              } else if (isPullOutDone) {
                activeStageLabel = "Stage 4: Empty Container Pulled Out";
                activeStageColor = "var(--purple)";
              } else if (isDeliveryDone) {
                activeStageLabel = "Stage 3: Cargo Delivered / Offloaded";
                activeStageColor = "var(--warning)";
              } else if (isWithdrawalDone) {
                activeStageLabel = "Stage 2: Port Withdrawal / In Transit";
                activeStageColor = "var(--primary)";
              }

              return (
                <div
                  key={j.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderTop: `4px solid ${activeStageColor}`,
                    borderRadius: "var(--radius)",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  {/* Card Top Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                          #{j.waybillNumber}
                        </span>
                        {j.containerNumber && (
                          <span className="badge badge-purple" style={{ fontFamily: "monospace", fontSize: "0.8rem", padding: "0.25rem 0.6rem", fontWeight: 700 }}>
                            📦 {j.containerNumber}
                          </span>
                        )}
                        {j.trailerNumber && (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", background: "var(--location-bg)", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid var(--border)" }}>
                            Trailer: <strong style={{ color: "var(--text-main)", fontFamily: "monospace" }}>{j.trailerNumber}</strong>
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: "0.4rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>
                        🏢 {j.clientName} <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 400 }}>(Shipper / Consignee)</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                      {/* Current Active Movement Stage Badge */}
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          padding: "0.35rem 0.75rem",
                          borderRadius: "20px",
                          background: "var(--location-bg)",
                          border: `1.5px solid ${activeStageColor}`,
                          color: activeStageColor,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        {activeStageLabel}
                      </span>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dispatch Date</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>{j.dispatchDate?.substring(0, 10)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Route Bar */}
                  <div style={{ background: "var(--location-bg)", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.6rem", border: "1px solid var(--location-border)" }}>
                    <span style={{ color: "var(--success)", fontWeight: 700 }}>📍 Pickup:</span> <strong style={{ color: "var(--text-main)" }}>{j.pickupLocation || "Port Yard"}</strong>
                    <span style={{ color: "var(--primary)", fontWeight: 800 }}>➔</span>
                    <span style={{ color: "var(--warning)", fontWeight: 700 }}>🏁 Dropoff:</span> <strong style={{ color: "var(--text-main)" }}>{j.dropoffLocation || "Destination"}</strong>
                    {j.isInterIsland && (
                      <span className="badge badge-purple" style={{ marginLeft: "auto", fontSize: "0.75rem", padding: "0.2rem 0.6rem", fontWeight: 700 }}>
                        FB RoRo Passage ({j.roroRoute})
                      </span>
                    )}
                  </div>

                  {/* 5-Stage Visual Progress Stepper Timeline */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "0.65rem", borderTop: "1px solid var(--border)", paddingTop: "0.85rem" }}>
                    {/* Stage 1: Booking */}
                    <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "0.65rem 0.75rem", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          1. Booking Info
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 800, background: "rgba(16, 185, 129, 0.2)", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>
                          Done
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)" }}><strong>Date &amp; Time:</strong> {formatMovementDateTime(j.dispatchDate, "08:00 AM")}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>Confirmed Booking</div>
                    </div>

                    {/* Stage 2: Withdrawal */}
                    <div style={{ background: isWithdrawalDone ? "rgba(16, 185, 129, 0.08)" : "var(--location-bg)", border: `1px solid ${isWithdrawalDone ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`, borderRadius: "8px", padding: "0.65rem 0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.72rem", color: isWithdrawalDone ? "var(--success)" : "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          2. Port Withdrawal
                        </span>
                        <span style={{ fontSize: "0.72rem", color: isWithdrawalDone ? "var(--success)" : "var(--text-muted)", fontWeight: 700, background: isWithdrawalDone ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>
                          {isWithdrawalDone ? "Done" : "Pending"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)" }}><strong>Date &amp; Time:</strong> {formatMovementDateTime(movement.withdrawalDate || j.dispatchDate, "09:30 AM")}</div>
                      <div style={{ fontSize: "0.71rem", color: "var(--primary)", fontWeight: 700, marginTop: "0.15rem", display: "flex", flexDirection: "column", gap: "0.05rem" }}>
                        <div>Step: <strong>+{getHumanReadableTimeDiff(j.dispatchDate, movement.withdrawalDate || j.dispatchDate, "08:00 AM", "09:30 AM")}</strong> <span style={{ opacity: 0.8, fontSize: "0.68rem" }}>(from Booking)</span></div>
                        <div>Total: <strong>{getHumanReadableTimeDiff(j.dispatchDate, movement.withdrawalDate || j.dispatchDate, "08:00 AM", "09:30 AM")}</strong></div>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)", marginTop: "0.2rem" }}><strong>WB:</strong> {movement.withdrawalWaybill || j.waybillNumber}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}><strong>Driver:</strong> {movement.withdrawalDriver || j.driverName}</div>
                    </div>

                    {/* Stage 3: Delivery */}
                    <div style={{ background: isDeliveryDone ? "rgba(16, 185, 129, 0.08)" : "var(--location-bg)", border: `1px solid ${isDeliveryDone ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`, borderRadius: "8px", padding: "0.65rem 0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.72rem", color: isDeliveryDone ? "var(--success)" : "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          3. Delivery
                        </span>
                        <span style={{ fontSize: "0.72rem", color: isDeliveryDone ? "var(--success)" : "var(--text-muted)", fontWeight: 700, background: isDeliveryDone ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>
                          {isDeliveryDone ? "Done" : "Pending"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)" }}><strong>Date &amp; Time:</strong> {formatMovementDateTime(j.dispatchDate, "01:00 PM")}</div>
                      {isDeliveryDone && (
                        <div style={{ fontSize: "0.71rem", color: "var(--warning)", fontWeight: 700, marginTop: "0.15rem", display: "flex", flexDirection: "column", gap: "0.05rem" }}>
                          <div>Step: <strong>+{getHumanReadableTimeDiff(movement.withdrawalDate || j.dispatchDate, j.dispatchDate, "09:30 AM", "01:00 PM")}</strong> <span style={{ opacity: 0.8, fontSize: "0.68rem" }}>(from Withdrawal)</span></div>
                          <div>Total: <strong>{getHumanReadableTimeDiff(j.dispatchDate, j.dispatchDate, "08:00 AM", "01:00 PM")}</strong></div>
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)", marginTop: "0.2rem" }}><strong>WB:</strong> {j.waybillNumber}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}><strong>Driver:</strong> {j.driverName}</div>
                    </div>

                    {/* Stage 4: Pull Out */}
                    <div style={{ background: isPullOutDone ? "rgba(16, 185, 129, 0.08)" : "var(--location-bg)", border: `1px solid ${isPullOutDone ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`, borderRadius: "8px", padding: "0.65rem 0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.72rem", color: isPullOutDone ? "var(--success)" : "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          4. Empty Pull Out
                        </span>
                        <span style={{ fontSize: "0.72rem", color: isPullOutDone ? "var(--success)" : "var(--text-muted)", fontWeight: 700, background: isPullOutDone ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>
                          {isPullOutDone ? "Done" : "Pending"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)" }}><strong>Date &amp; Time:</strong> {formatMovementDateTime(movement.pullOutDate || (j.hasReturnTrip ? j.dispatchDate : undefined), "03:30 PM")}</div>
                      {isPullOutDone && (
                        <div style={{ fontSize: "0.71rem", color: "var(--purple)", fontWeight: 700, marginTop: "0.15rem", display: "flex", flexDirection: "column", gap: "0.05rem" }}>
                          <div>Step: <strong>+{getHumanReadableTimeDiff(j.dispatchDate, movement.pullOutDate || (j.hasReturnTrip ? j.dispatchDate : undefined), "01:00 PM", "03:30 PM")}</strong> <span style={{ opacity: 0.8, fontSize: "0.68rem" }}>(from Delivery)</span></div>
                          <div>Total: <strong>{getHumanReadableTimeDiff(j.dispatchDate, movement.pullOutDate || (j.hasReturnTrip ? j.dispatchDate : undefined), "08:00 AM", "03:30 PM")}</strong></div>
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)", marginTop: "0.2rem" }}><strong>WB:</strong> {movement.pullOutWaybill || (j.hasReturnTrip ? `PO-${j.waybillNumber}` : "—")}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}><strong>Driver:</strong> {movement.pullOutDriver || (j.hasReturnTrip ? j.driverName : "—")}</div>
                    </div>

                    {/* Stage 5: Gate In */}
                    <div style={{ background: isGateInDone ? "rgba(16, 185, 129, 0.08)" : "var(--location-bg)", border: `1px solid ${isGateInDone ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`, borderRadius: "8px", padding: "0.65rem 0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <span style={{ fontSize: "0.72rem", color: isGateInDone ? "var(--success)" : "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          5. Yard Gate In
                        </span>
                        <span style={{ fontSize: "0.72rem", color: isGateInDone ? "var(--success)" : "var(--text-muted)", fontWeight: 700, background: isGateInDone ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>
                          {isGateInDone ? "Gated In" : "Pending"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)" }}><strong>Date &amp; Time:</strong> {formatMovementDateTime(movement.gateInDate || (j.deliveryStatus === "Delivered" ? j.dispatchDate : undefined), "05:00 PM")}</div>
                      {isGateInDone && (
                        <div style={{ fontSize: "0.71rem", color: "var(--success)", fontWeight: 700, marginTop: "0.15rem", display: "flex", flexDirection: "column", gap: "0.05rem" }}>
                          <div>Step: <strong>+{getHumanReadableTimeDiff(movement.pullOutDate || j.dispatchDate, movement.gateInDate || (j.deliveryStatus === "Delivered" ? j.dispatchDate : undefined), "03:30 PM", "05:00 PM")}</strong> <span style={{ opacity: 0.8, fontSize: "0.68rem" }}>(from Pull Out)</span></div>
                          <div>Total: <strong>{getHumanReadableTimeDiff(j.dispatchDate, movement.gateInDate || (j.deliveryStatus === "Delivered" ? j.dispatchDate : undefined), "08:00 AM", "05:00 PM")}</strong></div>
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--text-main)", marginTop: "0.2rem" }}><strong>WB:</strong> {movement.gateInWaybill || (j.deliveryStatus === "Delivered" ? `GI-${j.waybillNumber}` : "—")}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}><strong>Status:</strong> {isGateInDone ? "Gated In Yard" : "Pending"}</div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-dim)", background: "var(--bg-card)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
              No container trip delivery records found matching your filters.
            </div>
          )}
        </div>
      )}

      {/* Render Mode B: Matrix Table View */}
      {viewMode === "table" && (
        <div className="table-card" style={{ overflowX: "scroll", overflowY: "hidden", display: "block", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", maxWidth: "100%", paddingBottom: "0.75rem" }}>
          <table style={{ minWidth: "2400px", width: "100%", whiteSpace: "nowrap", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ background: "var(--location-bg)", borderBottom: "1px solid var(--border)" }}>
                <th colSpan={7} style={{ color: "var(--success)", textTransform: "uppercase", padding: "0.5rem 0.6rem", borderRight: "1px solid var(--border)", fontWeight: 800 }}>
                  🟢 1. Booking &amp; Cargo Info
                </th>
                <th colSpan={4} style={{ color: "var(--primary)", textTransform: "uppercase", padding: "0.5rem 0.6rem", borderRight: "1px solid var(--border)", fontWeight: 800 }}>
                  🩶 2. Port Withdrawal
                </th>
                <th colSpan={4} style={{ color: "var(--warning)", textTransform: "uppercase", padding: "0.5rem 0.6rem", borderRight: "1px solid var(--border)", fontWeight: 800 }}>
                  🧡 3. Consignee Delivery
                </th>
                <th colSpan={4} style={{ color: "var(--purple)", textTransform: "uppercase", padding: "0.5rem 0.6rem", borderRight: "1px solid var(--border)", fontWeight: 800 }}>
                  🟠 4. Empty Pull Out
                </th>
                <th colSpan={4} style={{ color: "var(--success)", textTransform: "uppercase", padding: "0.5rem 0.6rem", fontWeight: 800 }}>
                  💚 5. Yard Return &amp; Gate In
                </th>
              </tr>
              <tr style={{ fontSize: "0.74rem", background: "var(--bg-card)", color: "var(--text-dim)" }}>
                {/* 1. Booking & Cargo Info */}
                <th style={{ padding: "0.45rem 0.5rem" }}>BOOKING DATE</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>CLIENT SHIPPER</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>CONSIGNEE</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>CONTAINER / VAN #</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>PICKUP ORIGIN</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>DROPOFF DESTINATION</th>
                <th style={{ padding: "0.45rem 0.5rem", borderRight: "1px solid var(--border)" }}>TRAILER CHASSIS #</th>

                {/* 2. Port Withdrawal */}
                <th style={{ padding: "0.45rem 0.5rem" }}>WITHDRAWAL DATE</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>WITHDRAWAL WAYBILL #</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>WITHDRAWAL DRIVER</th>
                <th style={{ padding: "0.45rem 0.5rem", borderRight: "1px solid var(--border)" }}>WITHDRAWAL HELPER</th>

                {/* 3. Consignee Delivery */}
                <th style={{ padding: "0.45rem 0.5rem" }}>DELIVERY DATE</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>DELIVERY WAYBILL #</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>DELIVERY DRIVER</th>
                <th style={{ padding: "0.45rem 0.5rem", borderRight: "1px solid var(--border)" }}>DELIVERY HELPER</th>

                {/* 4. Empty Pull Out */}
                <th style={{ padding: "0.45rem 0.5rem" }}>PULL OUT DATE</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>PULL OUT WAYBILL #</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>PULL OUT DRIVER</th>
                <th style={{ padding: "0.45rem 0.5rem", borderRight: "1px solid var(--border)" }}>PULL OUT HELPER</th>

                {/* 5. Yard Return & Gate In */}
                <th style={{ padding: "0.45rem 0.5rem" }}>GATE IN DATE</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>GATE IN WAYBILL #</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>GATE IN DRIVER</th>
                <th style={{ padding: "0.45rem 0.5rem" }}>GATE IN HELPER</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j) => {
                const movement = j.containerMovement || {};
                return (
                  <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>{j.dispatchDate?.substring(0, 10)}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 700, color: "var(--text-main)" }}>{j.clientName}</td>
                    <td style={{ padding: "0.5rem", color: "var(--text-main)" }}>{j.clientName}</td>
                    <td style={{ padding: "0.5rem", fontFamily: "monospace", color: j.containerNumber ? "var(--purple)" : "var(--text-dim)", fontWeight: 700 }}>
                      {j.containerNumber || "—"}
                    </td>
                    <td style={{ padding: "0.5rem", color: "var(--text-main)" }}>{j.pickupLocation || "—"}</td>
                    <td style={{ padding: "0.5rem", color: "var(--text-main)" }}>{j.dropoffLocation || "—"}</td>
                    <td style={{ padding: "0.5rem", borderRight: "1px solid var(--border)", fontFamily: "monospace", color: "var(--text-main)" }}>
                      {j.trailerNumber || "—"}
                    </td>

                    <td style={{ padding: "0.5rem" }}>✅ {movement.withdrawalDate?.substring(0, 10) || j.dispatchDate?.substring(0, 10)}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 700, color: "var(--primary)" }}>{movement.withdrawalWaybill || j.waybillNumber}</td>
                    <td style={{ padding: "0.5rem" }}>{movement.withdrawalDriver || j.driverName}</td>
                    <td style={{ padding: "0.5rem", borderRight: "1px solid var(--border)" }}>{movement.withdrawalHelper || j.helperName || "—"}</td>

                    <td style={{ padding: "0.5rem" }}>{(j.deliveryStatus === "Delivered" || j.deliveryStatus === "In Transit" || j.deliveryStatus === "Returning / En Route Garage") ? `✅ ${j.dispatchDate?.substring(0, 10)}` : `⚪ ${j.dispatchDate?.substring(0, 10)}`}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 700, color: "var(--primary)" }}>{j.waybillNumber}</td>
                    <td style={{ padding: "0.5rem" }}>{j.driverName}</td>
                    <td style={{ padding: "0.5rem", borderRight: "1px solid var(--border)" }}>{j.helperName || "—"}</td>

                    <td style={{ padding: "0.5rem" }}>{(j.deliveryStatus === "Delivered" || j.deliveryStatus === "Returning / En Route Garage" || (j.hasReturnTrip && j.deliveryStatus !== "Pending")) ? `✅ ${movement.pullOutDate?.substring(0, 10) || j.dispatchDate?.substring(0, 10)}` : "⚪ Pending"}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 700, color: movement.pullOutWaybill ? "var(--primary)" : "var(--text-dim)" }}>
                      {movement.pullOutWaybill || (j.hasReturnTrip ? `PO-${j.waybillNumber}` : "—")}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{movement.pullOutDriver || (j.hasReturnTrip ? j.driverName : "—")}</td>
                    <td style={{ padding: "0.5rem", borderRight: "1px solid var(--border)" }}>{movement.pullOutHelper || (j.hasReturnTrip ? j.helperName || "—" : "—")}</td>

                    <td style={{ padding: "0.5rem" }}>{(j.deliveryStatus === "Delivered" || !!movement.gateInDate) ? `✅ ${movement.gateInDate?.substring(0, 10) || j.dispatchDate?.substring(0, 10)}` : "⚪ Pending"}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 700, color: movement.gateInWaybill ? "var(--purple)" : "var(--text-dim)" }}>
                      {movement.gateInWaybill || (j.deliveryStatus === "Delivered" ? `GI-${j.waybillNumber}` : "—")}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{movement.gateInDriver || (j.deliveryStatus === "Delivered" ? j.driverName : "—")}</td>
                    <td style={{ padding: "0.5rem" }}>{movement.gateInHelper || (j.deliveryStatus === "Delivered" ? j.helperName || "—" : "—")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);
};
