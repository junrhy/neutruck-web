import React from "react";
import { ClientShipper, SavedBillingRecord } from "../../types";

interface SavedStatementsHubProps {
  selectedClient: string;
  matchedClientObj?: ClientShipper;
  onOpenStatement: (record: SavedBillingRecord) => void;
  onNewStatement: () => void;
  getDateRangeLabel: (rangeKey: string, start?: string, end?: string) => string;
}

export const SavedStatementsHub: React.FC<SavedStatementsHubProps> = ({
  selectedClient,
  matchedClientObj,
  onOpenStatement,
  onNewStatement,
  getDateRangeLabel,
}) => {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            📜 Saved Billing Statements — <span style={{ color: "var(--primary)" }}>{selectedClient}</span>
          </h3>
          <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
            Select a saved statement below to view, edit, or print.
          </div>
        </div>
      </div>

      {(!matchedClientObj?.billingHistory || matchedClientObj.billingHistory.length === 0) ? (
        <div style={{ padding: "4rem 2rem", textAlign: "center", background: "var(--bg-main)", borderRadius: "var(--radius)", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📁</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)" }}>
            No Saved Billing Statements for {selectedClient}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "0.4rem", maxWidth: "500px", margin: "0.4rem auto 1.5rem" }}>
            There are no existing billing statement records saved for this client yet. Click below to generate your first statement.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onNewStatement}
            style={{ fontSize: "0.85rem", fontWeight: 700, gap: "0.5rem" }}
          >
            ➕ Generate New Billing Statement
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {matchedClientObj.billingHistory.map((rec) => {
            const statusColor =
              rec.status === "Approved"
                ? "#10b981"
                : rec.status === "Checked"
                  ? "#a855f7"
                  : rec.status === "Prepared"
                    ? "#3b82f6"
                    : "#f59e0b";

            return (
              <div
                key={rec.id}
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <strong style={{ fontSize: "0.85rem", color: "var(--primary)", fontFamily: "monospace", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      #{rec.statementNo}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "4px",
                        background: `${statusColor}22`,
                        color: statusColor,
                        border: `1px solid ${statusColor}44`,
                      }}
                    >
                      {rec.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: "0.1rem" }}>
                    Saved on {new Date(rec.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", margin: "0.4rem 0", paddingTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem" }}>
                    <div>📅 Filter Range: <strong style={{ color: "var(--text-main)" }}>{getDateRangeLabel(rec.dateRange, rec.customStartDate, rec.customEndDate)}</strong></div>
                    <div>📦 Waybills Included: <strong style={{ color: "var(--text-main)" }}>{rec.jobIds.length} items</strong></div>
                    <div>💵 Grand Total: <strong style={{ color: "#10b981", fontSize: "0.95rem" }}>₱{(rec.grandTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onOpenStatement(rec)}
                    style={{ flex: 1, fontSize: "0.82rem", fontWeight: 700, gap: "0.4rem", justifyContent: "center" }}
                  >
                    📂 Open Statement
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
