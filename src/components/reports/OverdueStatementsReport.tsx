import React, { useState } from "react";
import { ClientShipper, SavedBillingRecord } from "../../types";
import { handlePrintElement, exportPdfElement } from "./reportUtils";

interface OverdueStatementsReportProps {
  clients: ClientShipper[];
  companyName: string;
  onOpenStatement?: (clientName: string, record: SavedBillingRecord) => void;
}

export const OverdueStatementsReport: React.FC<OverdueStatementsReportProps> = ({
  clients = [],
  companyName,
  onOpenStatement,
}) => {
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("ALL");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [notice, setNotice] = useState("");

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      const fileName = await exportPdfElement("overdue-statements-report-area", "Overdue_Statements_Report");
      setNotice(`Downloaded: ${fileName}`);
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      console.error("PDF generation error:", err);
      handlePrintElement("overdue-statements-report-area");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Collect all saved statements across all clients that have an overdue due date
  const overdueStatements: Array<{ client: ClientShipper; record: SavedBillingRecord; daysOverdue: number }> = [];

  clients.forEach((c) => {
    (c.billingHistory || []).forEach((rec) => {
      if (rec.dueDate) {
        const due = new Date(rec.dueDate);
        if (!isNaN(due.getTime())) {
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            const diffTime = Math.abs(today.getTime() - due.getTime());
            const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            overdueStatements.push({ client: c, record: rec, daysOverdue });
          }
        }
      }
    });
  });

  // Sort by highest days overdue
  overdueStatements.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const filteredItems = overdueStatements.filter((item) => {
    const matchesClient = filterClient === "ALL" ? true : item.client.companyName === filterClient;
    const matchesSearch =
      item.client.companyName.toLowerCase().includes(search.toLowerCase()) ||
      item.record.statementNo.toLowerCase().includes(search.toLowerCase()) ||
      (item.record.dueDate && item.record.dueDate.toLowerCase().includes(search.toLowerCase()));
    return matchesClient && matchesSearch;
  });

  const totalOverdueAmount = filteredItems.reduce((sum, item) => sum + (item.record.grandTotal || 0), 0);

  return (
    <div id="overdue-statements-report-area" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🚨 Overdue Billing Statements Report
          </h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--text-dim)" }}>
            List of outstanding client billing statements with passed payment due dates ({companyName}).
          </p>
        </div>

        <div className="no-print" style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {notice && (
            <span style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: 700 }}>
              ✅ {notice}
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            title="Download PDF report"
          >
            {isGeneratingPdf ? "⏳ Generating..." : "📥 Download"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handlePrintElement("overdue-statements-report-area")}
            title="Print Overdue Statements Report"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Overdue Statements</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)", marginTop: "0.3rem" }}>
            🚨 {filteredItems.length} Statements
          </div>
        </div>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Overdue Receivable</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)", marginTop: "0.3rem" }}>
            ₱{totalOverdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Max Days Overdue</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warning)", marginTop: "0.3rem" }}>
            ⏳ {filteredItems.length > 0 ? `${filteredItems[0].daysOverdue} Days` : "0 Days"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search Client Name, Statement No, or Due Date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: "240px" }}
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="ALL">🏢 All Client Shippers</option>
          {clients.map((c) => (
            <option key={c.id} value={c.companyName}>
              {c.companyName}
            </option>
          ))}
        </select>
      </div>

      {/* Overdue Statements Table */}
      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Client / Shipper</th>
              <th>Billing No.</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
              <th>Grand Total</th>
              <th>Status</th>
              {onOpenStatement && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
                  🎉 No overdue billing statements found! All payment due dates are current.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.record.id}>
                  <td>
                    <strong>🏢 {item.client.companyName}</strong>
                  </td>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                    #{item.client.billingNumber || item.record.statementNo}
                  </td>
                  <td style={{ color: "#f43f5e", fontWeight: 800 }}>
                    📅 {item.record.dueDate}
                  </td>
                  <td>
                    <span className="badge badge-danger">
                      🚨 {item.daysOverdue} Days Past Due
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, color: "var(--danger)", fontSize: "0.95rem" }}>
                    ₱{(item.record.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className="badge badge-warning">
                      {item.record.status}
                    </span>
                  </td>
                  {onOpenStatement && (
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onOpenStatement(item.client.companyName, item.record)}
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                      >
                        📂 View Statement
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
