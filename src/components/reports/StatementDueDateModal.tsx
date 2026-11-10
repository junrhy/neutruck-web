import React, { useState } from "react";

interface StatementDueDateModalProps {
  showModal: boolean;
  currentDueDate?: string;
  billingDate?: string;
  onClose: () => void;
  onSetDueDate: (dueDate: string) => void;
}

export const StatementDueDateModal: React.FC<StatementDueDateModalProps> = ({
  showModal,
  currentDueDate = "",
  billingDate = "",
  onClose,
  onSetDueDate,
}) => {
  if (!showModal) return null;

  // Derive initial date picker value (YYYY-MM-DD)
  const getInitialDatePickerVal = () => {
    if (currentDueDate) {
      const d = new Date(currentDueDate);
      if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
    }
    return new Date().toISOString().substring(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState<string>(getInitialDatePickerVal);

  const applyDaysFromBase = (days: number) => {
    let base = new Date();
    if (billingDate) {
      const parsed = new Date(billingDate);
      if (!isNaN(parsed.getTime())) base = parsed;
    }
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    setSelectedDate(result.toISOString().substring(0, 10));
  };

  const applyMonthsFromBase = (months: number) => {
    let base = new Date();
    if (billingDate) {
      const parsed = new Date(billingDate);
      if (!isNaN(parsed.getTime())) base = parsed;
    }
    const result = new Date(base);
    result.setMonth(result.getMonth() + months);
    setSelectedDate(result.toISOString().substring(0, 10));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    // Format formatted date e.g. "OCT 13, 2026"
    const d = new Date(`${selectedDate}T00:00:00`);
    const formatted = isNaN(d.getTime())
      ? selectedDate
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

    onSetDueDate(formatted);
    onClose();
  };

  const handleClear = () => {
    onSetDueDate("");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 11000,
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.75rem",
          width: "420px",
          maxWidth: "92vw",
          boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            📅 Set Statement Due Date
          </h3>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ border: "none" }}>✕</button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Quick Action Presets */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              ⚡ Quick Actions / Payment Terms:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.4rem" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.8rem", fontWeight: 700, justifyContent: "center" }}
                onClick={() => applyDaysFromBase(7)}
              >
                ⏱️ 7 Days
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.8rem", fontWeight: 700, justifyContent: "center" }}
                onClick={() => applyDaysFromBase(14)}
              >
                ⏱️ 14 Days
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.8rem", fontWeight: 700, justifyContent: "center" }}
                onClick={() => applyMonthsFromBase(1)}
              >
                🗓️ 1 Month (30 Days)
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: "0.8rem", fontWeight: 700, justifyContent: "center" }}
                onClick={() => applyDaysFromBase(60)}
              >
                🗓️ 60 Days
              </button>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.82rem" }}>Select Custom Due Date:</label>
            <input
              type="date"
              className="form-input"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ fontSize: "0.95rem", fontWeight: 700, padding: "0.5rem 0.75rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
            <button type="button" className="btn btn-outline btn-sm" style={{ color: "var(--danger)", borderColor: "rgba(244, 63, 94, 0.4)" }} onClick={handleClear}>
              🚫 Clear Due Date
            </button>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                💾 Set Due Date
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
