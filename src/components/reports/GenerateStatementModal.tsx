import React from "react";

interface GenerateStatementModalProps {
  showModal: boolean;
  onClose: () => void;
  selectedClient: string;
  dateRange: string;
  setDateRange: (val: string) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  clientJobsCount: number;
  subtotalAmount: number;
  onGenerateAndSave: () => void;
}

export const GenerateStatementModal: React.FC<GenerateStatementModalProps> = ({
  showModal,
  onClose,
  selectedClient,
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  clientJobsCount,
  subtotalAmount,
  onGenerateAndSave,
}) => {
  if (!showModal) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1.5rem",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          width: "100%",
          maxWidth: "580px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 35px -5px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ➕ Generate New Billing Statement
            </h3>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
              Select the billing date range filter for <strong style={{ color: "var(--primary)" }}>{selectedClient}</strong>.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-outline btn-sm"
            onClick={onClose}
            style={{ fontSize: "1rem", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Date Range Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
              📅 Select Date Range / Billing Period:
            </label>
            <select
              className="form-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ fontSize: "0.9rem", padding: "0.5rem 0.75rem" }}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="all">All Time (Unfiltered)</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          {dateRange === "custom" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "rgba(0,212,255,0.05)", padding: "1rem", borderRadius: "var(--radius)", border: "1px solid rgba(0,212,255,0.2)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)" }}>Start Date:</label>
                <input
                  type="date"
                  className="form-input"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)" }}>End Date:</label>
                <input
                  type="date"
                  className="form-input"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
          )}

          {/* Statement Preview Summary Box */}
          <div style={{ background: "var(--bg-main)", padding: "1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              📊 Statement Summary Preview:
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 700 }}>
              <span>Waybills Found:</span>
              <span style={{ color: "var(--primary)" }}>{clientJobsCount} items</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 700 }}>
              <span>Estimated Subtotal:</span>
              <span style={{ color: "#10b981" }}>₱{subtotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            background: "rgba(0, 0, 0, 0.1)",
          }}
        >
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onClose();
              onGenerateAndSave();
            }}
            disabled={clientJobsCount === 0}
            style={{ fontWeight: 700, padding: "0.45rem 1.1rem" }}
          >
            🚀 Generate &amp; Save Statement
          </button>
        </div>
      </div>
    </div>
  );
};
