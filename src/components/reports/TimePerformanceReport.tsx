import React, { useState } from "react";
import { DispatchJob, WaybillReceipt, ClientShipper } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";
import { getAppHour, getAppDayStr, formatHour12 } from "../../utils/dateUtils";

interface TimePerformanceReportProps {
  jobs: DispatchJob[];
  receipts: WaybillReceipt[];
  clients?: ClientShipper[];
  companyName: string;
  companyLogo?: string;
}

export const TimePerformanceReport: React.FC<TimePerformanceReportProps> = ({
  jobs,
  receipts,
  companyName,
  companyLogo,
}) => {
  const [dateRange, setDateRange] = useState("365_days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");



  // Filter valid (non-cancelled, non-draft) jobs within selected date range
  const filteredJobs = jobs.filter((j) => {
    if (j.deliveryStatus === "Cancelled" || j.deliveryStatus === "Draft") return false;
    const dateStr = j.dispatchDate || "";
    return isDateInRange(dateStr, dateRange, customStartDate, customEndDate);
  });

  // Filter receipts within selected date range
  const filteredReceipts = receipts.filter((r) =>
    isDateInRange(r.timestamp, dateRange, customStartDate, customEndDate)
  );

  // Group Dispatches and Receipts by Date & Hour in configured Application Timezone
  const hourlyDispatches: Record<string, number> = {};
  const dailyDispatches: Record<string, number> = {};

  filteredJobs.forEach((j) => {
    const rawDate = j.dispatchDate || "";
    if (!rawDate) return;
    const hour = getAppHour(rawDate);
    const dayStr = getAppDayStr(rawDate);
    if (hour < 0 || !dayStr) return;

    const hourKey = `${dayStr} ${String(hour).padStart(2, "0")}:00`;
    hourlyDispatches[hourKey] = (hourlyDispatches[hourKey] || 0) + 1;
    dailyDispatches[dayStr] = (dailyDispatches[dayStr] || 0) + 1;
  });

  const hourlyBillings: Record<string, number> = {};
  const dailyBillings: Record<string, number> = {};

  filteredReceipts.forEach((r) => {
    const rawDate = r.timestamp || "";
    if (!rawDate) return;
    const hour = getAppHour(rawDate);
    const dayStr = getAppDayStr(rawDate);
    if (hour < 0 || !dayStr) return;

    const hourKey = `${dayStr} ${String(hour).padStart(2, "0")}:00`;
    hourlyBillings[hourKey] = (hourlyBillings[hourKey] || 0) + 1;
    dailyBillings[dayStr] = (dailyBillings[dayStr] || 0) + 1;
  });

  // Key Analytics Calculations
  const activeDispatchHours = Object.keys(hourlyDispatches).length || 1;
  const activeDispatchDays = Object.keys(dailyDispatches).length || 1;

  const totalDispatches = filteredJobs.length;
  const avgDispatchesPerHour = (totalDispatches / activeDispatchHours).toFixed(1);
  const avgDispatchesPerDay = (totalDispatches / activeDispatchDays).toFixed(1);

  const activeBillingHours = Object.keys(hourlyBillings).length || 1;
  const activeBillingDays = Object.keys(dailyBillings).length || 1;

  const totalBillings = filteredReceipts.length;
  const avgBillingsPerHour = (totalBillings / activeBillingHours).toFixed(1);
  const avgBillingsPerDay = (totalBillings / activeBillingDays).toFixed(1);

  const totalOperations = totalDispatches + totalBillings;

  // Helper to format peak hour key into 12-hour format
  const formatPeakHourLabel = (hKey: string) => {
    if (!hKey || hKey === "N/A") return "N/A";
    const parts = hKey.split(" ");
    if (parts.length < 2) return hKey;
    const dayStr = parts[0];
    const hourNum = parseInt(parts[1].split(":")[0], 10);
    return `${dayStr} (${formatHour12(hourNum)})`;
  };

  // Peak Efficiency Hour
  let rawPeakDispatchHourKey = "N/A";
  let peakDispatchCount = 0;
  Object.entries(hourlyDispatches).forEach(([hKey, count]) => {
    if (count > peakDispatchCount) {
      peakDispatchCount = count;
      rawPeakDispatchHourKey = hKey;
    }
  });
  const peakDispatchHourStr = formatPeakHourLabel(rawPeakDispatchHourKey);

  // Hour-by-Hour Breakdown Array (Strictly in configured Application Timezone)
  const hours24List = Array.from({ length: 24 }, (_, i) => i);
  const hourly24Distribution = hours24List.map((h) => {
    let dCount = 0;
    let bCount = 0;

    filteredJobs.forEach((j) => {
      const appHour = getAppHour(j.dispatchDate || "");
      if (appHour === h) dCount++;
    });

    filteredReceipts.forEach((r) => {
      const appHour = getAppHour(r.timestamp || "");
      if (appHour === h) bCount++;
    });

    return {
      hourLabel: `${formatHour12(h)} - ${formatHour12((h + 1) % 24)}`,
      dispatchCount: dCount,
      billingCount: bCount,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="📈 KPI & Velocity Performance Analytics"
        subtitle={`Empirical measure of key performance indicators: dispatch creation speed, hourly throughput, billing generation velocity, and operational capacity (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="time-performance-paper-sheet"
        pdfFilenamePrefix="KPI_Time_Performance_Report"
      />

      {/* Main KPI Stat Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Dispatches Per Hour */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Dispatch Creation Rate</span>
            <span style={{ fontSize: "1.2rem" }}>📦</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#00d4ff" }}>
            {avgDispatchesPerHour} <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 600 }}>/ hour avg</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Total Created: <strong>{totalDispatches}</strong> dispatches ({avgDispatchesPerDay} / active day)
          </div>
        </div>

        {/* Billings Per Hour */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Billing Generation Rate</span>
            <span style={{ fontSize: "1.2rem" }}>🧾</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#10b981" }}>
            {avgBillingsPerHour} <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 600 }}>/ hour avg</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Total Generated: <strong>{totalBillings}</strong> receipts ({avgBillingsPerDay} / active day)
          </div>
        </div>

        {/* Total Operations Logged */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Operations Logged</span>
            <span style={{ fontSize: "1.2rem" }}>⚡</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b" }}>
            {totalOperations} <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 600 }}>Transactions</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Across <strong>{activeDispatchDays}</strong> active operational days
          </div>
        </div>

        {/* Peak Creation Hour */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Peak Dispatch Hour</span>
            <span style={{ fontSize: "1.2rem" }}>🔥</span>
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>
            {peakDispatchCount > 0 ? peakDispatchHourStr : "No Data"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
            Highest velocity: <strong>{peakDispatchCount}</strong> dispatches in 60 mins
          </div>
        </div>
      </div>

      {/* Printable Paper Sheet View */}
      <div
        id="time-performance-paper-sheet"
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
              KPI &amp; VELOCITY PERFORMANCE REPORT
            </h3>
          </div>
        </div>

        {/* Detailed KPI Breakdown Table */}
        <div>
          <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📊 Executive KPI Throughput Metrics
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                <th style={{ padding: "0.65rem 0.8rem", textAlign: "left" }}>KEY PERFORMANCE INDICATOR</th>
                <th style={{ padding: "0.65rem 0.8rem", textAlign: "center" }}>TOTAL VOLUME</th>
                <th style={{ padding: "0.65rem 0.8rem", textAlign: "center" }}>HOURLY AVERAGE</th>
                <th style={{ padding: "0.65rem 0.8rem", textAlign: "right" }}>DAILY AVERAGE</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.65rem 0.8rem", fontWeight: 700 }}>Dispatch Requests Created</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", fontWeight: 800, color: "#00d4ff" }}>{totalDispatches} Dispatches</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", fontWeight: 800, color: "#00d4ff" }}>{avgDispatchesPerHour} / Hour</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 800, color: "#00d4ff" }}>{avgDispatchesPerDay} / Active Day</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.65rem 0.8rem", fontWeight: 700 }}>Billing Receipts Generated</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", fontWeight: 800, color: "#10b981" }}>{totalBillings} Receipts</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", fontWeight: 800, color: "#10b981" }}>{avgBillingsPerHour} / Hour</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontWeight: 800, color: "#10b981" }}>{avgBillingsPerDay} / Active Day</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.65rem 0.8rem", fontWeight: 700 }}>Active Dispatch Operational Hours</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", color: "var(--text-dim)", fontWeight: 700 }}>{activeDispatchHours} Hours</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", color: "var(--text-dim)" }}>-</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", color: "var(--text-dim)", fontWeight: 700 }}>{activeDispatchDays} Active Days</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.65rem 0.8rem", fontWeight: 700 }}>Peak Velocity Time Window</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", color: "#f59e0b", fontWeight: 800 }}>{peakDispatchHourStr}</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "center", color: "#f59e0b", fontWeight: 800 }}>{peakDispatchCount} Peak Dispatches</td>
                <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", color: "#f59e0b" }}>Highest Hourly Burst</td>
              </tr>
              <tr style={{ background: "var(--location-bg)", fontWeight: 800 }}>
                <td style={{ padding: "0.75rem 0.8rem", color: "var(--text-main)" }}>Total Operations Combined</td>
                <td style={{ padding: "0.75rem 0.8rem", textAlign: "center", color: "var(--primary)", fontSize: "0.95rem" }}>{totalOperations} Transactions</td>
                <td style={{ padding: "0.75rem 0.8rem", textAlign: "center", color: "var(--primary)" }}>{((totalOperations) / (Math.max(activeDispatchHours, activeBillingHours))).toFixed(1)} / Hour</td>
                <td style={{ padding: "0.75rem 0.8rem", textAlign: "right", color: "var(--primary)" }}>{((totalOperations) / (Math.max(activeDispatchDays, activeBillingDays))).toFixed(1)} / Active Day</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 24-Hour Distribution Breakdown */}
        <div>
          <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ⏰ 24-Hour Hourly Throughput &amp; Activity Distribution
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "var(--location-bg)", borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>HOUR OF DAY</th>
                  <th style={{ padding: "0.5rem 0.65rem", textAlign: "center" }}>DISPATCH CREATED</th>
                  <th style={{ padding: "0.5rem 0.65rem", textAlign: "center" }}>BILLINGS GENERATED</th>
                  <th style={{ padding: "0.5rem 0.65rem", textAlign: "left" }}>WORKFLOW ACTIVITY VISUALIZER</th>
                </tr>
              </thead>
              <tbody>
                {hourly24Distribution.map((row) => {
                  const maxCount = Math.max(1, totalDispatches);
                  const barWidthPercent = Math.min(100, Math.round((row.dispatchCount / maxCount) * 100 * 3));
                  return (
                    <tr key={row.hourLabel} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.4rem 0.65rem", fontWeight: 700, color: "var(--text-main)", fontFamily: "monospace" }}>
                        {row.hourLabel}
                      </td>
                      <td style={{ padding: "0.4rem 0.65rem", textAlign: "center", fontWeight: 800, color: row.dispatchCount > 0 ? "#00d4ff" : "var(--text-dim)" }}>
                        {row.dispatchCount}
                      </td>
                      <td style={{ padding: "0.4rem 0.65rem", textAlign: "center", fontWeight: 800, color: row.billingCount > 0 ? "#10b981" : "var(--text-dim)" }}>
                        {row.billingCount}
                      </td>
                      <td style={{ padding: "0.4rem 0.65rem" }}>
                        {row.dispatchCount > 0 || row.billingCount > 0 ? (
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <div style={{ height: "8px", width: `${Math.max(8, barWidthPercent)}%`, background: "linear-gradient(90deg, #00d4ff, #10b981)", borderRadius: "4px" }} />
                            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 }}>
                              {row.dispatchCount + row.billingCount} ops
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
