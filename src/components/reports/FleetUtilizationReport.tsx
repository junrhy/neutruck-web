import React, { useState } from "react";
import { DispatchJob, TruckVehicle, MaintenanceLog } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface FleetUtilizationReportProps {
  vehicles: TruckVehicle[];
  jobs: DispatchJob[];
  maintenanceLogs?: MaintenanceLog[];
}

export const FleetUtilizationReport: React.FC<FleetUtilizationReportProps> = ({
  vehicles,
  jobs,
  maintenanceLogs = [],
}) => {
  const [dateRange, setDateRange] = useState("180_days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const filteredJobs = jobs.filter((j) => isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate));
  const filteredMaintenanceLogs = maintenanceLogs.filter((m) => isDateInRange(m.serviceDate, dateRange, customStartDate, customEndDate));

  // Compute Per-Truck Analytics
  const truckPerformance = vehicles.map((v) => {
    const truckJobs = filteredJobs.filter((j) => j.truckId === v.id || j.truckPlate === v.plateNumber);
    const truckLogs = filteredMaintenanceLogs.filter((m) => m.truckId === v.id || m.plateNumber === v.plateNumber);

    const totalTons = truckJobs.reduce((sum, j) => sum + (j.weightTons || 0), 0);
    const grossRevenue = truckJobs.reduce((sum, j) => sum + (j.freightFee || 0), 0);

    const fuelCosts = truckJobs.reduce((sum, j) => sum + (j.fuelAllowance || 0), 0);
    const driverCosts = truckJobs.reduce((sum, j) => sum + (j.driverRate || 0), 0);
    const helperCosts = truckJobs.reduce((sum, j) => sum + (j.helperCommission || 0), 0);
    const roroCosts = truckJobs.reduce((sum, j) => sum + (j.roroTicketFee || 0), 0);
    const tripExpenses = fuelCosts + driverCosts + helperCosts + roroCosts;

    const maintenanceCosts = truckLogs.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalExpenses = tripExpenses + maintenanceCosts;
    const netProfit = grossRevenue - totalExpenses;

    const maintenanceRatio = grossRevenue > 0 ? (maintenanceCosts / grossRevenue) * 100 : maintenanceCosts > 0 ? 100 : 0;

    // Retirement Advisory Logic:
    // 🔴 Retire Candidate: Negative Net Profit OR Maintenance Ratio > 30% OR status is Decommissioned
    // 🟡 Monitor High Repair Cost: Maintenance Ratio between 15% and 30%
    // 🟢 Optimal Performance: Healthy profit margin & Maintenance Ratio < 15%
    let healthStatus: "retire" | "warning" | "healthy" = "healthy";
    let healthBadge = "🟢 Optimal";
    let healthReason = "Strong net returns, low maintenance overhead.";

    if (v.status === "Decommissioned" || v.isArchived) {
      healthStatus = "retire";
      healthBadge = "🛠️ Decommissioned";
      healthReason = v.decommissionReason || "Vehicle retired from active service.";
    } else if (netProfit < 0 || maintenanceRatio >= 30) {
      healthStatus = "retire";
      healthBadge = "🔴 Retire Candidate";
      healthReason = netProfit < 0 ? "Negative Net Operating Profit (Bleeding Money)" : `High Maintenance Drag (${maintenanceRatio.toFixed(1)}% of Revenue)`;
    } else if (maintenanceRatio >= 15 || truckLogs.length >= 4) {
      healthStatus = "warning";
      healthBadge = "🟡 Monitor Overhead";
      healthReason = `Elevated repair costs (${maintenanceRatio.toFixed(1)}% of Revenue, ${truckLogs.length} repairs)`;
    }

    return {
      vehicle: v,
      completedTrips: truckJobs.length,
      totalTons,
      grossRevenue,
      tripExpenses,
      maintenanceCosts,
      totalExpenses,
      netProfit,
      maintenanceRatio,
      repairCount: truckLogs.length,
      healthStatus,
      healthBadge,
      healthReason,
    };
  });

  // Summary Metrics
  const totalFleetRevenue = truckPerformance.reduce((sum, t) => sum + t.grossRevenue, 0);
  const totalFleetExpenses = truckPerformance.reduce((sum, t) => sum + t.totalExpenses, 0);
  const totalFleetProfit = totalFleetRevenue - totalFleetExpenses;
  const flaggedRetireCount = truckPerformance.filter((t) => t.healthStatus === "retire" && t.vehicle.status !== "Decommissioned").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="🚚 Fleet Performance & Retirement Advisory Engine"
        subtitle="Analytical breakdown of revenue contribution, operating expenses, repair drag %, net profitability, and vehicle retirement recommendations."
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="fleet-utilization-report-sheet"
        pdfFilenamePrefix="Fleet_Performance_Report"
      />

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Fleet Net Operating Profit</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: totalFleetProfit >= 0 ? "var(--success)" : "#f43f5e", margin: "0.1rem 0 0 0" }}>
              ₱{totalFleetProfit.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(244, 63, 94, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
            ⚠️
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Retirement Advisory Flag</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: flaggedRetireCount > 0 ? "#f43f5e" : "var(--success)", margin: "0.1rem 0 0 0" }}>
              {flaggedRetireCount} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-dim)" }}>truck{flaggedRetireCount === 1 ? "" : "s"} flagged</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(99, 102, 241, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
            🚛
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Active Fleet Monitored</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--primary)", margin: "0.1rem 0 0 0" }}>
              {vehicles.filter((v) => v.status !== "Decommissioned").length} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-dim)" }}>vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div id="fleet-utilization-report-sheet" className="table-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🚛 Vehicle Performance, Maintenance Drag &amp; Retirement Recommendation</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 400 }}>
            *Retirement threshold: Maintenance Costs &gt; 30% Revenue OR Negative Profit
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Plate / Model</th>
              <th>Trips / Tonnage</th>
              <th>Gross Revenue</th>
              <th>Repair Costs</th>
              <th>Maint. Drag %</th>
              <th>Net Operating Profit</th>
              <th>Performance &amp; Retirement Advisory</th>
            </tr>
          </thead>
          <tbody>
            {truckPerformance.map((t) => (
              <tr key={t.vehicle.id} style={{ background: t.healthStatus === "retire" && t.vehicle.status !== "Decommissioned" ? "rgba(244, 63, 94, 0.05)" : "transparent" }}>
                <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{t.vehicle.id}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>{t.vehicle.plateNumber}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.vehicle.modelType}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{t.completedTrips} Dispatches</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--purple)" }}>{t.totalTons} Tons</div>
                </td>
                <td style={{ fontWeight: 700, color: "var(--text-main)" }}>
                  ₱{t.grossRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
                <td style={{ fontSize: "0.85rem", color: t.maintenanceCosts > 0 ? "#f43f5e" : "var(--text-muted)" }}>
                  <div>₱{t.maintenanceCosts.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>({t.repairCount} service logs)</div>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      padding: "0.25rem 0.55rem",
                      borderRadius: "6px",
                      background: t.maintenanceRatio >= 30 ? "rgba(244, 63, 94, 0.15)" : t.maintenanceRatio >= 15 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      color: t.maintenanceRatio >= 30 ? "#f43f5e" : t.maintenanceRatio >= 15 ? "#f59e0b" : "#10b981",
                    }}
                  >
                    {t.maintenanceRatio.toFixed(1)}%
                  </span>
                </td>
                <td style={{ fontWeight: 800, color: t.netProfit >= 0 ? "var(--success)" : "#f43f5e" }}>
                  ₱{t.netProfit.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{t.healthBadge}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", maxWidth: "230px" }}>{t.healthReason}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
