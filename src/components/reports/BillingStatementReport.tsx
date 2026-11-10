import React, { useState, useEffect } from "react";
import { DispatchJob, ClientShipper, BillingColumnConfig, BillingAdditionPreset, SavedBillingRecord } from "../../types";
import { ReportHeader, isDateInRange, handlePrintElement, exportPdfElement } from "./reportUtils";
import { DEFAULT_BILLING_COLUMNS } from "../ClientShippersPage";
import { useAuth } from "../../hooks/useAuth";
import { StatementCustomizerDrawer } from "./StatementCustomizerDrawer";
import { SavedStatementsHub } from "./SavedStatementsHub";
import { PrintableBillingSheet } from "./PrintableBillingSheet";
import { GenerateStatementModal } from "./GenerateStatementModal";
import { DeleteStatementConfirmModal } from "./DeleteStatementConfirmModal";
import { StatementDueDateModal } from "./StatementDueDateModal";

export type StatementStatus = "Draft" | "Prepared" | "Checked" | "Approved";

interface BillingStatementReportProps {
  jobs: DispatchJob[];
  clients?: ClientShipper[];
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  sigPreparedBy?: string;
  sigCheckedBy?: string;
  sigApprovedBy?: string;
  sigPreparedByImg?: string;
  sigCheckedByImg?: string;
  sigApprovedByImg?: string;
  onUpdateClient?: (client: ClientShipper) => void;
}

export const BillingStatementReport: React.FC<BillingStatementReportProps> = ({
  jobs,
  clients = [],
  companyName,
  companyLogo = "",
  companyAddress = "",
  companyPhone = "",
  sigPreparedBy = "ANGEL ABACON",
  sigCheckedBy = "CHRISTIE DIONGZON",
  sigApprovedBy = "MH. TAN",
  sigPreparedByImg = "",
  sigCheckedByImg = "",
  sigApprovedByImg = "",
  onUpdateClient,
}) => {
  const { user, hasPermission } = useAuth();
  const canSetPrepared = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("billing_status_prepared") || hasPermission("waybills");
  const canSetChecked = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("billing_status_checked");
  const canSetApproved = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("billing_status_approved");
  const canDeleteStatement = !user || user.username === "admin" || user.permissions?.includes("*") || hasPermission("billing_delete_statement") || hasPermission("waybills");

  // Unique list of clients from jobs and client profiles
  const clientList = Array.from(
    new Set([
      ...clients.map((c) => c.companyName),
      ...jobs.map((j) => j.clientName),
    ].filter(Boolean))
  );

  const [selectedClient, setSelectedClient] = useState<string>(
    clientList[0] || ""
  );

  const matchedClientObj = clients.find((c) => c.companyName === selectedClient);

  const [billingNumber, setBillingNumber] = useState<string>(
    matchedClientObj?.billingNumber || ""
  );
  const [billingDate, setBillingDate] = useState<string>(
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()
  );
  const [dueDate, setDueDate] = useState<string>("");
  const [showDueDateModal, setShowDueDateModal] = useState(false);

  const [dateRange, setDateRange] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Format date range key into explicit 'MMM D, YYYY – MMM D, YYYY' date range string
  const getDateRangeLabel = (rangeKey: string, start?: string, end?: string) => {
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (rangeKey === "custom") {
      const s = start ? new Date(`${start}T00:00:00`) : null;
      const e = end ? new Date(`${end}T23:59:59`) : null;
      if (s && e) return `${fmt(s)} – ${fmt(e)}`;
      if (s) return `${fmt(s)} – Present`;
      if (e) return `Beginning – ${fmt(e)}`;
      return `Custom Date Range`;
    }

    let startDate: Date;
    let endDate: Date = now;

    if (rangeKey === "today") {
      startDate = today;
      endDate = today;
    } else if (rangeKey === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      startDate = y;
      endDate = y;
    } else if (rangeKey === "this_week") {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startDate = startOfWeek;
    } else if (rangeKey === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (rangeKey === "90_days") {
      const s90 = new Date(today);
      s90.setDate(s90.getDate() - 90);
      startDate = s90;
    } else if (rangeKey === "180_days") {
      const s180 = new Date(today);
      s180.setDate(s180.getDate() - 180);
      startDate = s180;
    } else if (rangeKey === "365_days") {
      const s365 = new Date(today);
      s365.setDate(s365.getDate() - 365);
      startDate = s365;
    } else if (rangeKey === "this_quarter") {
      const q = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), q * 3, 1);
    } else if (rangeKey === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (rangeKey.startsWith("month_")) {
      const parts = rangeKey.split("_");
      const yr = parseInt(parts[1], 10);
      const mo = parseInt(parts[2], 10);
      startDate = new Date(yr, mo, 1);
      endDate = new Date(yr, mo + 1, 0);
    } else {
      return rangeKey.replace(/_/g, " ");
    }

    return `${fmt(startDate)} – ${fmt(endDate)}`;
  };

  const [activeStatement, setActiveStatement] = useState<SavedBillingRecord | null>(null);
  const [showNewStatementModal, setShowNewStatementModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      const fileName = await exportPdfElement("billing-statement-paper-sheet", `Billing_Statement_${selectedClient || "Client"}`);
      setSavedStatementNotice(`Downloaded: ${fileName}`);
      setTimeout(() => setSavedStatementNotice(""), 4000);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      handlePrintElement("billing-statement-paper-sheet");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [savedStatementNotice, setSavedStatementNotice] = useState("");

  // Unique statement key for statement-level status tracking (per client + billing number + exact date range filter)
  const rangeKey = dateRange === "custom" ? `${dateRange}_${customStartDate}_${customEndDate}` : dateRange;
  const currentStatementKey = (selectedClient + "_" + (billingNumber.trim() || "nobill") + "_" + rangeKey).toLowerCase().replace(/\s+/g, "_");

  const [statementStatus, setStatementStatus] = useState<StatementStatus>(() => {
    return (
      matchedClientObj?.billingStatementStatuses?.[currentStatementKey] ||
      (localStorage.getItem("neutruck_statement_status_" + currentStatementKey) as StatementStatus) ||
      "Draft"
    );
  });

  const [clientAddress, setClientAddress] = useState<string>(
    matchedClientObj?.address || matchedClientObj?.defaultPickupLocation || ""
  );
  const [clientTinNumber, setClientTinNumber] = useState<string>(
    matchedClientObj?.tinNumber || ""
  );
  const [remarks, setRemarks] = useState<string>("");
  const [defaultWeighingFee, setDefaultWeighingFee] = useState<number>(() => {
    return matchedClientObj?.defaultWeighingFee ?? 0;
  });

  // Active Column Configuration state
  const [activeColumns, setActiveColumns] = useState<BillingColumnConfig[]>(() => {
    return matchedClientObj?.billingColumns && matchedClientObj.billingColumns.length > 0
      ? matchedClientObj.billingColumns
      : DEFAULT_BILLING_COLUMNS;
  });

  const [showColumnDrawer, setShowColumnDrawer] = useState(false);

  // Custom weighing fee state per job ID override
  const [weighingFees, setWeighingFees] = useState<Record<string, number>>({});

  // Custom statement additions & deductions (e.g., VAT 12%, Storage, Withholding Tax, Discount)
  const [customAdditions, setCustomAdditions] = useState<BillingAdditionPreset[]>(() => {
    return matchedClientObj?.billingAdditions && matchedClientObj.billingAdditions.length > 0
      ? matchedClientObj.billingAdditions
      : [];
  });
  const [showAddAdditionModal, setShowAddAdditionModal] = useState(false);
  const [newAdditionLabel, setNewAdditionLabel] = useState("");
  const [newAdditionAmount, setNewAdditionAmount] = useState<number | "">("");
  const [newAdditionIsPercent, setNewAdditionIsPercent] = useState(false);
  const [newAdditionType, setNewAdditionType] = useState<"addition" | "deduction">("addition");

  // When client or date range filter changes, load saved column presets & exact statement status
  useEffect(() => {
    const cObj = clients.find((c) => c.companyName === selectedClient);

    if (cObj?.billingColumns && cObj.billingColumns.length > 0) {
      setActiveColumns(cObj.billingColumns);
    } else {
      setActiveColumns(DEFAULT_BILLING_COLUMNS);
    }

    if (cObj?.billingAdditions && cObj.billingAdditions.length > 0) {
      setCustomAdditions(cObj.billingAdditions);
    } else {
      setCustomAdditions([]);
    }

    setDefaultWeighingFee(cObj?.defaultWeighingFee ?? 0);

    // Check if there is a saved statement history record matching this exact client and date range
    const matchingSavedRecord = cObj?.billingHistory?.find((h) => {
      if (h.dateRange !== dateRange) return false;
      if (dateRange === "custom") {
        return h.customStartDate === customStartDate && h.customEndDate === customEndDate;
      }
      return true;
    });

    const savedStatus =
      cObj?.billingStatementStatuses?.[currentStatementKey] ||
      matchingSavedRecord?.status ||
      (localStorage.getItem("neutruck_statement_status_" + currentStatementKey) as StatementStatus) ||
      "Draft";

    setStatementStatus(savedStatus);
  }, [selectedClient, billingNumber, dateRange, customStartDate, customEndDate, currentStatementKey, clients]);

  const handleStatusChange = (newStatus: StatementStatus) => {
    setStatementStatus(newStatus);
    if (currentStatementKey) {
      localStorage.setItem("neutruck_statement_status_" + currentStatementKey, newStatus);
    }
    if (matchedClientObj && onUpdateClient) {
      const updatedStatuses = {
        ...(matchedClientObj.billingStatementStatuses || {}),
        [currentStatementKey]: newStatus,
      };
      onUpdateClient({
        ...matchedClientObj,
        statementStatus: newStatus,
        billingStatementStatuses: updatedStatuses,
      });
    }
  };

  // Filter jobs by client and date range
  const clientJobs = jobs.filter((j) => {
    if (j.deliveryStatus === "Cancelled") return false;
    if (!isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate)) return false;
    if (selectedClient && j.clientName !== selectedClient) return false;
    return true;
  });

  const handleClientChange = (newClient: string) => {
    setSelectedClient(newClient);
    const clientObj = clients.find((c) => c.companyName === newClient);
    setClientAddress(clientObj?.address || clientObj?.defaultPickupLocation || "");
    setClientTinNumber(clientObj?.tinNumber || "");
    setBillingNumber(clientObj?.billingNumber || "");
  };

  const toggleColumn = (colId: string) => {
    setActiveColumns((cols) =>
      cols.map((col) => (col.id === colId ? { ...col, enabled: !col.enabled } : col))
    );
  };

  const updateColumnLabel = (colId: string, newLabel: string) => {
    setActiveColumns((cols) =>
      cols.map((col) => (col.id === colId ? { ...col, label: newLabel } : col))
    );
  };

  const moveColumn = (index: number, direction: "left" | "right") => {
    setActiveColumns((cols) => {
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= cols.length) return cols;
      const newCols = [...cols];
      const temp = newCols[index];
      newCols[index] = newCols[targetIndex];
      newCols[targetIndex] = temp;
      return newCols;
    });
  };

  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  const handleCreateCustomColumn = () => {
    if (!newColTitle.trim()) return;
    const cleanLabel = newColTitle.trim();
    const id = "custom_" + Date.now();
    setActiveColumns((cols) => {
      const totalIdx = cols.findIndex((c) => c.id === "total_amount");
      const newCol: BillingColumnConfig = {
        id,
        label: cleanLabel,
        enabled: true,
        width: "90px",
        align: "center",
      };
      if (totalIdx !== -1) {
        const copy = [...cols];
        copy.splice(totalIdx, 0, newCol);
        return copy;
      }
      return [...cols, newCol];
    });
    setNewColTitle("");
    setShowAddColModal(false);
  };

  // Save Column Layout & Charge/Tax/Deduction Presets to Client Profile
  const handleSaveColumnsForClient = () => {
    if (!matchedClientObj || !onUpdateClient) {
      alert("Please select a registered client profile from Client Shippers to save column layout & charge presets.");
      return;
    }
    const updatedStatuses = {
      ...(matchedClientObj.billingStatementStatuses || {}),
      [currentStatementKey]: statementStatus,
    };
    onUpdateClient({
      ...matchedClientObj,
      billingColumns: activeColumns,
      billingAdditions: customAdditions,
      defaultWeighingFee,
      billingStatementStatuses: updatedStatuses,
    });
    if (currentStatementKey) {
      localStorage.setItem("neutruck_statement_status_" + currentStatementKey, statementStatus);
    }
    setShowColumnDrawer(false);
    setSavedStatementNotice(`Saved statement preset layout, weighing fee & charges for ${matchedClientObj.companyName}!`);
    setTimeout(() => setSavedStatementNotice(""), 3500);
  };

  // Helper to calculate row total
  const getRowWeighingFee = (jobId: string) => weighingFees[jobId] ?? defaultWeighingFee;
  const getRowTotal = (j: DispatchJob) => (j.freightFee || 0) + getRowWeighingFee(j.id);

  // Subtotal of waybill line items
  const subtotalAmount = clientJobs.reduce((acc, j) => acc + getRowTotal(j), 0);

  // Calculate value of custom additions and deductions (either percentage of subtotal or fixed amount)
  const calculatedAdditions = customAdditions.map((item) => {
    const rawVal = item.isPercentage ? (subtotalAmount * (item.amount || 0)) / 100 : (item.amount || 0);
    // If explicitly set to deduction, negate value if positive
    const calculatedValue = item.itemType === "deduction" ? -Math.abs(rawVal) : rawVal;
    return { ...item, calculatedValue };
  });

  const additionsTotal = calculatedAdditions.reduce((acc, item) => acc + item.calculatedValue, 0);
  const grandTotal = subtotalAmount + additionsTotal;

  // Save current statement snapshot to Client Billing History
  const handleSaveCurrentStatement = () => {
    if (!matchedClientObj || !onUpdateClient) {
      alert("Please select a registered client profile from Client Shippers to save statement snapshots.");
      return;
    }

    // Derive Company Business Code prefix from settings companyName (e.g., "JRC Logistics" -> "JRC", "NeuTruck Freight" -> "NTF")
    const companyWords = (companyName || "").trim().split(/\s+/).filter(Boolean);
    const companyCode = companyWords.length === 1
      ? companyWords[0].toUpperCase()
      : companyWords.map((w) => w[0]?.toUpperCase() || "").join("");

    const prefixCode = companyCode || "STMT";

    // Auto-generate Statement No. format: {COMPANY_CODE}-STMT-YYYY-MMDD-XXXX if not already set or equal to client billingNumber
    let generatedStatementNo = activeStatement?.statementNo;
    if (!generatedStatementNo || generatedStatementNo === matchedClientObj.billingNumber) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const randHex = Math.floor(1000 + Math.random() * 9000);
      generatedStatementNo = `${prefixCode}-STMT-${yyyy}-${mm}${dd}-${randHex}`;
    }

    const newRecord: SavedBillingRecord = {
      id: activeStatement?.id || "stmt_" + Date.now(),
      statementNo: generatedStatementNo,
      billingNumber: billingNumber.trim() || matchedClientObj?.billingNumber || undefined,
      clientName: selectedClient,
      dateRange,
      customStartDate,
      customEndDate,
      billingDate,
      dueDate: dueDate.trim() || undefined,
      status: statementStatus,
      jobIds: clientJobs.map((j) => j.id),
      subtotal: subtotalAmount,
      grandTotal: grandTotal,
      createdAt: activeStatement?.createdAt || new Date().toISOString(),
      remarks,
      customAdditions: [...customAdditions],
      defaultWeighingFee,
    };

    const existingHistory = matchedClientObj.billingHistory || [];
    // Replace if existing record ID matches or statementNo matches (case-insensitive)
    const existingIndex = existingHistory.findIndex(
      (h) => h.id === newRecord.id || (h.statementNo && h.statementNo.toLowerCase() === newRecord.statementNo.toLowerCase())
    );

    let updatedHistory: SavedBillingRecord[];
    if (existingIndex !== -1) {
      updatedHistory = [...existingHistory];
      updatedHistory[existingIndex] = newRecord;
    } else {
      updatedHistory = [newRecord, ...existingHistory];
    }

    const updatedStatuses = {
      ...(matchedClientObj.billingStatementStatuses || {}),
      [currentStatementKey]: statementStatus,
    };

    onUpdateClient({
      ...matchedClientObj,
      billingHistory: updatedHistory,
      statementStatus,
      billingStatementStatuses: updatedStatuses,
    });

    setActiveStatement(newRecord);
    setSavedStatementNotice(`Saved Billing Statement #${newRecord.statementNo} (${clientJobs.length} waybills, Status: ${statementStatus})`);
    setTimeout(() => setSavedStatementNotice(""), 4000);
  };

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<SavedBillingRecord | null>(null);

  // Trigger Delete confirmation modal
  const handleDeleteStatement = (record: SavedBillingRecord) => {
    setStatementToDelete(record);
    setShowDeleteConfirmModal(true);
  };

  // Perform actual deletion after user confirmation in warning modal
  const handleConfirmDeleteStatement = () => {
    if (!statementToDelete || !matchedClientObj || !onUpdateClient) return;

    const updatedHistory = (matchedClientObj.billingHistory || []).filter((h) => h.id !== statementToDelete.id);
    const updatedStatuses = { ...(matchedClientObj.billingStatementStatuses || {}) };
    delete updatedStatuses[currentStatementKey];

    onUpdateClient({
      ...matchedClientObj,
      billingHistory: updatedHistory,
      billingStatementStatuses: updatedStatuses,
    });

    if (activeStatement?.id === statementToDelete.id) {
      setActiveStatement(null);
    }

    setSavedStatementNotice(`Deleted Billing Statement #${statementToDelete.statementNo}`);
    setTimeout(() => setSavedStatementNotice(""), 4000);
    setShowDeleteConfirmModal(false);
    setStatementToDelete(null);
  };

  // Open a saved statement record
  const handleLoadStatementRecord = (record: SavedBillingRecord) => {
    const clientBillingNo = matchedClientObj?.billingNumber || record.statementNo;
    setActiveStatement({ ...record, statementNo: clientBillingNo });
    setBillingNumber(clientBillingNo);
    setBillingDate(record.billingDate || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase());
    setDueDate(record.dueDate || "");
    setDateRange(record.dateRange || "all");
    setCustomStartDate(record.customStartDate || "");
    setCustomEndDate(record.customEndDate || "");
    setStatementStatus(record.status || "Draft");
    if (record.remarks) setRemarks(record.remarks);
    if (record.customAdditions && record.customAdditions.length > 0) {
      setCustomAdditions(record.customAdditions);
    }
    setDefaultWeighingFee(record.defaultWeighingFee ?? matchedClientObj?.defaultWeighingFee ?? 0);
  };

  const handleAddCustomAddition = () => {
    if (!newAdditionLabel.trim() || newAdditionAmount === "") return;
    const newItem = {
      id: "add_" + Date.now(),
      label: newAdditionLabel.trim(),
      amount: Number(newAdditionAmount) || 0,
      isPercentage: newAdditionIsPercent,
      itemType: newAdditionType,
    };
    setCustomAdditions((prev) => [...prev, newItem]);
    setNewAdditionLabel("");
    setNewAdditionAmount("");
    setNewAdditionIsPercent(false);
    setNewAdditionType("addition");
    setShowAddAdditionModal(false);
  };

  const handleRemoveCustomAddition = (id: string) => {
    setCustomAdditions((prev) => prev.filter((a) => a.id !== id));
  };

  // Format date MM/DD/YY
  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  };

  // Enabled columns list for table rendering
  const enabledCols = activeColumns.filter((c) => c.enabled);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="🧾 Client Billing Statement"
        subtitle={`Official statement of account, waybills, container shipments, trucking charges, and weighing fees (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="billing-statement-paper-sheet"
        pdfFilenamePrefix={`Billing_Statement_${selectedClient || "Client"}`}
        showPrintButtons={false}
        showDateFilter={!!activeStatement}
      />

      {/* Control Panel Bar & Action Banner */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: "var(--bg-card)",
          padding: "1.25rem 1.5rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          {/* Client Selector or Open Statement Client Info (Left Side) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {!activeStatement ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  🏢 Select Client / Shipper:
                </label>
                <select
                  className="form-select"
                  value={selectedClient}
                  onChange={(e) => {
                    handleClientChange(e.target.value);
                    setActiveStatement(null);
                  }}
                  style={{ width: "280px", fontSize: "0.9rem", fontWeight: 700 }}
                >
                  {clientList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  🏢 Client / Shipper:
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text-main)" }}>
                  {selectedClient || "—"}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700 }}>📄 Statement No.:</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace", color: "var(--primary)", background: "rgba(0, 212, 255, 0.08)", padding: "0.15rem 0.5rem", borderRadius: "6px", border: "1px solid rgba(0, 212, 255, 0.3)" }}>
                      {activeStatement.statementNo}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700 }}>📑 Billing No.:</span>
                    <input
                      type="text"
                      className="form-input"
                      value={billingNumber}
                      onChange={(e) => setBillingNumber(e.target.value)}
                      placeholder="Enter Billing No."
                      style={{
                        width: "160px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.5rem",
                        height: "auto",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700 }}>📅 Due Date:</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: dueDate ? "#f59e0b" : "var(--text-muted)" }}>
                      {dueDate || "Not Set"}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowDueDateModal(true)}
                      style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", marginLeft: "0.2rem" }}
                      title="Set or edit due date"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Stack: Status Dropdown & Action Buttons inline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem", marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {activeStatement && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <select
                    className="form-select"
                    value={statementStatus}
                    onChange={(e) => handleStatusChange(e.target.value as StatementStatus)}
                    style={{
                      width: "145px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      padding: "0.55rem 0.85rem",
                      height: "auto",
                      color: statementStatus === "Approved" ? "#10b981" : statementStatus === "Checked" ? "#a855f7" : statementStatus === "Prepared" ? "#3b82f6" : "var(--text-main)",
                    }}
                  >
                    <option value="Draft">📝 Draft</option>
                    <option value="Prepared" disabled={!canSetPrepared}>
                      {canSetPrepared ? "🔵 Prepared" : "🔒 Prepared"}
                    </option>
                    <option value="Checked" disabled={!canSetChecked}>
                      {canSetChecked ? "🟣 Checked" : "🔒 Checked"}
                    </option>
                    <option value="Approved" disabled={!canSetApproved}>
                      {canSetApproved ? "🟢 Approved" : "🔒 Approved"}
                    </option>
                  </select>
                </div>
              )}

              {!activeStatement && (
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  onClick={() => setShowNewStatementModal(true)}
                  style={{ fontSize: "0.85rem", fontWeight: 700, gap: "0.5rem", background: "var(--primary)", color: "#000", padding: "0.55rem 1.1rem" }}
                >
                  ➕ Generate New Billing Statement
                </button>
              )}



              {activeStatement && (
                <button
                  type="button"
                  className={`btn ${showColumnDrawer ? "btn-primary" : "btn-outline"} btn-md`}
                  onClick={() => setShowColumnDrawer(!showColumnDrawer)}
                  style={{ fontSize: "0.85rem", gap: "0.4rem" }}
                >
                  ⚙️ Customize {showColumnDrawer ? "▲" : "▼"}
                </button>
              )}

              {activeStatement && (
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  onClick={handleSaveCurrentStatement}
                  style={{ fontSize: "0.85rem", gap: "0.4rem", background: "#10b981", borderColor: "#059669" }}
                >
                  💾 Save
                </button>
              )}

              {activeStatement && (
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  style={{ fontSize: "0.85rem", gap: "0.4rem" }}
                  title="Download PDF file"
                >
                  {isGeneratingPdf ? "⏳ Generating..." : "📥 Download"}
                </button>
              )}

              {activeStatement && (
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  onClick={() => handlePrintElement("billing-statement-paper-sheet")}
                  style={{ fontSize: "0.85rem", gap: "0.4rem" }}
                  title="Print Billing Statement"
                >
                  🖨️ Print
                </button>
              )}

              {activeStatement && canDeleteStatement && (
                <button
                  type="button"
                  className="btn btn-danger btn-md"
                  onClick={() => handleDeleteStatement(activeStatement)}
                  style={{ fontSize: "0.85rem", gap: "0.4rem" }}
                  title="Delete this saved statement"
                >
                  🗑 Delete
                </button>
              )}

              {activeStatement && (
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  onClick={() => setActiveStatement(null)}
                  style={{ fontSize: "0.85rem", gap: "0.4rem" }}
                  title="Close current active statement view to return to statement list"
                >
                  ✕ Close
                </button>
              )}
            </div>

            {/* Saved Statement Notification Notice below buttons */}
            {savedStatementNotice && (
              <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 700, marginTop: "0.2rem" }}>
                ✅ {savedStatementNotice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unified Statement Customizer Drawer */}
      <StatementCustomizerDrawer
        showColumnDrawer={showColumnDrawer}
        selectedClient={selectedClient}
        matchedClientObj={matchedClientObj}
        activeColumns={activeColumns}
        setActiveColumns={setActiveColumns}
        customAdditions={customAdditions}
        setCustomAdditions={setCustomAdditions}
        defaultWeighingFee={defaultWeighingFee}
        setDefaultWeighingFee={setDefaultWeighingFee}
        showAddAdditionModal={showAddAdditionModal}
        setShowAddAdditionModal={setShowAddAdditionModal}
        newAdditionLabel={newAdditionLabel}
        setNewAdditionLabel={setNewAdditionLabel}
        newAdditionAmount={newAdditionAmount}
        setNewAdditionAmount={setNewAdditionAmount}
        newAdditionIsPercent={newAdditionIsPercent}
        setNewAdditionIsPercent={setNewAdditionIsPercent}
        newAdditionType={newAdditionType}
        setNewAdditionType={setNewAdditionType}
        showAddColModal={showAddColModal}
        setShowAddColModal={setShowAddColModal}
        newColTitle={newColTitle}
        setNewColTitle={setNewColTitle}
        handleAddCustomAddition={handleAddCustomAddition}
        handleRemoveCustomAddition={handleRemoveCustomAddition}
        handleCreateCustomColumn={handleCreateCustomColumn}
        handleSaveColumnsForClient={handleSaveColumnsForClient}
        toggleColumn={toggleColumn}
        updateColumnLabel={updateColumnLabel}
        moveColumn={moveColumn}
        defaultBillingColumns={DEFAULT_BILLING_COLUMNS}
        onUpdateClient={onUpdateClient}
      />

      {/* Saved Statements List Hub (Default View when no statement is actively open) */}
      {!activeStatement && (
        <SavedStatementsHub
          selectedClient={selectedClient}
          matchedClientObj={matchedClientObj}
          onOpenStatement={handleLoadStatementRecord}
          onNewStatement={() => setShowNewStatementModal(true)}
          getDateRangeLabel={getDateRangeLabel}
        />
      )}

      {/* Official Paper Billing Statement View (Visible when activeStatement is selected/open) */}
      {activeStatement && (
        <PrintableBillingSheet
          companyName={companyName}
          companyLogo={companyLogo}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          statementStatus={statementStatus}
          selectedClient={selectedClient}
          matchedClientObj={matchedClientObj}
          billingNumber={billingNumber}
          setBillingNumber={setBillingNumber}
          billingDate={billingDate}
          setBillingDate={setBillingDate}
          dueDate={dueDate}
          setDueDate={setDueDate}
          clientAddress={clientAddress}
          setClientAddress={setClientAddress}
          clientTinNumber={clientTinNumber}
          remarks={remarks}
          setRemarks={setRemarks}
          enabledCols={enabledCols}
          clientJobs={clientJobs}
          setWeighingFees={setWeighingFees}
          getRowWeighingFee={getRowWeighingFee}
          getRowTotal={getRowTotal}
          formatDateShort={formatDateShort}
          customAdditions={customAdditions}
          calculatedAdditions={calculatedAdditions}
          subtotalAmount={subtotalAmount}
          grandTotal={grandTotal}
          handleRemoveCustomAddition={handleRemoveCustomAddition}
          sigPreparedBy={sigPreparedBy}
          sigCheckedBy={sigCheckedBy}
          sigApprovedBy={sigApprovedBy}
          sigPreparedByImg={sigPreparedByImg}
          sigCheckedByImg={sigCheckedByImg}
          sigApprovedByImg={sigApprovedByImg}
        />
      )}

      {/* Statement Due Date Picker & Quick Actions Modal */}
      <StatementDueDateModal
        showModal={showDueDateModal}
        currentDueDate={dueDate}
        billingDate={billingDate}
        onClose={() => setShowDueDateModal(false)}
        onSetDueDate={(newDueDate) => {
          setDueDate(newDueDate);
          setSavedStatementNotice(newDueDate ? `Due date set to: ${newDueDate}` : "Due date cleared.");
          setTimeout(() => setSavedStatementNotice(""), 3500);
        }}
      />

      {/* Generate New Billing Statement Modal */}
      <GenerateStatementModal
        showModal={showNewStatementModal}
        onClose={() => setShowNewStatementModal(false)}
        selectedClient={selectedClient}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        clientJobsCount={clientJobs.length}
        subtotalAmount={subtotalAmount}
        onGenerateAndSave={handleSaveCurrentStatement}
      />

      {/* Delete Statement Confirmation Warning Modal */}
      <DeleteStatementConfirmModal
        showModal={showDeleteConfirmModal}
        statementToDelete={statementToDelete}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setStatementToDelete(null);
        }}
        onConfirmDelete={handleConfirmDeleteStatement}
      />
    </div>
  );
};
