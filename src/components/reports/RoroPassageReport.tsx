import React, { useState } from "react";
import { DispatchJob } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface RoroPassageReportProps {
  jobs: DispatchJob[];
}

export const RoroPassageReport: React.FC<RoroPassageReportProps> = ({ jobs }) => {
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const filteredJobs = jobs.filter((j) => isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="⛴️ Inter-Island RoRo Passage Report"
        subtitle="Shipping line ferry passages, sea crossing routes, truck ticket expenses, and inter-island trip dispatches."
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="roro-passage-report-sheet"
        pdfFilenamePrefix="Roro_Passage_Report"
      />

      <div id="roro-passage-report-sheet" className="table-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
          ⛴️ Inter-Island RoRo Passage &amp; Shipping Line Expenses
        </div>
        <table>
          <thead>
            <tr>
              <th>Waybill / Job ID</th>
              <th>Client</th>
              <th>RoRo Passage Route</th>
              <th>Ferry Shipping Line</th>
              <th>Truck Plate</th>
              <th>RoRo Ticket Fee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.filter((j) => j.isInterIsland).map((j) => (
              <tr key={j.id}>
                <td style={{ fontWeight: 700 }}>{j.waybillNumber}</td>
                <td>{j.clientName}</td>
                <td style={{ color: "var(--purple)", fontWeight: 700 }}>⛴️ {j.roroRoute}</td>
                <td>{j.shippingLine || "FastCat / Starlite"}</td>
                <td><strong>{j.truckPlate}</strong></td>
                <td style={{ fontWeight: 800, color: "var(--warning)" }}>₱{(j.roroTicketFee || 0).toLocaleString()}</td>
                <td><span className="badge badge-purple">{j.deliveryStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
