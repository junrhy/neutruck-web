import React, { useState, useEffect, useRef } from "react";
import {
  BackupHistoryEntry,
  BackupTableStat,
  BackupValidationResult,
  BackupImportResult,
} from "../../types";
import { useDialog } from "../common/CustomDialogModal";
import { useAuth } from "../../hooks/useAuth";

async function safeJson(res: Response) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return { error: `Server error (${res.status} ${res.statusText})` };
  }
}

function formatBytes(bytes: number | string): string {
  const b = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (!b || isNaN(b) || b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DataBackupManagement() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();

  // Stats & History
  const [loadingStats, setLoadingStats] = useState(false);
  const [tableStats, setTableStats] = useState<BackupTableStat[]>([]);
  const [totalDbRecords, setTotalDbRecords] = useState(0);

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyList, setHistoryList] = useState<BackupHistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState("");

  // Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "overwrite">("skip");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BackupImportResult | null>(null);

  // Active view tab for history details modal
  const [selectedHistoryDetails, setSelectedHistoryDetails] = useState<BackupHistoryEntry | null>(null);

  // 1. Fetch Live Stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch("/api/backup/stats");
      if (res.ok) {
        const data = await safeJson(res);
        setTotalDbRecords(data.totalRecords || 0);
        setTableStats(data.tables || []);
      }
    } catch (err: any) {
      console.error("Failed to load table stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // 2. Fetch Backup History
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/backup/history");
      if (res.ok) {
        const data = await safeJson(res);
        setHistoryList(data.history || []);
      }
    } catch (err: any) {
      console.error("Failed to load backup history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, []);

  // Handle Export Full Backup
  const handleExportBackup = async () => {
    try {
      setExporting(true);
      setExportSuccessMsg("");
      const username = user?.username || "admin";
      const res = await fetch(`/api/backup/export?exported_by=${encodeURIComponent(username)}`);

      if (!res.ok) {
        const errData = await safeJson(res);
        throw new Error(errData.error || "Failed to generate backup.");
      }

      // Extract filename from Content-Disposition if present
      let filename = `data-backup-${Date.now()}.json`;
      const disposition = res.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccessMsg(`✅ Backup snapshot generated and downloaded (${filename}).`);
      // Refresh history & stats
      fetchHistory();
      fetchStats();
    } catch (err: any) {
      showAlert(err.message || "Failed to export data backup.", "Export Failed", "danger");
    } finally {
      setExporting(false);
    }
  };

  // Handle File Selection for Import & Dry-Run Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);
    setImportResult(null);
    setParsedBackupData(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const json = JSON.parse(content);
        setParsedBackupData(json);

        // Immediately trigger server validation
        setValidating(true);
        const res = await fetch("/api/backup/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ backupData: json }),
        });

        const data: BackupValidationResult = await safeJson(res);
        setValidationResult(data);
      } catch (err: any) {
        setValidationResult({
          valid: false,
          error: `Failed to parse JSON file: ${err.message}`,
          totalIncoming: 0,
          newRecords: 0,
          duplicateRecords: 0,
          invalidRecords: 0,
          tables: [],
        });
      } finally {
        setValidating(false);
      }
    };
    reader.readAsText(file);
  };

  // Trigger Import Execution
  const handleExecuteImport = async () => {
    if (!parsedBackupData || !validationResult || !validationResult.valid) {
      showAlert("Please choose and validate a valid system backup file before importing.", "Validation Required");
      return;
    }

    const { newRecords, duplicateRecords } = validationResult;
    const strategyDesc =
      duplicateStrategy === "skip"
        ? `Skip all ${duplicateRecords} existing duplicates and insert ${newRecords} new records.`
        : `Overwrite/update all ${duplicateRecords} existing records and insert ${newRecords} new records.`;

    const confirmed = await showConfirm(
      `Are you sure you want to proceed with this data import?\n\nStrategy: ${strategyDesc}\n\nA snapshot of this import will be saved to your Backup History.`,
      "Confirm Data Import",
      {
        confirmLabel: "Proceed with Import",
        type: duplicateStrategy === "overwrite" ? "warning" : "info",
      }
    );

    if (!confirmed) return;

    try {
      setImporting(true);
      setImportResult(null);

      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupData: parsedBackupData,
          duplicateStrategy,
          importedBy: user?.username || "admin",
        }),
      });

      const data: BackupImportResult = await safeJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete data import.");
      }

      setImportResult(data);
      showAlert(
        `Import completed successfully!\n\n• Inserted: ${data.stats?.inserted || 0}\n• Updated: ${data.stats?.updated || 0}\n• Skipped: ${data.stats?.skipped || 0}\n• Errors: ${data.stats?.errors || 0}`,
        "Data Imported Successfully",
        "success"
      );

      // Refresh database stats and history list
      fetchStats();
      fetchHistory();
    } catch (err: any) {
      showAlert(err.message || "An error occurred while importing data.", "Import Error", "danger");
    } finally {
      setImporting(false);
    }
  };

  // Reset Import Form
  const handleResetImport = () => {
    setSelectedFile(null);
    setParsedBackupData(null);
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Delete History Item
  const handleDeleteHistory = async (id: string, filename: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to remove the history record for "${filename}"? This removes the log entry from history.`,
      "Delete Backup Log",
      { confirmLabel: "Delete Log", type: "danger" }
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/backup/history/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistoryList((prev) => prev.filter((item) => item.id !== id));
      } else {
        const err = await safeJson(res);
        showAlert(err.error || "Failed to delete history record.", "Error", "danger");
      }
    } catch (err: any) {
      showAlert(err.message || "Failed to delete history entry.", "Error", "danger");
    }
  };

  const filteredHistory = historyList.filter((item) => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      item.filename.toLowerCase().includes(q) ||
      item.created_by.toLowerCase().includes(q) ||
      (item.created_at && item.created_at.toLowerCase().includes(q))
    );
  });

  const latestBackupDate = historyList.length > 0 ? formatDate(historyList[0].created_at) : "None yet";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div>
        <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)", fontSize: "1.25rem" }}>
          💾 System Data Backup &amp; Restore Hub
        </h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-dim)" }}>
          Export full JSON database snapshots, inspect generation history, and safely import data with duplicate validation.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
            📦 Total Database Records
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--primary)" }}>
            {loadingStats ? "..." : totalDbRecords.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Across {tableStats.length} system tables</div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
            🕒 Last Backup Generated
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginTop: "0.25rem" }}>
            {latestBackupDate}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {historyList.length} snapshot{historyList.length === 1 ? "" : "s"} logged
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 600 }}>
            🛡️ Duplicate Protection
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#10b981", marginTop: "0.25rem" }}>
            Active &amp; Enforced
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Pre-import validation on unique keys</div>
        </div>
      </div>

      {/* SECTION 1: EXPORT DATA BACKUP */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h4 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>📥</span> Export Complete Database Snapshot
            </h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Generates a full JSON snapshot of all vehicles, drivers, helpers, clients, waybills, logs, and settings.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportBackup}
            disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.25rem" }}
          >
            {exporting ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Generating Snapshot...
              </>
            ) : (
              <>
                <span>💾</span> Export Complete JSON Backup
              </>
            )}
          </button>
        </div>

        {exportSuccessMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              color: "#10b981",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {exportSuccessMsg}
          </div>
        )}

        {/* Live Table Counts Grid */}
        <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "1rem", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Included Modules in Snapshot ({tableStats.length} tables):
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: "0.5rem",
              maxHeight: "180px",
              overflowY: "auto",
            }}
          >
            {tableStats.map((t) => (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.65rem",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                }}
              >
                <span style={{ color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.label}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: t.count > 0 ? "var(--primary)" : "var(--text-dim)",
                    background: t.count > 0 ? "rgba(0,212,255,0.1)" : "transparent",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                  }}
                >
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: IMPORT DATA & VALIDATION */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <h4 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📤</span> Import Backup Data with Duplicate Validation
          </h4>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Select a system backup JSON file. The system will pre-validate all records to prevent conflicts, format errors, and duplicates.
          </p>
        </div>

        {/* File Picker Zone */}
        {!selectedFile ? (
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "2rem",
              borderRadius: "10px",
              border: "2px dashed var(--border)",
              background: "rgba(255,255,255,0.01)",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            <span style={{ fontSize: "2rem" }}>📁</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
              Click to select or drag &amp; drop a system backup JSON file
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Only valid .json backup files are accepted
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.85rem 1.25rem",
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.25)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>📄</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-main)" }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  File size: {formatBytes(selectedFile.size)}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={handleResetImport}
              disabled={validating || importing}
            >
              ✕ Change File
            </button>
          </div>
        )}

        {/* Validation Progress */}
        {validating && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--primary)", fontSize: "0.875rem" }}>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            Analyzing backup structure and checking for database duplicates...
          </div>
        )}

        {/* Validation Report */}
        {validationResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {validationResult.valid ? (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981", fontWeight: 700, fontSize: "0.95rem" }}>
                  <span>✅</span> Backup File Validated Successfully
                </div>

                {/* Stat Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div
                    style={{
                      padding: "0.5rem 0.85rem",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "var(--text-main)",
                    }}
                  >
                    Total Records: <strong>{validationResult.totalIncoming}</strong>
                  </div>
                  <div
                    style={{
                      padding: "0.5rem 0.85rem",
                      background: "rgba(16, 185, 129, 0.15)",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    🟢 New Records: <strong>{validationResult.newRecords}</strong>
                  </div>
                  <div
                    style={{
                      padding: "0.5rem 0.85rem",
                      background: "rgba(245, 158, 11, 0.15)",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    🟡 Existing Duplicates: <strong>{validationResult.duplicateRecords}</strong>
                  </div>
                  {validationResult.invalidRecords > 0 && (
                    <div
                      style={{
                        padding: "0.5rem 0.85rem",
                        background: "rgba(239, 68, 68, 0.15)",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      🔴 Malformed / Invalid: <strong>{validationResult.invalidRecords}</strong>
                    </div>
                  )}
                </div>

                {/* Per-Table Breakdown Preview */}
                <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-dim)" }}>
                        <th style={{ padding: "0.4rem 0.6rem" }}>Module / Table</th>
                        <th style={{ padding: "0.4rem 0.6rem" }}>Incoming</th>
                        <th style={{ padding: "0.4rem 0.6rem", color: "#10b981" }}>New</th>
                        <th style={{ padding: "0.4rem 0.6rem", color: "#f59e0b" }}>Duplicates</th>
                        <th style={{ padding: "0.4rem 0.6rem" }}>Sample Duplicates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.tables.map((t) => (
                        <tr key={t.table} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "0.4rem 0.6rem", fontWeight: 600 }}>{t.label}</td>
                          <td style={{ padding: "0.4rem 0.6rem" }}>{t.incomingCount}</td>
                          <td style={{ padding: "0.4rem 0.6rem", color: "#10b981", fontWeight: t.newCount > 0 ? 700 : 400 }}>
                            {t.newCount}
                          </td>
                          <td style={{ padding: "0.4rem 0.6rem", color: "#f59e0b", fontWeight: t.duplicateCount > 0 ? 700 : 400 }}>
                            {t.duplicateCount}
                          </td>
                          <td style={{ padding: "0.4rem 0.6rem", color: "var(--text-dim)", fontSize: "0.75rem" }}>
                            {t.sampleDuplicates.length > 0 ? t.sampleDuplicates.join(", ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Duplicate Strategy Option */}
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.85rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.5rem" }}>
                    Select Duplicate Resolution Strategy:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.825rem" }}>
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="skip"
                        checked={duplicateStrategy === "skip"}
                        onChange={() => setDuplicateStrategy("skip")}
                      />
                      <span>
                        <strong style={{ color: "#10b981" }}>Skip Duplicates (Recommended)</strong> — Keep existing database records untouched. Only insert brand new records.
                      </span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.825rem" }}>
                      <input
                        type="radio"
                        name="dupStrategy"
                        value="overwrite"
                        checked={duplicateStrategy === "overwrite"}
                        onChange={() => setDuplicateStrategy("overwrite")}
                      />
                      <span>
                        <strong style={{ color: "#f59e0b" }}>Overwrite / Update Existing</strong> — Update matching existing records with the data in this backup file, and insert new records.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Import Action Button */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={handleResetImport} disabled={importing}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleExecuteImport}
                    disabled={importing || (validationResult.newRecords === 0 && duplicateStrategy === "skip")}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    {importing ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Importing Records...
                      </>
                    ) : (
                      <>
                        <span>🚀</span> Proceed with Import (
                        {duplicateStrategy === "skip"
                          ? `${validationResult.newRecords} new`
                          : `${validationResult.newRecords} new, ${validationResult.duplicateRecords} updated`}
                        )
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  padding: "1rem",
                  color: "#ef4444",
                  fontSize: "0.85rem",
                }}
              >
                <strong>❌ Validation Failed:</strong> {validationResult.error}
              </div>
            )}
          </div>
        )}

        {/* Import Results Banner */}
        {importResult && (
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              color: "#10b981",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>🎉 {importResult.message}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Data has been synchronized and the import action has been logged into Backup History.
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: BACKUP HISTORY */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h4 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>📜</span> Backup Generation &amp; Import History
            </h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Audit trail of every snapshot generated and backup file imported into the system.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="form-input form-input-sm"
              style={{ width: "180px", fontSize: "0.8rem" }}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={fetchHistory}
              disabled={loadingHistory}
              title="Refresh History"
            >
              🔄
            </button>
          </div>
        </div>

        {/* History Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.72rem" }}>
                <th style={{ padding: "0.6rem 0.75rem" }}>Date &amp; Time Generated</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Type / Filename</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Generated By</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Records</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Size</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                    Loading backup history...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                    No backup records found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const isImport = item.details?.source === "import" || item.filename.includes("Import");
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {formatDate(item.created_at)}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <span
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            marginRight: "0.5rem",
                            background: isImport ? "rgba(245, 158, 11, 0.15)" : "rgba(0, 212, 255, 0.15)",
                            color: isImport ? "#f59e0b" : "var(--primary)",
                          }}
                        >
                          {isImport ? "IMPORT" : "EXPORT"}
                        </span>
                        <span style={{ color: "var(--text-main)" }}>{item.filename}</span>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-dim)" }}>{item.created_by}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryDetails(item)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--primary)",
                            cursor: "pointer",
                            fontSize: "0.825rem",
                            fontWeight: 600,
                            textDecoration: "underline",
                            padding: 0,
                          }}
                        >
                          {item.record_count.toLocaleString()} records ℹ️
                        </button>
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-dim)" }}>
                        {formatBytes(item.file_size_bytes)}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleDeleteHistory(item.id, item.filename)}
                          style={{ color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                          title="Delete history log"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Details Breakdown Modal */}
      {selectedHistoryDetails && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setSelectedHistoryDetails(null)}
        >
          <div
            style={{
              background: "var(--bg-main, #111827)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "500px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, color: "var(--text-main)" }}>📊 Snapshot Breakdown</h4>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => setSelectedHistoryDetails(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              <strong>Date:</strong> {formatDate(selectedHistoryDetails.created_at)}
              <br />
              <strong>File:</strong> {selectedHistoryDetails.filename}
              <br />
              <strong>Total Records:</strong> {selectedHistoryDetails.record_count.toLocaleString()}
            </div>

            <div
              style={{
                maxHeight: "260px",
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {selectedHistoryDetails.details?.summary ? (
                Object.entries(selectedHistoryDetails.details.summary).map(([tbl, count]) => (
                  <div
                    key={tbl}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      padding: "0.25rem 0.4rem",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <span style={{ color: "var(--text-main)" }}>{tbl}</span>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                      {typeof count === "object" ? JSON.stringify(count) : String(count)}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", textAlign: "center" }}>
                  No per-table breakdown logged for this entry.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedHistoryDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
