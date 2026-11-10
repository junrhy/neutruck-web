import React from "react";
import { BillingColumnConfig, BillingAdditionPreset, ClientShipper } from "../../types";

interface StatementCustomizerDrawerProps {
  showColumnDrawer: boolean;
  selectedClient: string;
  matchedClientObj?: ClientShipper;
  activeColumns: BillingColumnConfig[];
  setActiveColumns: React.Dispatch<React.SetStateAction<BillingColumnConfig[]>>;
  customAdditions: BillingAdditionPreset[];
  setCustomAdditions: React.Dispatch<React.SetStateAction<BillingAdditionPreset[]>>;
  defaultWeighingFee: number;
  setDefaultWeighingFee: (val: number) => void;
  showAddAdditionModal: boolean;
  setShowAddAdditionModal: (val: boolean) => void;
  newAdditionLabel: string;
  setNewAdditionLabel: (val: string) => void;
  newAdditionAmount: number | "";
  setNewAdditionAmount: (val: number | "") => void;
  newAdditionIsPercent: boolean;
  setNewAdditionIsPercent: (val: boolean) => void;
  newAdditionType: "addition" | "deduction";
  setNewAdditionType: (val: "addition" | "deduction") => void;
  showAddColModal: boolean;
  setShowAddColModal: (val: boolean) => void;
  newColTitle: string;
  setNewColTitle: (val: string) => void;
  handleAddCustomAddition: () => void;
  handleRemoveCustomAddition: (id: string) => void;
  handleCreateCustomColumn: () => void;
  handleSaveColumnsForClient: () => void;
  toggleColumn: (colId: string) => void;
  updateColumnLabel: (colId: string, newLabel: string) => void;
  moveColumn: (index: number, direction: "left" | "right") => void;
  defaultBillingColumns: BillingColumnConfig[];
  onUpdateClient?: (client: ClientShipper) => void;
}

export const StatementCustomizerDrawer: React.FC<StatementCustomizerDrawerProps> = ({
  showColumnDrawer,
  selectedClient,
  matchedClientObj,
  activeColumns,
  setActiveColumns,
  customAdditions,
  setCustomAdditions,
  defaultWeighingFee,
  setDefaultWeighingFee,
  showAddAdditionModal,
  setShowAddAdditionModal,
  newAdditionLabel,
  setNewAdditionLabel,
  newAdditionAmount,
  setNewAdditionAmount,
  newAdditionIsPercent,
  setNewAdditionIsPercent,
  newAdditionType,
  setNewAdditionType,
  showAddColModal,
  setShowAddColModal,
  newColTitle,
  setNewColTitle,
  handleAddCustomAddition,
  handleRemoveCustomAddition,
  handleCreateCustomColumn,
  handleSaveColumnsForClient,
  toggleColumn,
  updateColumnLabel,
  moveColumn,
  defaultBillingColumns,
  onUpdateClient,
}) => {
  if (!showColumnDrawer) return null;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Top Drawer Header & Save Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        <div>
          <strong style={{ fontSize: "0.95rem", color: "var(--primary)" }}>
            ⚙️ Statement Customizer ({selectedClient || "Client"})
          </strong>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
            Manage default weighing fee, active table columns, and custom charges, taxes, or deductions for this statement.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setActiveColumns(defaultBillingColumns);
              setCustomAdditions([]);
              setDefaultWeighingFee(0);
            }}
            style={{ fontSize: "0.75rem" }}
          >
            🔄 Reset Default
          </button>
          {matchedClientObj && onUpdateClient && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveColumnsForClient}
              style={{ fontSize: "0.75rem" }}
            >
              💾 Save Layout &amp; Defaults for {matchedClientObj.companyName}
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Custom Additional Charges & Deductions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "0.82rem", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📊 1. Statement Charges, Taxes &amp; Deductions ({customAdditions.length})
          </strong>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => setShowAddAdditionModal(!showAddAdditionModal)}
            style={{ fontSize: "0.75rem" }}
          >
            ➕ {showAddAdditionModal ? "Close Form" : "Add Charge / Deduction"}
          </button>
        </div>

        {/* Inline Add Addition/Deduction Form */}
        {showAddAdditionModal && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "rgba(0, 212, 255, 0.05)",
              border: "1px solid var(--primary)",
              borderRadius: "var(--radius)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}>
              ➕ New Charge or Tax Item
            </div>

            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              {/* Addition vs Deduction Toggle Pills */}
              <div style={{ display: "flex", gap: "0.2rem", background: "rgba(255,255,255,0.05)", padding: "0.15rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className={`btn btn-xs ${newAdditionType === "addition" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setNewAdditionType("addition")}
                  style={{ fontSize: "0.76rem", padding: "0.25rem 0.6rem" }}
                >
                  ➕ Charge / Addition
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${newAdditionType === "deduction" ? "btn-danger" : "btn-outline"}`}
                  onClick={() => setNewAdditionType("deduction")}
                  style={{ fontSize: "0.76rem", padding: "0.25rem 0.6rem" }}
                >
                  ➖ Deduction / Tax Withheld
                </button>
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="e.g. VAT 12%, Storage Fee, Discount..."
                value={newAdditionLabel}
                onChange={(e) => setNewAdditionLabel(e.target.value)}
                style={{ flex: 1, minWidth: "180px", fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Amount"
                  value={newAdditionAmount}
                  onChange={(e) => setNewAdditionAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100px", fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                />
                <button
                  type="button"
                  className={`btn btn-xs ${newAdditionIsPercent ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setNewAdditionIsPercent(!newAdditionIsPercent)}
                  style={{ fontSize: "0.76rem", padding: "0.35rem 0.6rem" }}
                >
                  {newAdditionIsPercent ? "% (Percentage)" : "₱ (Fixed Amount)"}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddCustomAddition}
                disabled={!newAdditionLabel.trim() || newAdditionAmount === ""}
                style={{ fontSize: "0.78rem" }}
              >
                ➕ Add Item
              </button>
            </div>
          </div>
        )}

        {/* List of active custom additions/deductions */}
        {customAdditions.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {customAdditions.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  background: item.itemType === "deduction" ? "rgba(220, 38, 38, 0.1)" : "rgba(0, 212, 255, 0.08)",
                  border: item.itemType === "deduction" ? "1px solid rgba(220, 38, 38, 0.3)" : "1px solid rgba(0, 212, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.78rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => handleRemoveCustomAddition(item.id)}
                  style={{ padding: "0.05rem 0.3rem", fontSize: "0.68rem" }}
                >
                  ✕
                </button>
                <span style={{ fontWeight: 700, color: item.itemType === "deduction" ? "#ef4444" : "var(--primary)" }}>
                  {item.itemType === "deduction" ? "➖" : "➕"} {item.label}
                </span>
                <span style={{ fontFamily: "monospace", opacity: 0.9 }}>
                  ({item.isPercentage ? `${item.amount}%` : `₱${item.amount.toLocaleString()}`})
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontStyle: "italic" }}>
            No custom taxes or deductions added yet. Click &quot;Add Charge / Deduction&quot; above to add VAT, discounts, etc.
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <strong style={{ fontSize: "0.82rem", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📋 2. Table Column Visibility &amp; Ordering ({activeColumns.length})
          </strong>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => setShowAddColModal(true)}
            style={{ fontSize: "0.75rem" }}
          >
            ➕ Add Custom Column
          </button>
        </div>

        {/* Add Custom Column Inline Form */}
        {showAddColModal && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.75rem",
              background: "rgba(0, 212, 255, 0.08)",
              border: "1px solid var(--primary)",
              borderRadius: "6px",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
              🏷️ New Column Title:
            </span>
            <input
              type="text"
              className="form-input"
              autoFocus
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              placeholder="e.g. Booking Reference No. / Pier Gate Receipt / Storage Fee..."
              onKeyDown={(e) => e.key === "Enter" && handleCreateCustomColumn()}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCreateCustomColumn}
              disabled={!newColTitle.trim()}
              style={{ fontSize: "0.78rem" }}
            >
              ➕ Add Column
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setShowAddColModal(false);
                setNewColTitle("");
              }}
              style={{ fontSize: "0.78rem" }}
            >
              ✕ Cancel
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.6rem" }}>
          {activeColumns.map((col, index) => (
            <div
              key={col.id}
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                border: col.enabled ? "1px solid rgba(0,212,255,0.3)" : "1px solid var(--border)",
                background: col.enabled ? "rgba(0,212,255,0.05)" : "rgba(255,255,255,0.01)",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                opacity: col.id === "total_amount" ? 0.8 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", fontWeight: 700, cursor: col.id === "total_amount" ? "default" : "pointer", whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    disabled={col.id === "total_amount"}
                    onChange={() => toggleColumn(col.id)}
                  />
                  <span style={{ color: col.enabled ? "var(--primary)" : "var(--text-dim)", whiteSpace: "nowrap" }}>
                    {col.id.replace(/_/g, " ").toUpperCase()}
                  </span>
                </label>
                <div style={{ display: "flex", gap: "0.2rem" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    disabled={index === 0}
                    onClick={() => moveColumn(index, "left")}
                    title="Move Left / Earlier"
                    style={{ padding: "0.1rem 0.35rem", fontSize: "0.7rem", lineHeight: 1 }}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    disabled={index === activeColumns.length - 1}
                    onClick={() => moveColumn(index, "right")}
                    title="Move Right / Later"
                    style={{ padding: "0.1rem 0.35rem", fontSize: "0.7rem", lineHeight: 1 }}
                  >
                    ▶
                  </button>
                </div>
              </div>

              {col.id === "weighing_fee" ? (
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", marginTop: "0.2rem", width: "100%", minWidth: 0 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={col.label}
                    onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                    placeholder="Column name"
                    style={{ fontSize: "0.72rem", padding: "0.15rem 0.35rem", height: "auto", flex: 1, minWidth: 0 }}
                  />
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    step="any"
                    value={defaultWeighingFee === 0 ? "" : defaultWeighingFee}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setDefaultWeighingFee(0);
                      } else {
                        const parsed = parseFloat(raw);
                        setDefaultWeighingFee(isNaN(parsed) ? 0 : Math.max(0, parsed));
                      }
                    }}
                    onKeyDown={(e) => {
                      const allowedKeys = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
                      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
                      if (e.key === "." && !String(defaultWeighingFee).includes(".")) return;
                      if (!/^[0-9]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    style={{ fontSize: "0.72rem", padding: "0.15rem 0.35rem", height: "auto", flex: 1, minWidth: 0 }}
                    placeholder="0.00"
                    title="Default Weighing Fee (₱)"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  value={col.label}
                  onChange={(e) => updateColumnLabel(col.id, e.target.value)}
                  placeholder="Header label..."
                  style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", height: "auto", marginTop: "0.2rem" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
