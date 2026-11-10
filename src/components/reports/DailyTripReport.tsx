import React, { useState } from "react";
import { DispatchJob, TruckVehicle, MaintenanceLog, FuelTopupLog, UnitInspectionLog } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface DailyTripReportProps {
  jobs: DispatchJob[];
  vehicles: TruckVehicle[];
  maintenanceLogs?: MaintenanceLog[];
  topupLogs?: FuelTopupLog[];
  inspectionLogs?: UnitInspectionLog[];
  companyName: string;
  companyLogo?: string;
}

export const DailyTripReport: React.FC<DailyTripReportProps> = ({
  jobs,
  vehicles,
  topupLogs = [],
  inspectionLogs = [],
  companyName,
  companyLogo,
}) => {
  const [dateRange, setDateRange] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");

  // Unique list of drivers and trucks from jobs & vehicles
  const driverList = Array.from(new Set(jobs.map((j) => j.driverName).filter(Boolean)));

  // Filter jobs strictly based on selected date range, truck, and driver
  const filteredJobs = jobs.filter((j) => {
    if (j.deliveryStatus === "Cancelled") return false;
    if (!isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate)) return false;
    if (selectedTruck !== "all" && j.truckPlate !== selectedTruck && j.truckId !== selectedTruck) return false;
    if (selectedDriver !== "all" && j.driverName !== selectedDriver) return false;
    return true;
  });

  // Sort filtered jobs by dispatchDate descending to get the latest waybill record first
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.dispatchDate || "";
    const dateB = b.dispatchDate || "";
    return dateB.localeCompare(dateA);
  });

  // Extract metadata for the selected single truck / driver run from the latest dispatch record
  const latestJob = sortedJobs[0];
  const displayDriver = selectedDriver !== "all" ? selectedDriver : latestJob?.driverName || "—";
  const displayHelper = latestJob?.helperName || "—";
  const displayPlate = selectedTruck !== "all" ? selectedTruck : latestJob?.truckPlate || "—";
  const displayDate = latestJob?.dispatchDate?.substring(0, 10) || new Date().toISOString().substring(0, 10);

  // Resolution 1: UNIT CHECKLIST (from latest dispatch job OR standalone inspection log)
  // Find candidates matching current vehicle filter
  const candidateJobsWithChecklist = sortedJobs.filter((j) => j.truckUnitChecklist && (selectedTruck === "all" || j.truckPlate === selectedTruck || j.truckId === selectedTruck));
  const candidateInspectionLogs = inspectionLogs.filter((l) => (selectedTruck === "all" || l.plateNumber === selectedTruck || l.truckId === selectedTruck));

  let latestChecklistSource: {
    sourceType: "dispatch" | "inspection";
    plate: string;
    date: string;
    checklist: {
      battery?: string;
      lights?: string;
      oil?: string;
      water?: string;
      brakes?: string;
      airPressure?: string;
      gasFuel?: string;
      electrical?: string;
      tires?: string;
      selfDriverStatus?: string;
      checklistNotes?: string;
    };
  } | null = null;

  const topJobChecklist = candidateJobsWithChecklist[0];
  const topInspLog = candidateInspectionLogs.sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate))[0];

  const jobChecklistDate = topJobChecklist?.dispatchDate || "";
  const inspChecklistDate = topInspLog?.inspectionDate || "";

  if (topInspLog && (!topJobChecklist || inspChecklistDate >= jobChecklistDate)) {
    latestChecklistSource = {
      sourceType: "inspection",
      plate: topInspLog.plateNumber,
      date: topInspLog.inspectionDate,
      checklist: {
        battery: topInspLog.checklist.battery,
        lights: topInspLog.checklist.lights,
        oil: topInspLog.checklist.oil,
        water: topInspLog.checklist.water,
        brakes: topInspLog.checklist.brakes,
        airPressure: topInspLog.checklist.airPressure,
        gasFuel: topInspLog.checklist.gasFuel,
        electrical: topInspLog.checklist.electrical,
        tires: topInspLog.checklist.tires,
        selfDriverStatus: topInspLog.checklist.selfDriverStatus,
        checklistNotes: topInspLog.notes,
      },
    };
  } else if (topJobChecklist) {
    latestChecklistSource = {
      sourceType: "dispatch",
      plate: topJobChecklist.truckPlate,
      date: topJobChecklist.dispatchDate || "",
      checklist: {
        battery: topJobChecklist.truckUnitChecklist?.battery,
        lights: topJobChecklist.truckUnitChecklist?.lights,
        oil: topJobChecklist.truckUnitChecklist?.oil,
        water: topJobChecklist.truckUnitChecklist?.water,
        brakes: topJobChecklist.truckUnitChecklist?.brakes,
        airPressure: topJobChecklist.truckUnitChecklist?.airPressure,
        gasFuel: topJobChecklist.truckUnitChecklist?.gasFuel,
        electrical: topJobChecklist.truckUnitChecklist?.electrical,
        tires: topJobChecklist.truckUnitChecklist?.tires,
        selfDriverStatus: topJobChecklist.truckUnitChecklist?.selfDriverStatus,
        checklistNotes: topJobChecklist.truckUnitChecklist?.checklistNotes,
      },
    };
  }

  // Resolution 2: FUEL MANAGEMENT LOGS (from latest dispatch job OR standalone fuel top-up log)
  const candidateJobsWithFuel = sortedJobs.filter((j) => j.fuelManagement && (selectedTruck === "all" || j.truckPlate === selectedTruck || j.truckId === selectedTruck));
  const candidateTopupLogs = topupLogs.filter((l) => (selectedTruck === "all" || l.plateNumber === selectedTruck || l.truckId === selectedTruck));

  let latestFuelSource: {
    sourceType: "dispatch" | "topup";
    plate: string;
    date: string;
    tripAllowance?: number;
    tankLevelPercent?: number;
    currentLiters?: number;
    sourcing?: string;
  } | null = null;

  const topJobFuel = candidateJobsWithFuel[0];
  const topFuelLog = candidateTopupLogs.sort((a, b) => b.topupDate.localeCompare(a.topupDate))[0];

  const jobFuelDate = topJobFuel?.dispatchDate || "";
  const topupFuelDate = topFuelLog?.topupDate || "";

  if (topFuelLog && (!topJobFuel || topupFuelDate >= jobFuelDate)) {
    const matchedVehicle = vehicles.find((v) => v.id === topFuelLog.truckId || v.plateNumber === topFuelLog.plateNumber);
    const capacity = matchedVehicle?.fuelCapacityLiters || 300;
    const computedPercent = capacity > 0 ? Math.min(100, Math.round(((matchedVehicle?.currentFuelLiters || topFuelLog.liters) / capacity) * 100)) : undefined;

    latestFuelSource = {
      sourceType: "topup",
      plate: topFuelLog.plateNumber,
      date: topFuelLog.topupDate,
      tripAllowance: topFuelLog.totalCost,
      tankLevelPercent: computedPercent,
      currentLiters: topFuelLog.liters,
      sourcing: topFuelLog.containerSource || topFuelLog.location,
    };
  } else if (topJobFuel) {
    latestFuelSource = {
      sourceType: "dispatch",
      plate: topJobFuel.truckPlate,
      date: topJobFuel.dispatchDate || "",
      tripAllowance: topJobFuel.fuelAllowance,
      tankLevelPercent: topJobFuel.fuelManagement?.initialFuelLevelPercent,
      currentLiters: topJobFuel.fuelManagement?.initialLiters,
      sourcing: topJobFuel.fuelManagement?.fuelCardNumber ? `Card #${topJobFuel.fuelManagement.fuelCardNumber}` : "Garage Dispenser",
    };
  }

  const renderStatusBadge = (val?: string) => {
    if (!val || val === "Not Checked") {
      return <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Not Checked</span>;
    }
    if (val === "Needs Attention") {
      return <span className="badge badge-danger" style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem" }}>Needs Attention</span>;
    }
    if (val === "OK") {
      return <span className="badge badge-success" style={{ fontSize: "0.85rem", padding: "0.2rem 0.5rem" }}>OK</span>;
    }
    return <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{val}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="📝 Daily Trip Report"
        subtitle={`Official daily trip manifest, waybills, cargo weight (MT), unit safety checklist, and fuel/odometer logs (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="daily-trip-paper-sheet"
        pdfFilenamePrefix="Daily_Trip_Report"
      />

      {/* Filter Controls Bar */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", background: "var(--bg-card)", padding: "0.85rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>🚚 Select Truck Plate:</label>
          <select
            className="form-select"
            value={selectedTruck}
            onChange={(e) => setSelectedTruck(e.target.value)}
            style={{ width: "160px", fontSize: "0.85rem" }}
          >
            <option value="all">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.plateNumber}>
                {v.plateNumber} ({v.modelType})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>👨‍✈️ Select Driver:</label>
          <select
            className="form-select"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            style={{ width: "170px", fontSize: "0.85rem" }}
          >
            <option value="all">All Drivers</option>
            {driverList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Showing <strong>{filteredJobs.length}</strong> trip{filteredJobs.length === 1 ? "" : "s"} for selected period
        </div>
      </div>

      {/* Printable Sheet View (Paper Replica Layout) */}
      <div
        id="daily-trip-paper-sheet"
        style={{
          background: "var(--bg-card)",
          border: "2px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Paper Sheet Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", borderBottom: "2px solid var(--border)", paddingBottom: "1rem" }}>
          {companyLogo && (
            <img
              src={companyLogo}
              alt="Company Logo"
              style={{ maxHeight: "65px", maxWidth: "140px", objectFit: "contain", borderRadius: "4px" }}
            />
          )}
          <div style={{ textAlign: companyLogo ? "left" : "center" }}>
            <h2 style={{ margin: 0, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-main)", fontSize: "1.4rem" }}>
              {companyName}
            </h2>
            <h3 style={{ margin: "0.25rem 0 0 0", color: "var(--primary)", textTransform: "uppercase", fontSize: "1.1rem" }}>
              DAILY TRIP REPORT
            </h3>
          </div>
        </div>

        {/* Paper Sheet Metadata Fields Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", background: "var(--location-bg)", padding: "0.85rem 1.1rem", borderRadius: "8px", border: "1px solid var(--location-border)" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>DRIVER:</span>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>{displayDriver}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>HELPER:</span>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>{displayHelper}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>DATE:</span>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>{displayDate}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>PLATE NO.:</span>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>{displayPlate}</div>
          </div>
        </div>

        {/* Main Daily Trip Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>WAYBILL #</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)", textAlign: "right" }}>WEIGHT (MT) / SIZE</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>CONTAINER NO.</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>CONSIGNEE</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>FREIGHT BILLING / TERMS</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>PICKUP ORIGIN</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>DROPOFF DESTINATION</th>
                <th style={{ padding: "0.6rem 0.6rem", borderRight: "1px solid var(--border)" }}>TRAILER CHASSIS #</th>
                <th colSpan={2} style={{ padding: "0.4rem 0.6rem", textAlign: "center" }}>BIRADA (PAY)</th>
              </tr>
              <tr style={{ fontSize: "0.72rem", background: "var(--bg-card)", borderBottom: "1px solid var(--border)", color: "var(--text-dim)" }}>
                <th colSpan={8} style={{ borderRight: "1px solid var(--border)" }}></th>
                <th style={{ padding: "0.3rem 0.5rem", textAlign: "right", borderRight: "1px solid var(--border)" }}>D (DRIVER)</th>
                <th style={{ padding: "0.3rem 0.5rem", textAlign: "right" }}>H (HELPER)</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length > 0 ? (
                filteredJobs.map((j) => (
                  <tr key={j.id} style={{ borderBottom: "1px solid var(--border)", height: "42px" }}>
                    <td style={{ padding: "0.5rem 0.6rem", fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                      #{j.waybillNumber}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 800, color: "var(--text-main)" }}>
                      {j.vanSize ? `${j.vanSize}${j.weightTons ? ` (${j.weightTons} MT)` : ""}` : (j.weightTons ? `${j.weightTons} MT` : "—")}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", fontFamily: "monospace", fontWeight: 700, color: j.containerNumber ? "var(--purple)" : "var(--text-dim)" }}>
                      {j.containerNumber || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {j.clientName}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-main)", fontSize: "0.78rem" }}>
                      {j.freightBillingTerms || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-main)" }}>
                      {j.pickupLocation || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-main)" }}>
                      {j.dropoffLocation || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", fontFamily: "monospace", color: "var(--text-main)" }}>
                      {j.trailerNumber || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                      ₱{(j.driverRate || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: 700, color: "var(--purple)" }}>
                      ₱{(j.helperCommission || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                // Blank fillable lines when no data match, just like the paper form!
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)", height: "42px" }}>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)", textAlign: "right" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)", textAlign: "right" }}>—</td>
                    <td style={{ padding: "0.5rem 0.6rem", color: "var(--text-dim)", textAlign: "right" }}>—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paper Sheet Bottom Inspection & Fuel Section */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem", borderTop: "2px solid var(--border)", paddingTop: "1.25rem" }}>
          {/* Bottom Left: UNIT CHECKLIST Box */}
          <div style={{ background: "var(--location-bg)", padding: "1.1rem", borderRadius: "8px", border: "1px solid var(--location-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ margin: 0, color: "var(--primary)", textTransform: "uppercase", fontSize: "0.95rem", letterSpacing: "0.5px" }}>
                📋 UNIT CHECKLIST
              </h4>
              {latestChecklistSource && (
                <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700, background: "var(--bg-card)", padding: "0.25rem 0.6rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                  Plate: <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{latestChecklistSource.plate}</span> | Date: {latestChecklistSource.date.substring(0, 10)}
                  {latestChecklistSource.sourceType === "inspection" && <span style={{ marginLeft: "0.3rem", color: "var(--text-dim)", fontSize: "0.75rem" }}>(Safety Audit)</span>}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", fontSize: "0.88rem" }}>
              <div><strong>BATTERY:</strong> {renderStatusBadge(latestChecklistSource?.checklist.battery)}</div>
              <div><strong>LIGHTS:</strong> {renderStatusBadge(latestChecklistSource?.checklist.lights)}</div>
              <div><strong>OIL:</strong> {renderStatusBadge(latestChecklistSource?.checklist.oil)}</div>
              <div><strong>WATER:</strong> {renderStatusBadge(latestChecklistSource?.checklist.water)}</div>
              <div><strong>BRAKES:</strong> {renderStatusBadge(latestChecklistSource?.checklist.brakes)}</div>
              <div><strong>AIR PRESSURE:</strong> {renderStatusBadge(latestChecklistSource?.checklist.airPressure)}</div>
              <div><strong>GAS / FUEL:</strong> {renderStatusBadge(latestChecklistSource?.checklist.gasFuel)}</div>
              <div><strong>ELECTRICAL:</strong> {renderStatusBadge(latestChecklistSource?.checklist.electrical)}</div>
              <div><strong>TIRES:</strong> {renderStatusBadge(latestChecklistSource?.checklist.tires)}</div>
              <div><strong>DRIVER:</strong> {renderStatusBadge(latestChecklistSource?.checklist.selfDriverStatus)}</div>

              <div style={{ gridColumn: "span 2", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)", fontSize: "0.85rem" }}>
                <strong>CHECKLIST NOTES:</strong>{" "}
                <span style={{ color: latestChecklistSource?.checklist.checklistNotes ? "var(--text-main)" : "var(--text-dim)" }}>
                  {latestChecklistSource?.checklist.checklistNotes || (latestChecklistSource ? "No defects reported" : "—")}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Right: FUEL MANAGEMENT LOGS Box */}
          <div style={{ background: "var(--location-bg)", padding: "1.1rem", borderRadius: "8px", border: "1px solid var(--location-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ margin: 0, color: "var(--warning)", textTransform: "uppercase", fontSize: "0.95rem", letterSpacing: "0.5px" }}>
                ⛽ FUEL MANAGEMENT LOGS
              </h4>
              {latestFuelSource && (
                <span style={{ fontSize: "0.85rem", color: "var(--warning)", fontWeight: 700, background: "var(--bg-card)", padding: "0.25rem 0.6rem", borderRadius: "5px", border: "1px solid var(--border)" }}>
                  Plate: <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{latestFuelSource.plate}</span> | Date: {latestFuelSource.date.substring(0, 10)}
                  {latestFuelSource.sourceType === "topup" && <span style={{ marginLeft: "0.3rem", color: "var(--text-dim)", fontSize: "0.75rem" }}>(Top-Up Audit)</span>}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.88rem" }}>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700 }}>TRIP / REFILL ALLOWANCE:</span>
                <div style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>
                  {latestFuelSource?.tripAllowance !== undefined ? `₱${latestFuelSource.tripAllowance.toLocaleString()}` : "—"}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700 }}>FUEL TANK LEVEL (%):</span>
                <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1rem" }}>
                  {latestFuelSource?.tankLevelPercent !== undefined ? `${latestFuelSource.tankLevelPercent}%` : "—"}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700 }}>CURRENT FUEL VOLUME:</span>
                <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1rem" }}>
                  {latestFuelSource?.currentLiters !== undefined && latestFuelSource.currentLiters > 0 ? `${latestFuelSource.currentLiters} L` : "—"}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700 }}>FUEL CARD / SOURCING:</span>
                <div style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "0.95rem" }}>
                  {latestFuelSource?.sourcing || "Garage Dispenser"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

