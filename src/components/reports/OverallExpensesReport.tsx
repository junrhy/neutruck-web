import React, { useState } from "react";
import { DispatchJob, MaintenanceLog, FuelTopupLog, TruckVehicle } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";
import { formatAppDateTime } from "../../utils/dateUtils";

interface OverallExpensesReportProps {
  jobs: DispatchJob[];
  maintenanceLogs: MaintenanceLog[];
  topupLogs?: FuelTopupLog[];
  vehicles?: TruckVehicle[];
  companyName: string;
  companyLogo?: string;
}

export const OverallExpensesReport: React.FC<OverallExpensesReportProps> = ({
  jobs,
  maintenanceLogs,
  topupLogs = [],
  vehicles = [],
  companyName,
  companyLogo,
}) => {
  const [dateRange, setDateRange] = useState("365_days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "trucks" | "timeline">("summary");

  // Filter datasets by date range
  const filteredJobs = jobs.filter(
    (j) => j.deliveryStatus !== "Cancelled" && isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate)
  );

  const filteredMaintenance = maintenanceLogs.filter((m) =>
    isDateInRange(m.serviceDate, dateRange, customStartDate, customEndDate)
  );

  const filteredTopups = topupLogs.filter((t) =>
    isDateInRange(t.topupDate, dateRange, customStartDate, customEndDate)
  );

  // Overall Category Totals
  const totalDriverBirada = filteredJobs.reduce((sum, j) => sum + (j.driverRate || 0), 0);
  const totalHelperBirada = filteredJobs.reduce((sum, j) => sum + (j.helperCommission || 0), 0);
  const totalBiradaPayroll = totalDriverBirada + totalHelperBirada;

  const totalFuelAllowance = filteredJobs.reduce(
    (sum, j) => sum + (j.fuelAllowance || 0) + (j.hasReturnTrip ? j.returnFuelAllowance || 0 : 0),
    0
  );

  const totalRoroFees = filteredJobs.reduce((sum, j) => {
    const multiStopRoroSum = (j.dropoffStops || []).reduce((stSum, st) => stSum + (st.roroLeg?.ticketFee || 0), 0);
    return sum + (j.roroTicketFee || 0) + multiStopRoroSum + (j.hasReturnTrip ? j.returnRoroTicketFee || 0 : 0);
  }, 0);

  const totalRepairsCost = filteredMaintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  const totalStationTopupsCost = filteredTopups.reduce((sum, t) => sum + (t.totalCost || 0), 0);
  const totalTopupLiters = filteredTopups.reduce((sum, t) => sum + (t.liters || 0), 0);

  const grandTotalExpenses = totalBiradaPayroll + totalFuelAllowance + totalRoroFees + totalRepairsCost + totalStationTopupsCost;

  // Per-Truck Expenses Breakdown Aggregation
  const truckExpenseMap: Record<
    string,
    {
      truckId: string;
      plateNumber: string;
      modelType: string;
      birada: number;
      fuelAllowance: number;
      roroFees: number;
      repairs: number;
      topups: number;
      total: number;
      dispatchesCount: number;
    }
  > = {};

  // Initialize from vehicles list
  vehicles.forEach((v) => {
    truckExpenseMap[v.id] = {
      truckId: v.id,
      plateNumber: v.plateNumber,
      modelType: v.modelType,
      birada: 0,
      fuelAllowance: 0,
      roroFees: 0,
      repairs: 0,
      topups: 0,
      total: 0,
      dispatchesCount: 0,
    };
  });

  // Aggregate Jobs data per truck
  filteredJobs.forEach((j) => {
    const key = j.truckId || j.truckPlate;
    if (!truckExpenseMap[key]) {
      truckExpenseMap[key] = {
        truckId: j.truckId || "TRK",
        plateNumber: j.truckPlate || "UNKNOWN",
        modelType: "Heavy Freight",
        birada: 0,
        fuelAllowance: 0,
        roroFees: 0,
        repairs: 0,
        topups: 0,
        total: 0,
        dispatchesCount: 0,
      };
    }

    const item = truckExpenseMap[key];
    const biradaSum = (j.driverRate || 0) + (j.helperCommission || 0);
    const fuelSum = (j.fuelAllowance || 0) + (j.hasReturnTrip ? j.returnFuelAllowance || 0 : 0);
    const multiStopRoroSum = (j.dropoffStops || []).reduce((stSum, st) => stSum + (st.roroLeg?.ticketFee || 0), 0);
    const roroSum = (j.roroTicketFee || 0) + multiStopRoroSum + (j.hasReturnTrip ? j.returnRoroTicketFee || 0 : 0);

    item.birada += biradaSum;
    item.fuelAllowance += fuelSum;
    item.roroFees += roroSum;
    item.dispatchesCount += 1;
    item.total += biradaSum + fuelSum + roroSum;
  });

  // Aggregate Maintenance data per truck
  filteredMaintenance.forEach((m) => {
    const key = m.truckId || m.plateNumber;
    if (!truckExpenseMap[key]) {
      truckExpenseMap[key] = {
        truckId: m.truckId || "TRK",
        plateNumber: m.plateNumber || "UNKNOWN",
        modelType: "Heavy Freight",
        birada: 0,
        fuelAllowance: 0,
        roroFees: 0,
        repairs: 0,
        topups: 0,
        total: 0,
        dispatchesCount: 0,
      };
    }
    truckExpenseMap[key].repairs += m.cost || 0;
    truckExpenseMap[key].total += m.cost || 0;
  });

  // Aggregate Top-Ups data per truck
  filteredTopups.forEach((t) => {
    const key = t.truckId || t.plateNumber;
    if (!truckExpenseMap[key]) {
      truckExpenseMap[key] = {
        truckId: t.truckId || "TRK",
        plateNumber: t.plateNumber || "UNKNOWN",
        modelType: "Heavy Freight",
        birada: 0,
        fuelAllowance: 0,
        roroFees: 0,
        repairs: 0,
        topups: 0,
        total: 0,
        dispatchesCount: 0,
      };
    }
    truckExpenseMap[key].topups += t.totalCost || 0;
    truckExpenseMap[key].total += t.totalCost || 0;
  });

  const truckExpenseList = Object.values(truckExpenseMap)
    .filter((t) => t.total > 0 || t.dispatchesCount > 0)
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.truckId.toLowerCase().includes(q) ||
        t.plateNumber.toLowerCase().includes(q) ||
        t.modelType.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.total - a.total);

  // Consolidated Expense Timeline (Jobs, Repairs, Topups combined into single audit feed)
  type CombinedExpenseLog = {
    id: string;
    date: string;
    type: "BIRADA & ALLOWANCE" | "REPAIRS & MAINTENANCE" | "STATION TOP-UP";
    truck: string;
    details: string;
    amount: number;
    badgeClass: string;
  };

  const combinedTimelineLogs: CombinedExpenseLog[] = [
    ...filteredJobs.map((j) => {
      const bSum = (j.driverRate || 0) + (j.helperCommission || 0);
      const fSum = (j.fuelAllowance || 0) + (j.hasReturnTrip ? j.returnFuelAllowance || 0 : 0);
      const multiRoro = (j.dropoffStops || []).reduce((stSum, st) => stSum + (st.roroLeg?.ticketFee || 0), 0);
      const rSum = (j.roroTicketFee || 0) + multiRoro + (j.hasReturnTrip ? j.returnRoroTicketFee || 0 : 0);
      const tot = bSum + fSum + rSum;

      return {
        id: `job-${j.id}`,
        date: j.dispatchDate,
        type: "BIRADA & ALLOWANCE" as const,
        truck: `${j.truckId || "TRK"} (${j.truckPlate})`,
        details: `WB #${j.waybillNumber} • Birada: ₱${bSum.toLocaleString()} | Fuel: ₱${fSum.toLocaleString()} ${rSum > 0 ? `| RoRo: ₱${rSum.toLocaleString()}` : ""}`,
        amount: tot,
        badgeClass: "badge-success",
      };
    }),
    ...filteredMaintenance.map((m) => ({
      id: `maint-${m.id}`,
      date: m.serviceDate,
      type: "REPAIRS & MAINTENANCE" as const,
      truck: m.plateNumber,
      details: `${m.serviceType} • Odometer: ${m.odometerKm ? `${m.odometerKm.toLocaleString()} KM` : "—"}`,
      amount: m.cost || 0,
      badgeClass: "badge-danger",
    })),
    ...filteredTopups.map((t) => ({
      id: `topup-${t.id}`,
      date: t.topupDate,
      type: "STATION TOP-UP" as const,
      truck: `${t.truckId} (${t.plateNumber})`,
      details: `${t.location} (${t.containerSource}) • ${t.liters}L @ ₱${t.costPerLiter}/L`,
      amount: t.totalCost || 0,
      badgeClass: "badge-warning",
    })),
  ]
    .filter((log) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.type.toLowerCase().includes(q) ||
        log.truck.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="📊 Master Overall Fleet Expenses Report"
        subtitle={`Consolidated financial audit of all operational expenses: Birada payroll, fuel allowances, station top-ups, repairs & maintenance, and RoRo ferry fees (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="overall-expenses-paper-sheet"
        pdfFilenamePrefix="Master_Overall_Fleet_Expenses_Report"
      />

      {/* Main KPI Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {/* Grand Total Expenses */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Grand Total Expenses</span>
            <span style={{ fontSize: "1.2rem" }}>💰</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ef4444" }}>
            ₱{grandTotalExpenses.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Across all 5 expense categories
          </div>
        </div>

        {/* Birada Payroll */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Driver &amp; Helper Birada</span>
            <span style={{ fontSize: "1.2rem" }}>💵</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#10b981" }}>
            ₱{totalBiradaPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Driver: ₱{totalDriverBirada.toLocaleString()} | Helper: ₱{totalHelperBirada.toLocaleString()}
          </div>
        </div>

        {/* Fuel Allowances */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Dispatch Fuel Allowances</span>
            <span style={{ fontSize: "1.2rem" }}>💸</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#00d4ff" }}>
            ₱{totalFuelAllowance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Allocated fuel money for trip legs
          </div>
        </div>

        {/* Station Fuel Top-Ups */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Station Top-Up Audit</span>
            <span style={{ fontSize: "1.2rem" }}>🛢️</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b" }}>
            ₱{totalStationTopupsCost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Actual refuels: <strong>{totalTopupLiters.toFixed(1)} Liters</strong>
          </div>
        </div>

        {/* Repairs & Maintenance */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Repairs &amp; Maintenance</span>
            <span style={{ fontSize: "1.2rem" }}>🔧</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#a855f7" }}>
            ₱{totalRepairsCost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Total servicing &amp; parts replacement
          </div>
        </div>

        {/* RoRo Ferry Tickets */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>RoRo Ferry Tickets</span>
            <span style={{ fontSize: "1.2rem" }}>⛴️</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#3b82f6" }}>
            ₱{totalRoroFees.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Inter-island sea passage tickets
          </div>
        </div>
      </div>

      {/* Filter & Sub-Tab Switcher Row */}
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
            onClick={() => setActiveTab("summary")}
            className={`btn btn-sm ${activeTab === "summary" ? "btn-primary" : "btn-outline"}`}
          >
            📊 Master Category Breakdown
          </button>
          <button
            onClick={() => setActiveTab("trucks")}
            className={`btn btn-sm ${activeTab === "trucks" ? "btn-primary" : "btn-outline"}`}
          >
            🚛 Per-Truck Expense Audit ({truckExpenseList.length})
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`btn btn-sm ${activeTab === "timeline" ? "btn-primary" : "btn-outline"}`}
          >
            📑 Consolidated Expense Timeline ({combinedTimelineLogs.length})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "240px" }}>
          <span style={{ fontSize: "1.1rem" }}>🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search truck plate, service type, station or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Printable Paper Sheet Container */}
      <div
        id="overall-expenses-paper-sheet"
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
        {/* Paper Header */}
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
              MASTER OVERALL FLEET OPERATIONAL EXPENSES REPORT
            </h3>
          </div>
        </div>

        {/* VIEW 1: MASTER CATEGORY BREAKDOWN TABLE */}
        {activeTab === "summary" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📋 Categorized Operational Expenditure Summary
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>EXPENSE CATEGORY</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>DETAILS &amp; SUB-BREAKDOWN</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>AMOUNT (₱)</th>
                    <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>% OF TOTAL OVERHEAD</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Category 1: Birada Payroll */}
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                      💵 Driver &amp; Helper Birada Payroll
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                      Driver Rates: ₱{totalDriverBirada.toLocaleString()} | Helper Commissions: ₱{totalHelperBirada.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: "#10b981" }}>
                      ₱{totalBiradaPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem" }}>
                      {(() => {
                        const pct = grandTotalExpenses > 0 ? Math.round((totalBiradaPayroll / grandTotalExpenses) * 100) : 0;
                        return (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ height: "8px", width: `${Math.max(4, pct)}%`, background: "#10b981", borderRadius: "4px" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Category 2: Fuel Allowance */}
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                      💸 Dispatch Fuel Allowances (Given to Drivers)
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                      Outbound + Return trip fuel allocations across {filteredJobs.length} dispatches
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: "#00d4ff" }}>
                      ₱{totalFuelAllowance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem" }}>
                      {(() => {
                        const pct = grandTotalExpenses > 0 ? Math.round((totalFuelAllowance / grandTotalExpenses) * 100) : 0;
                        return (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ height: "8px", width: `${Math.max(4, pct)}%`, background: "#00d4ff", borderRadius: "4px" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Category 3: Station Topups */}
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                      🛢️ Station Fuel Top-Up Audit (Actual Refuels)
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                      Actual refuels logged at Gas Station or Yard ({totalTopupLiters.toFixed(1)} Liters)
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: "#f59e0b" }}>
                      ₱{totalStationTopupsCost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem" }}>
                      {(() => {
                        const pct = grandTotalExpenses > 0 ? Math.round((totalStationTopupsCost / grandTotalExpenses) * 100) : 0;
                        return (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ height: "8px", width: `${Math.max(4, pct)}%`, background: "#f59e0b", borderRadius: "4px" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Category 4: Maintenance */}
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                      🔧 Fleet Repairs &amp; Servicing Maintenance
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                      Engine overhauls, oil changes, tire replacements &amp; PMS ({filteredMaintenance.length} service logs)
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: "#a855f7" }}>
                      ₱{totalRepairsCost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem" }}>
                      {(() => {
                        const pct = grandTotalExpenses > 0 ? Math.round((totalRepairsCost / grandTotalExpenses) * 100) : 0;
                        return (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ height: "8px", width: `${Math.max(4, pct)}%`, background: "#a855f7", borderRadius: "4px" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Category 5: RoRo Fees */}
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.65rem 0.8rem", fontWeight: 800, color: "var(--text-main)" }}>
                      ⛴️ Inter-Island RoRo Passage Tickets
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                      Ferry tickets across inter-island routes &amp; drop-off legs
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 900, color: "#3b82f6" }}>
                      ₱{totalRoroFees.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.8rem" }}>
                      {(() => {
                        const pct = grandTotalExpenses > 0 ? Math.round((totalRoroFees / grandTotalExpenses) * 100) : 0;
                        return (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ height: "8px", width: `${Math.max(4, pct)}%`, background: "#3b82f6", borderRadius: "4px" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr style={{ background: "var(--location-bg)", fontWeight: 900, fontSize: "1rem" }}>
                    <td style={{ padding: "0.85rem 0.8rem" }}>GRAND TOTAL OVERHEAD</td>
                    <td style={{ padding: "0.85rem 0.8rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                      All operational expenditures combined
                    </td>
                    <td style={{ padding: "0.85rem 0.8rem", textAlign: "right", color: "#ef4444" }}>
                      ₱{grandTotalExpenses.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.85rem 0.8rem" }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: PER-TRUCK EXPENSES AUDIT */}
        {activeTab === "trucks" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              🚛 Per-Truck Comprehensive Expense Audit
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>TRUCK UNIT &amp; PLATE</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "center" }}>DISPATCHES</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>BIRADA (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>FUEL ALLOWANCE (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>TOP-UPS (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>REPAIRS (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>RORO FEES (₱)</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>TOTAL EXPENSE (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {truckExpenseList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                        No vehicle expense data matching filters.
                      </td>
                    </tr>
                  ) : (
                    truckExpenseList.map((t) => (
                      <tr key={t.truckId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.45rem 0.65rem", fontWeight: 800, color: "var(--text-main)" }}>
                          {t.truckId} <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>({t.plateNumber})</span>
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "center", fontWeight: 700 }}>
                          {t.dispatchesCount} Trips
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                          ₱{t.birada.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", color: "#00d4ff", fontWeight: 700 }}>
                          ₱{t.fuelAllowance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", color: "#f59e0b", fontWeight: 700 }}>
                          ₱{t.topups.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", color: "#a855f7", fontWeight: 700 }}>
                          ₱{t.repairs.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", color: "#3b82f6", fontWeight: 700 }}>
                          ₱{t.roroFees.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", fontWeight: 900, color: "#ef4444", fontSize: "0.9rem" }}>
                          ₱{t.total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: CONSOLIDATED EXPENSE TIMELINE */}
        {activeTab === "timeline" && (
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📑 Consolidated Master Expense Activity Feed
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>DATE</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>EXPENSE CATEGORY</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>TRUCK UNIT</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>DETAILS &amp; DESCRIPTION</th>
                    <th style={{ padding: "0.5rem 0.65rem", textAlign: "right" }}>AMOUNT (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedTimelineLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                        No operational expense activities matching criteria.
                      </td>
                    </tr>
                  ) : (
                    combinedTimelineLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.45rem 0.65rem", whiteSpace: "nowrap", fontWeight: 600 }}>
                          {formatAppDateTime(log.date)}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem" }}>
                          <span className={`badge ${log.badgeClass}`}>{log.type}</span>
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", fontWeight: 800 }}>
                          {log.truck}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem" }}>
                          {log.details}
                        </td>
                        <td style={{ padding: "0.45rem 0.65rem", textAlign: "right", fontWeight: 900, color: "#ef4444" }}>
                          ₱{log.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
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
