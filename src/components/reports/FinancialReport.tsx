import React, { useState } from "react";
import { DispatchJob, MaintenanceLog } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface FinancialReportProps {
  jobs: DispatchJob[];
  maintenanceLogs: MaintenanceLog[];
  companyName: string;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  jobs,
  maintenanceLogs,
  companyName,
}) => {
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Filter dataset by date range
  const filteredJobs = jobs.filter((j) => isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate));
  const validJobs = filteredJobs.filter((j) => j.deliveryStatus !== "Cancelled");
  const filteredMaintenance = maintenanceLogs.filter((m) => isDateInRange(m.serviceDate, dateRange, customStartDate, customEndDate));

  // Calculations
  const totalPrimaryRevenue = validJobs.reduce((sum, j) => sum + (j.freightFee || 0), 0);
  const totalBackhaulRevenue = validJobs.reduce((sum, j) => sum + (j.hasReturnTrip && j.returnCargoType === "Backhaul Cargo" ? (j.returnFreightFee || 0) : 0), 0);
  const totalFreightRevenue = totalPrimaryRevenue + totalBackhaulRevenue;

  const totalFuelAllowance = validJobs.reduce((sum, j) => sum + (j.fuelAllowance || 0) + (j.hasReturnTrip ? (j.returnFuelAllowance || 0) : 0), 0);
  const totalDriverRate = validJobs.reduce((sum, j) => sum + (j.driverRate || 0), 0);
  const totalRoroFees = validJobs.reduce((sum, j) => sum + (j.roroTicketFee || 0) + (j.hasReturnTrip ? (j.returnRoroTicketFee || 0) : 0), 0);
  const totalMaintenanceCost = filteredMaintenance.reduce((sum, m) => sum + m.cost, 0);

  const netOperatingMargin = totalFreightRevenue - (totalFuelAllowance + totalDriverRate + totalRoroFees + totalMaintenanceCost);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Dedicated Per-Page Report Header */}
      <ReportHeader
        title="💰 Financial Profit &amp; Loss (P&amp;L) Report"
        subtitle={`Gross freight revenue, diesel fuel allowances, driver pay, ferry tickets, and net operating profit analysis (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="financial-report-sheet"
        pdfFilenamePrefix="Financial_PnL_Report"
      />

      <div id="financial-report-sheet" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "var(--text-main)" }}>📋 Financial Profit &amp; Loss Summary</h3>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border)", height: "40px" }}>
              <td><strong>Gross Primary Freight Billing Revenue</strong></td>
              <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>+ ₱{totalPrimaryRevenue.toLocaleString()}</td>
            </tr>
            {totalBackhaulRevenue > 0 && (
              <tr style={{ borderBottom: "1px solid var(--border)", height: "40px" }}>
                <td><strong>Gross Backhaul Freight Cargo Revenue</strong></td>
                <td style={{ textAlign: "right", fontWeight: 700, color: "var(--purple)" }}>+ ₱{totalBackhaulRevenue.toLocaleString()}</td>
              </tr>
            )}
            <tr style={{ borderBottom: "1px solid var(--border)", height: "40px" }}>
              <td>Less: Diesel Fuel Allowances Paid (Outbound &amp; Return)</td>
              <td style={{ textAlign: "right", color: "var(--warning)" }}>- ₱{totalFuelAllowance.toLocaleString()}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)", height: "40px" }}>
              <td>Less: Driver Pay &amp; Trip Commissions</td>
              <td style={{ textAlign: "right", color: "var(--warning)" }}>- ₱{totalDriverRate.toLocaleString()}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)", height: "40px" }}>
              <td>Less: Inter-Island RoRo Ferry Passage Tickets</td>
              <td style={{ textAlign: "right", color: "var(--warning)" }}>- ₱{totalRoroFees.toLocaleString()}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)", height: "40px" }}>
              <td>Less: Fleet Maintenance &amp; Repair Overhead</td>
              <td style={{ textAlign: "right", color: "var(--danger)" }}>- ₱{totalMaintenanceCost.toLocaleString()}</td>
            </tr>
            <tr style={{ height: "48px", background: "var(--primary-alpha)", fontWeight: 800 }}>
              <td style={{ paddingLeft: "1rem" }}>NET OPERATING PROFIT MARGIN</td>
              <td style={{ textAlign: "right", paddingRight: "1rem", color: netOperatingMargin >= 0 ? "var(--success)" : "var(--danger)", fontSize: "1.1rem" }}>
                ₱{netOperatingMargin.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Per-Waybill Profitability Analysis Table */}
      <div className="table-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)", overflowX: "auto" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🚚 Per-Waybill Dispatch P&amp;L Financial Breakdown</span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 400 }}>
            Showing {validJobs.length} Dispatch Job{validJobs.length === 1 ? "" : "s"}
          </span>
        </div>
        <table style={{ width: "max-content", minWidth: "100%", whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th>Waybill No.</th>
              <th>Client Shipper</th>
              <th>Route / Destinations</th>
              <th>Gross Revenue</th>
              <th>Trip Expenses</th>
              <th>Net Profit / Loss</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            {validJobs.length > 0 ? (
              validJobs.map((j) => {
                const primaryRevenue = j.freightFee || 0;
                const backhaulRevenue = j.hasReturnTrip && j.returnCargoType === "Backhaul Cargo" ? (j.returnFreightFee || 0) : 0;
                const totalRevenue = primaryRevenue + backhaulRevenue;

                const fuelExp = (j.fuelAllowance || 0) + (j.hasReturnTrip ? (j.returnFuelAllowance || 0) : 0);
                const driverExp = j.driverRate || 0;
                const multiStopRoroSum = (j.dropoffStops || []).reduce((sum, st) => sum + (st.roroLeg?.ticketFee || 0), 0);
                const roroExp = (j.roroTicketFee || 0) + multiStopRoroSum + (j.hasReturnTrip ? (j.returnRoroTicketFee || 0) : 0);
                const totalTripExpense = fuelExp + driverExp + roroExp;

                const netProfit = totalRevenue - totalTripExpense;
                const marginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

                return (
                  <tr key={j.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                      {j.waybillNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{j.clientName}</td>
                    <td style={{ fontSize: "0.82rem" }}>
                      <div>{j.pickupLocation} ➔ {j.dropoffStops && j.dropoffStops.length > 0 ? `${j.dropoffStops.length} Stops Route` : j.dropoffLocation}</div>
                      {j.isInterIsland && <span style={{ fontSize: "0.72rem", color: "var(--primary)" }}>⛴️ RoRo Passage</span>}
                      {j.hasReturnTrip && <span style={{ fontSize: "0.72rem", color: "var(--warning)", marginLeft: "0.4rem" }}>🔄 Return Trip</span>}
                    </td>
                    <td style={{ fontWeight: 800, color: "var(--success)" }}>
                      ₱{totalRevenue.toLocaleString()}
                      {backhaulRevenue > 0 && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>(incl. ₱{backhaulRevenue.toLocaleString()} backhaul)</div>}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      <strong style={{ color: "var(--danger)" }}>₱{totalTripExpense.toLocaleString()}</strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        Fuel: ₱{fuelExp.toLocaleString()} | Driver: ₱{driverExp.toLocaleString()} {roroExp > 0 ? `| RoRo: ₱${roroExp.toLocaleString()}` : ""}
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: "0.95rem", color: netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {netProfit >= 0 ? "+" : ""}₱{netProfit.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${Number(marginPercent) >= 20 ? "badge-success" : Number(marginPercent) >= 0 ? "badge-warning" : "badge-danger"}`}>
                        {marginPercent}%
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
                  No active dispatches found for financial P&amp;L analysis in this date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
};
