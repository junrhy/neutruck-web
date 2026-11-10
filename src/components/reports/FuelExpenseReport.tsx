import React, { useState } from "react";
import { FuelTopupLog, TruckVehicle, DispatchJob, UnitInspectionLog } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";
import { formatAppDateTime } from "../../utils/dateUtils";

interface FuelExpenseReportProps {
  topupLogs: FuelTopupLog[];
  vehicles: TruckVehicle[];
  jobs?: DispatchJob[];
  inspectionLogs?: UnitInspectionLog[];
  companyName: string;
  companyLogo?: string;
}

export const FuelExpenseReport: React.FC<FuelExpenseReportProps> = ({
  topupLogs,
  vehicles,
  jobs = [],
  inspectionLogs = [],
  companyName,
  companyLogo,
}) => {
  const [dateRange, setDateRange] = useState("365_days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTruckFilter, setSelectedTruckFilter] = useState("ALL");
  const [activeViewTab, setActiveViewTab] = useState<"summary" | "allowances" | "topups" | "tanks">("summary");

  // Filter topup logs by date range & search
  const filteredLogs = topupLogs.filter((log) => {
    if (!isDateInRange(log.topupDate, dateRange, customStartDate, customEndDate)) return false;
    if (selectedTruckFilter !== "ALL" && log.truckId !== selectedTruckFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTruck = (log.truckId || "").toLowerCase().includes(q) || (log.plateNumber || "").toLowerCase().includes(q);
      const matchDriver = (log.driverName || "").toLowerCase().includes(q);
      const matchLoc = (log.location || "").toLowerCase().includes(q);
      const matchSource = (log.containerSource || "").toLowerCase().includes(q);
      const matchWb = (log.waybillNumber || "").toLowerCase().includes(q);
      if (!matchTruck && !matchDriver && !matchLoc && !matchSource && !matchWb) return false;
    }

    return true;
  });

  // Filter valid jobs (fuel allowances given on dispatch orders) by date range & search
  const filteredJobs = jobs.filter((j) => {
    if (j.deliveryStatus === "Cancelled" || j.deliveryStatus === "Draft") return false;
    if (!isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate)) return false;
    if (selectedTruckFilter !== "ALL" && j.truckId !== selectedTruckFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTruck = (j.truckId || "").toLowerCase().includes(q) || (j.truckPlate || "").toLowerCase().includes(q);
      const matchDriver = (j.driverName || "").toLowerCase().includes(q);
      const matchWb = (j.waybillNumber || "").toLowerCase().includes(q);
      if (!matchTruck && !matchDriver && !matchWb) return false;
    }

    return true;
  });

  // Calculate Overall Metrics
  const totalActualExpense = filteredLogs.reduce((sum, log) => sum + (log.totalCost || 0), 0);
  const totalLiters = filteredLogs.reduce((sum, log) => sum + (log.liters || 0), 0);
  const avgCostPerLiter = totalLiters > 0 ? totalActualExpense / totalLiters : 0;
  const totalTopupsCount = filteredLogs.length;

  const totalFuelAllowanceGiven = filteredJobs.reduce((sum, j) => sum + (j.fuelAllowance || 0), 0);
  const netAllowanceVariance = totalFuelAllowanceGiven - totalActualExpense;

  // Aggregate Per-Truck Metrics (Allowance Given + Actual Topup Expenses)
  const truckSummaryMap: Record<
    string,
    {
      truckId: string;
      plateNumber: string;
      model: string;
      allowanceGiven: number;
      dispatchCount: number;
      actualExpense: number;
      totalLiters: number;
      topupCount: number;
    }
  > = {};

  // First seed map with all fleet vehicles
  vehicles.forEach((v) => {
    truckSummaryMap[v.id] = {
      truckId: v.id,
      plateNumber: v.plateNumber,
      model: v.modelType || "Truck Unit",
      allowanceGiven: 0,
      dispatchCount: 0,
      actualExpense: 0,
      totalLiters: 0,
      topupCount: 0,
    };
  });

  // Accumulate Fuel Allowances Given per Truck from Dispatch Jobs
  filteredJobs.forEach((j) => {
    const tId = j.truckId || "UNASSIGNED";
    if (!truckSummaryMap[tId]) {
      truckSummaryMap[tId] = {
        truckId: tId,
        plateNumber: j.truckPlate || tId,
        model: "Truck Unit",
        allowanceGiven: 0,
        dispatchCount: 0,
        actualExpense: 0,
        totalLiters: 0,
        topupCount: 0,
      };
    }
    truckSummaryMap[tId].allowanceGiven += j.fuelAllowance || 0;
    truckSummaryMap[tId].dispatchCount += 1;
  });

  // Accumulate Actual Fuel Top-Up Expenses per Truck from Fuel Logs
  filteredLogs.forEach((log) => {
    const tId = log.truckId || "UNASSIGNED";
    if (!truckSummaryMap[tId]) {
      const vObj = vehicles.find((v) => v.id === tId || v.plateNumber === log.plateNumber);
      truckSummaryMap[tId] = {
        truckId: tId,
        plateNumber: log.plateNumber || vObj?.plateNumber || tId,
        model: vObj?.modelType || "Truck Unit",
        allowanceGiven: 0,
        dispatchCount: 0,
        actualExpense: 0,
        totalLiters: 0,
        topupCount: 0,
      };
    }
    truckSummaryMap[tId].actualExpense += log.totalCost || 0;
    truckSummaryMap[tId].totalLiters += log.liters || 0;
    truckSummaryMap[tId].topupCount += 1;
  });

  // Filter out trucks with 0 activity if searching or filtering
  const truckSummaries = Object.values(truckSummaryMap)
    .filter((ts) => ts.allowanceGiven > 0 || ts.actualExpense > 0 || ts.dispatchCount > 0)
    .sort((a, b) => b.allowanceGiven - a.allowanceGiven);

  // Highest Allowance Consuming Truck Unit
  const topAllowanceTruck = truckSummaries[0] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="🛢️ Fleet Fuel Allowance & Expense Audit Report"
        subtitle={`Empirical monitor of trip fuel allowances allocated vs actual fuel top-ups, liter consumption, and budget variances per truck unit (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="fuel-expense-paper-sheet"
        pdfFilenamePrefix="Fleet_Fuel_Allowance_Expense_Report"
      />

      {/* Main KPI Stat Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Total Fuel Allowance Given */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Fuel Allowance Issued</span>
            <span style={{ fontSize: "1.2rem" }}>💵</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b" }}>
            ₱{totalFuelAllowanceGiven.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Allocated across <strong>{filteredJobs.length}</strong> dispatch trip legs
          </div>
        </div>

        {/* Actual Top-up Fuel Expense */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Actual Fuel Top-Ups Paid</span>
            <span style={{ fontSize: "1.2rem" }}>🛢️</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#00d4ff" }}>
            ₱{totalActualExpense.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Total Volume: <strong>{totalLiters.toFixed(1)} L</strong> ({totalTopupsCount} logs @ ₱{avgCostPerLiter.toFixed(2)}/L avg)
          </div>
        </div>

        {/* Budget Variance (Allowance vs Actual) */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Allowance Budget Variance</span>
            <span style={{ fontSize: "1.2rem" }}>⚖️</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: netAllowanceVariance >= 0 ? "#10b981" : "#ef4444" }}>
            {netAllowanceVariance >= 0 ? "+" : ""}₱{netAllowanceVariance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            {netAllowanceVariance >= 0 ? "✅ Under budget / Allowance unspent" : "⚠️ Actual fuel top-ups exceeded allowance"}
          </div>
        </div>

        {/* Top Allowance Receiving Truck */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Highest Fuel Allowance Unit</span>
            <span style={{ fontSize: "1.2rem" }}>🚚</span>
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
            {topAllowanceTruck ? `${topAllowanceTruck.truckId} (${topAllowanceTruck.plateNumber})` : "No Data"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Given: <strong>₱{topAllowanceTruck ? topAllowanceTruck.allowanceGiven.toLocaleString("en-PH", { minimumFractionDigits: 2 }) : 0}</strong> ({topAllowanceTruck ? topAllowanceTruck.dispatchCount : 0} trips)
          </div>
        </div>
      </div>

      {/* Filter & View Switcher Controls Row */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "0.85rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveViewTab("summary")}
            className={`btn btn-sm ${activeViewTab === "summary" ? "btn-primary" : "btn-outline"}`}
          >
            🚚 Per-Truck Allowance &amp; Expense Summary ({truckSummaries.length})
          </button>
          <button
            onClick={() => setActiveViewTab("allowances")}
            className={`btn btn-sm ${activeViewTab === "allowances" ? "btn-primary" : "btn-outline"}`}
          >
            📋 Dispatch Fuel Allowances Log ({filteredJobs.length})
          </button>
          <button
            onClick={() => setActiveViewTab("topups")}
            className={`btn btn-sm ${activeViewTab === "topups" ? "btn-primary" : "btn-outline"}`}
          >
            🛢️ Station Fuel Top-Up Audit ({filteredLogs.length})
          </button>
          <button
            onClick={() => setActiveViewTab("tanks")}
            className={`btn btn-sm ${activeViewTab === "tanks" ? "btn-primary" : "btn-outline"}`}
          >
            ⛽ Tank Gauges &amp; Remaining Fuel ({vehicles.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <select
            className="form-select"
            value={selectedTruckFilter}
            onChange={(e) => setSelectedTruckFilter(e.target.value)}
            style={{ width: "190px", fontSize: "0.85rem", padding: "0.4rem 0.65rem" }}
          >
            <option value="ALL">All Fleet Vehicles ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id} — {v.plateNumber} ({v.modelType})
              </option>
            ))}
          </select>

          <input
            type="text"
            className="form-input"
            placeholder="Search Plate, Driver, Station, Waybill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "220px", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Printable Paper Sheet View */}
      <div
        id="fuel-expense-paper-sheet"
        style={{
          background: "var(--bg-card)",
          border: "2px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
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
            <h3 style={{ margin: "0.25rem 0 0 0", color: "var(--primary)", textTransform: "uppercase", fontSize: "1.05rem" }}>
              FLEET FUEL ALLOWANCE &amp; EXPENSE AUDIT REPORT PER TRUCK
            </h3>
          </div>
        </div>

        {/* VIEW 1: Per-Truck Fuel Allowance & Expense Summary */}
        {activeViewTab === "summary" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              🚚 Per-Truck Fuel Allowance &amp; Expense Summary
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>TRUCK UNIT &amp; PLATE</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>VEHICLE MODEL</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "center" }}>DISPATCH TRIPS</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>FUEL ALLOWANCE GIVEN (₱)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>ACTUAL TOP-UPS PAID (₱)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>LITERS FILLED</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>ALLOWANCE VARIANCE (₱)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>ALLOWANCE SHARE</th>
                  </tr>
                </thead>
                <tbody>
                  {truckSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                        No fuel allowance or top-up entries found for selected filters.
                      </td>
                    </tr>
                  ) : (
                    truckSummaries.map((ts) => {
                      const variance = ts.allowanceGiven - ts.actualExpense;
                      const percentShare = totalFuelAllowanceGiven > 0 ? Math.round((ts.allowanceGiven / totalFuelAllowanceGiven) * 100) : 0;

                      return (
                        <tr key={ts.truckId} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                            {ts.truckId} <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 600 }}>({ts.plateNumber})</span>
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)" }}>{ts.model}</td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", fontWeight: 700 }}>{ts.dispatchCount} Trips</td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: "#f59e0b" }}>
                            ₱{ts.allowanceGiven.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 800, color: "#00d4ff" }}>
                            ₱{ts.actualExpense.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                            {ts.totalLiters > 0 ? `${ts.totalLiters.toFixed(1)} L` : "—"}
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 800, color: variance >= 0 ? "#10b981" : "#ef4444" }}>
                            {variance >= 0 ? "+" : ""}₱{variance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem" }}>
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                              <div style={{ height: "8px", width: `${Math.max(6, percentShare)}%`, background: "linear-gradient(90deg, #f59e0b, #10b981)", borderRadius: "4px" }} />
                              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-main)" }}>
                                {percentShare}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {truckSummaries.length > 0 && (
                    <tr style={{ background: "var(--location-bg)", fontWeight: 900 }}>
                      <td style={{ padding: "0.75rem 0.8rem" }} colSpan={2}>TOTAL FLEET FUEL SUMMARY</td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "center" }}>{filteredJobs.length} Trips</td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", color: "#f59e0b", fontSize: "0.95rem" }}>
                        ₱{totalFuelAllowanceGiven.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", color: "#00d4ff" }}>
                        ₱{totalActualExpense.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right" }}>{totalLiters.toFixed(1)} L</td>
                      <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", color: netAllowanceVariance >= 0 ? "#10b981" : "#ef4444" }}>
                        {netAllowanceVariance >= 0 ? "+" : ""}₱{netAllowanceVariance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.75rem 0.8rem" }}>100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: Dispatch Fuel Allowances Log */}
        {activeViewTab === "allowances" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📋 Per-Dispatch Trip Fuel Allowance Log
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>DISPATCH DATE</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>WAYBILL NO.</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>TRUCK UNIT &amp; PLATE</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>ASSIGNED DRIVER</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>ORIGIN ➔ DESTINATION</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>FUEL ALLOWANCE (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "center" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                        No dispatch trip fuel allowance entries found.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j) => (
                      <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap", fontWeight: 600 }}>
                          {formatAppDateTime(j.dispatchDate)}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", fontWeight: 800, color: "var(--primary)" }}>
                          {j.waybillNumber}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", fontWeight: 800, color: "var(--text-main)" }}>
                          {j.truckId || "TRK"} <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>({j.truckPlate})</span>
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem" }}>{j.driverName || "Unassigned"}</td>
                        <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                          {j.pickupLocation} ➔ {j.dropoffLocation}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", fontWeight: 900, color: "#f59e0b" }}>
                          ₱{(j.fuelAllowance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "center" }}>
                          <span className="badge badge-success">{j.deliveryStatus}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: Detailed Top-Up Log Transaction Audit Table */}
        {activeViewTab === "topups" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              🛢️ Station Fuel Top-Up Log Audit History
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>LOG ID</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>DATE &amp; TIME</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>TRUCK &amp; PLATE</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>DRIVER</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>LITERS</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>PRICE/L</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>TOTAL COST (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>STATION &amp; SOURCE</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>ODOMETER (KM)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                        No detailed fuel top-up transactions matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.45rem 0.65rem", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-dim)" }}>{log.id}</td>
                        <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap", fontWeight: 600 }}>
                          {formatAppDateTime(log.topupDate)}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", fontWeight: 800, color: "var(--text-main)" }}>
                          {log.truckId} <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>({log.plateNumber})</span>
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem" }}>{log.driverName || "—"}</td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", fontWeight: 800, color: "#00d4ff" }}>
                          {(log.liters || 0).toFixed(1)} L
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", fontWeight: 700, color: "#10b981" }}>
                          ₱{(log.costPerLiter || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", fontWeight: 900, color: "#f59e0b" }}>
                          ₱{(log.totalCost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem" }}>
                          <div style={{ fontWeight: 600 }}>{log.location || "Station"}</div>
                          {log.containerSource && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{log.containerSource}</div>
                          )}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", color: "var(--text-dim)", fontFamily: "monospace" }}>
                          {log.odometerKm ? `${log.odometerKm.toLocaleString()} Km` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: Tank Gauges & Remaining Fuel Audit Table */}
        {activeViewTab === "tanks" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ⛽ Fleet Tank Gauges &amp; Remaining Fuel Inventory
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>TRUCK UNIT &amp; PLATE</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>VEHICLE MODEL</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>TANK CAPACITY (L)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>REMAINING FUEL (L)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>TANK LEVEL GAUGE (%)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>EST. DRIVING RANGE</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>LAST AUDIT LOG</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "center" }}>STATUS / REFUEL ALERT</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                        No fleet vehicles found.
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((v) => {
                      const capacity = v.fuelCapacityLiters || 300;

                      // Check for latest unit inspection log for this truck
                      const truckInspections = (inspectionLogs || [])
                        .filter((i) => i.truckId === v.id || i.plateNumber === v.plateNumber)
                        .sort((a, b) => (b.inspectionDate || "").localeCompare(a.inspectionDate || ""));
                      const latestInsp = truckInspections[0];

                      const inspFuelLiters = latestInsp?.fuelLiters;
                      const inspFuelPercent = latestInsp?.fuelLevelPercent;

                      const remLiters = inspFuelLiters !== undefined && inspFuelLiters !== null
                        ? inspFuelLiters
                        : v.currentFuelLiters !== undefined && v.currentFuelLiters !== null
                          ? v.currentFuelLiters
                          : v.currentFuelLevelPercent
                            ? Math.round((v.currentFuelLevelPercent / 100) * capacity)
                            : inspFuelPercent !== undefined && inspFuelPercent !== null
                              ? Math.round((inspFuelPercent / 100) * capacity)
                              : Math.round(capacity * 0.70);

                      const levelPercent = inspFuelPercent !== undefined && inspFuelPercent !== null
                        ? inspFuelPercent
                        : v.currentFuelLevelPercent !== undefined && v.currentFuelLevelPercent !== null
                          ? v.currentFuelLevelPercent
                          : capacity > 0 ? Math.min(100, Math.round((remLiters / capacity) * 100)) : 70;

                      const rangeKm = Math.round(remLiters * 2.5); // Estimated 2.5 Km per liter for heavy freight trucks
                      const isLow = levelPercent <= 25;
                      const isCritical = levelPercent <= 12;

                      return (
                        <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                            {v.id} <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 600 }}>({v.plateNumber})</span>
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)" }}>{v.modelType}</td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 700 }}>
                            {capacity} L
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: isCritical ? "#ef4444" : isLow ? "#f59e0b" : "#00d4ff" }}>
                            {remLiters} Liters
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem" }}>
                            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                              <div style={{ flex: 1, height: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border)" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${Math.max(4, levelPercent)}%`,
                                    background: isCritical ? "#ef4444" : isLow ? "#f59e0b" : "linear-gradient(90deg, #10b981, #00d4ff)",
                                    borderRadius: "5px",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: "0.8rem", fontWeight: 800, minWidth: "38px", color: isCritical ? "#ef4444" : isLow ? "#f59e0b" : "#10b981" }}>
                                {levelPercent}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                            ~{rangeKm.toLocaleString()} Km
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", fontSize: "0.78rem" }}>
                            {latestInsp ? (
                              <div>
                                <div style={{ fontWeight: 700 }}>📋 {formatAppDateTime(latestInsp.inspectionDate)}</div>
                                <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                                  Auditor: {latestInsp.inspectorName || "Inspector"} {latestInsp.odometerKm ? `• ${latestInsp.odometerKm.toLocaleString()} KM` : ""}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-dim)" }}>No Inspection Log</span>
                            )}
                          </td>
                          <td style={{ padding: "0.65rem 0.8rem", textAlign: "center" }}>
                            {isCritical ? (
                              <span className="badge badge-danger">🚨 CRITICAL REFUEL</span>
                            ) : isLow ? (
                              <span className="badge badge-warning">⚠️ LOW FUEL ALERT</span>
                            ) : (
                              <span className="badge badge-success">✅ TANK OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
