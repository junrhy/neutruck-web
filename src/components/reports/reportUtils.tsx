import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Generate past 12 months dynamically
export const past12Months = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(1); // avoid month overflow
  d.setMonth(d.getMonth() - i);
  const year = d.getFullYear();
  const month = d.getMonth();
  const monthName = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return {
    value: `month_${year}_${month}`,
    label: monthName,
    year,
    month,
  };
});

// Universal Date Range Checker
export const isDateInRange = (
  dateStr?: string,
  dateRange: string = "all",
  customStartDate?: string,
  customEndDate?: string
): boolean => {
  if (!dateStr || dateRange === "all") return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange === "today") {
    return d >= today;
  }
  if (dateRange === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return d >= yesterday && d < today;
  }
  if (dateRange === "this_week") {
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return d >= startOfWeek;
  }
  if (dateRange === "90_days") {
    const start90 = new Date(today);
    start90.setDate(start90.getDate() - 90);
    return d >= start90;
  }
  if (dateRange === "180_days") {
    const start180 = new Date(today);
    start180.setDate(start180.getDate() - 180);
    return d >= start180;
  }
  if (dateRange === "365_days") {
    const start365 = new Date(today);
    start365.setDate(start365.getDate() - 365);
    return d >= start365;
  }
  if (dateRange === "this_quarter") {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
    return d >= startOfQuarter;
  }
  if (dateRange === "this_year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return d >= startOfYear;
  }
  if (dateRange.startsWith("month_")) {
    const parts = dateRange.split("_");
    const yr = parseInt(parts[1], 10);
    const mo = parseInt(parts[2], 10);
    const startOfMonth = new Date(yr, mo, 1);
    const endOfMonth = new Date(yr, mo + 1, 0, 23, 59, 59);
    return d >= startOfMonth && d <= endOfMonth;
  }
  if (dateRange === "custom") {
    if (customStartDate && d < new Date(`${customStartDate}T00:00:00`)) return false;
    if (customEndDate && d > new Date(`${customEndDate}T23:59:59`)) return false;
    return true;
  }
  return true;
};

export const handlePrintElement = (elementId?: string) => {
  console.log("Printing element:", elementId);
  window.print();
};

export const exportPdfElement = async (
  elementId: string,
  pdfFilenamePrefix: string = "Billing_Statement"
): Promise<string> => {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error("Printable element not found.");
  }

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    ignoreElements: (element) => element.classList.contains("no-print"),
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

  const cleanPrefix = pdfFilenamePrefix.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  const fileName = `${cleanPrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  return fileName;
};

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  dateRange: string;
  setDateRange: (val: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (val: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (val: string) => void;
  printElementId?: string;
  pdfFilenamePrefix?: string;
  showPrintButtons?: boolean;
  showDateFilter?: boolean;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  printElementId,
  pdfFilenamePrefix = "Billing_Statement",
  showPrintButtons = true,
  showDateFilter = true,
}) => {

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMsg, setPdfSuccessMsg] = useState("");

  const handleDownloadPdf = async (elementId?: string) => {
    if (!elementId || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      setPdfSuccessMsg("");
      const fileName = await exportPdfElement(elementId, pdfFilenamePrefix);
      setPdfSuccessMsg(`Downloaded: ${fileName}`);
      setTimeout(() => setPdfSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Failed to generate PDF via plugin:", err);
      handlePrintElement(elementId);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
      {/* Floating Toast Notification */}
      {pdfSuccessMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            fontSize: "0.85rem",
            color: "#ffffff",
            fontWeight: 700,
            padding: "0.6rem 1.1rem",
            background: "#10b981",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          ✅ {pdfSuccessMsg}
        </div>
      )}

      <div>
        <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)", fontSize: "1.3rem" }}>{title}</h2>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem" }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        {showDateFilter && (
          <>
            <select
              className="form-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ width: "210px", fontSize: "0.85rem" }}
            >
              <option value="180_days">⏳ Last 6 Months (180 Days - Recommended)</option>
              <option value="90_days">⌛ Last 90 Days (Quarterly)</option>
              <option value="365_days">📅 Last 365 Days (1 Year)</option>
              <option value="all">🌐 All-Time Historical Records</option>
              <option value="today">☀️ Today Only</option>
              <option value="yesterday">⏪ Yesterday</option>
              <option value="this_week">🗓️ This Week</option>
              <option value="this_quarter">📊 This Quarter</option>
              <option value="this_year">📈 This Year</option>
              <option value="custom">⚙️ Custom Range...</option>

              <optgroup label="📆 Specific Month (Past 12 Months)">
                {past12Months.map((m, idx) => (
                  <option key={m.value} value={m.value}>
                    {idx === 0 ? `📅 ${m.label} (Current Month)` : idx === 1 ? `⏮️ ${m.label} (Last Month)` : `🗓️ ${m.label}`}
                  </option>
                ))}
              </optgroup>
            </select>

            {dateRange === "custom" && setCustomStartDate && setCustomEndDate && (
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: "145px", fontSize: "0.85rem", padding: "0.4rem 0.65rem" }}
                  value={customStartDate || ""}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="Start Date"
                />
                <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 600 }}>to</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: "145px", fontSize: "0.85rem", padding: "0.4rem 0.65rem" }}
                  value={customEndDate || ""}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="End Date"
                />
              </div>
            )}
          </>
        )}

        {showPrintButtons && (
          <>
            <button
              className="btn btn-outline"
              onClick={() => handleDownloadPdf(printElementId)}
              disabled={isGeneratingPdf}
              title="Download PDF file directly"
            >
              {isGeneratingPdf ? "⏳ Generating..." : "📥 Download"}
            </button>

            <button className="btn btn-primary" onClick={() => handlePrintElement(printElementId)} title="Print Statement">
              🖨️ Print
            </button>
          </>
        )}
      </div>
    </div>
  );
};
