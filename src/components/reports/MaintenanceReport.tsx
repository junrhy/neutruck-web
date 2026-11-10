import React, { useState } from "react";
import { MaintenanceLog } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface MaintenanceReportProps {
  maintenanceLogs: MaintenanceLog[];
}

export const MaintenanceReport: React.FC<MaintenanceReportProps> = ({ maintenanceLogs }) => {
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const filteredLogs = maintenanceLogs.filter((m) => isDateInRange(m.serviceDate, dateRange, customStartDate, customEndDate));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="🔧 Vehicle Repairs &amp; Service Expense Report"
        subtitle="Truck maintenance logs, service types, repair costs, odometer readings, and fleet servicing histories."
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="maintenance-report-sheet"
        pdfFilenamePrefix="Maintenance_Expense_Report"
      />

      <div id="maintenance-report-sheet" className="table-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
          🔧 Vehicle Repairs &amp; Maintenance Service Logs
        </div>
        <table>
          <thead>
            <tr>
              <th>Service Date</th>
              <th>Truck Plate</th>
              <th>Service Type / Repair</th>
              <th>Cost (₱)</th>
              <th>Odometer (Km)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((m) => (
              <tr key={m.id}>
                <td>{m.serviceDate}</td>
                <td style={{ fontWeight: 700 }}>{m.plateNumber}</td>
                <td><span className="badge badge-purple">{m.serviceType}</span></td>
                <td style={{ fontWeight: 800, color: "var(--danger)" }}>₱{m.cost.toLocaleString()}</td>
                <td style={{ fontFamily: "monospace" }}>{m.odometerKm.toLocaleString()} Km</td>
                <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{m.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
