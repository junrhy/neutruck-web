import React, { useState } from "react";
import { DispatchJob, WaybillReceipt } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface AccountsReceivableReportProps {
  jobs: DispatchJob[];
  receipts: WaybillReceipt[];
}

export const AccountsReceivableReport: React.FC<AccountsReceivableReportProps> = ({ jobs, receipts }) => {
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const filteredJobs = jobs.filter((j) => isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate));
  const filteredReceipts = receipts.filter((r) => isDateInRange(r.timestamp, dateRange, customStartDate, customEndDate));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="💳 Client Accounts Receivable Report"
        subtitle="Total waybill revenue, payment collections, outstanding client balances, and terms settlement status."
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="accounts-receivable-report-sheet"
        pdfFilenamePrefix="Accounts_Receivable_Report"
      />

      <div id="accounts-receivable-report-sheet" className="table-card" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-card)" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
          💳 Client Accounts Receivable &amp; Outstanding Terms Summary
        </div>
        <table>
          <thead>
            <tr>
              <th>Client Shipper Name</th>
              <th>Total Waybill Revenue</th>
              <th>Amount Collected</th>
              <th>Outstanding Balance</th>
              <th>Collection Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(filteredJobs.map((j) => j.clientName))).map((client) => {
              const clientJobs = filteredJobs.filter((j) => j.clientName === client);
              const clientRevenue = clientJobs.reduce((sum, j) => sum + j.freightFee, 0);
              const clientReceipts = filteredReceipts.filter((r) => r.clientName === client);
              const clientCollected = clientReceipts.reduce((sum, r) => sum + r.amountPaid, 0);
              const clientBalance = clientRevenue - clientCollected;
              return (
                <tr key={client}>
                  <td><strong>{client}</strong></td>
                  <td style={{ fontWeight: 700 }}>₱{clientRevenue.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>₱{clientCollected.toLocaleString()}</td>
                  <td style={{ fontWeight: 800, color: clientBalance > 0 ? "var(--warning)" : "var(--text-muted)" }}>
                    ₱{Math.max(0, clientBalance).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${clientBalance <= 0 ? "badge-success" : "badge-warning"}`}>
                      {clientBalance <= 0 ? "Settled" : "Pending Terms"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
