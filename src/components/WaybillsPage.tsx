import { useState } from "react";
import { WaybillReceipt, DispatchJob, ClientShipper } from "../types";
import PrintableReceiptModal from "./PrintableReceiptModal";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";
import { getNextSequentialId } from "../utils/idGenerator";
import { getAppNowString } from "../utils/dateUtils";

interface WaybillsPageProps {
  receipts: WaybillReceipt[];
  jobs: DispatchJob[];
  clients?: ClientShipper[];
  companyName: string;
  companyLogo?: string;
  onAddReceipt: (receipt: WaybillReceipt) => Promise<void>;
  onUpdateReceipt: (receipt: WaybillReceipt) => Promise<void>;
  onDeleteReceipt?: (id: string) => Promise<void> | void;
  onNavigateToStatement?: () => void;
}

// Calculate Net Expected Waybill Amount taking into account Client's Addition & Deduction Presets
const calculateJobNetFee = (job: DispatchJob, clients: ClientShipper[] = []) => {
  const baseFee = job.freightFee || 0;
  const client = clients.find((c) => c.companyName === job.clientName);

  if (!client || !client.billingAdditions || client.billingAdditions.length === 0) {
    return baseFee;
  }

  let totalAdditions = 0;
  let totalDeductions = 0;

  client.billingAdditions.forEach((preset) => {
    const val = preset.isPercentage ? baseFee * (preset.amount / 100) : preset.amount;
    if (preset.itemType === "deduction") {
      totalDeductions += val;
    } else {
      totalAdditions += val;
    }
  });

  return baseFee + totalAdditions - totalDeductions;
};

export default function WaybillsPage({
  receipts,
  jobs,
  clients = [],
  companyName,
  companyLogo = "",
  onAddReceipt,
  onUpdateReceipt,
  onDeleteReceipt,
  onNavigateToStatement,
}: WaybillsPageProps) {
  const { user } = useAuth();
  const { showConfirm } = useDialog();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<WaybillReceipt | null>(null);
  const [printableReceipt, setPrintableReceipt] = useState<WaybillReceipt | null>(null);

  // Form State
  const [selectedJobId, setSelectedJobId] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(15000);
  const [paymentMethod, setPaymentMethod] = useState<WaybillReceipt["paymentMethod"]>("Terms 30 Days");

  // Financial Metrics Summary
  const totalCollected = receipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const totalFreightFees = jobs.filter((j) => j.deliveryStatus !== "Cancelled" && j.deliveryStatus !== "Draft").reduce((sum, j) => sum + (j.freightFee || 0), 0);
  const totalOutstanding = Math.max(0, totalFreightFees - totalCollected);

  const filteredReceipts = receipts.filter(
    (r) =>
      r.waybillNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.paymentMethod.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartEdit = (r: WaybillReceipt) => {
    setEditingReceipt(r);
    setSelectedJobId(r.jobId);
    setAmountPaid(r.amountPaid);
    setPaymentMethod(r.paymentMethod);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingReceipt(null);
    setSelectedJobId("");
    setAmountPaid(15000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      alert("Please select a dispatch waybill.");
      return;
    }

    const job = jobs.find((j) => j.id === selectedJobId);

    if (editingReceipt) {
      const updatedReceipt: WaybillReceipt = {
        ...editingReceipt,
        jobId: selectedJobId,
        waybillNumber: job?.waybillNumber || editingReceipt.waybillNumber,
        clientName: job?.clientName || editingReceipt.clientName,
        amountPaid: Number(amountPaid),
        paymentMethod,
        paymentStatus: Number(amountPaid) >= (job?.freightFee || 0) ? "Paid" : "Partial",
      };

      await onUpdateReceipt(updatedReceipt);
    } else {
      const newReceipt: WaybillReceipt = {
        id: getNextSequentialId("RCT", receipts, 1001),
        jobId: selectedJobId,
        waybillNumber: job?.waybillNumber || "WB-0000",
        clientName: job?.clientName || "Client",
        amountPaid: Number(amountPaid),
        paymentMethod,
        paymentStatus: Number(amountPaid) >= (job?.freightFee || 0) ? "Paid" : "Partial",
        timestamp: getAppNowString(),
      };

      await onAddReceipt(newReceipt);
    }

    handleCloseForm();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner Financial Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Payments Collected</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--success)", margin: "0.1rem 0 0 0" }}>
              ₱{totalCollected.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(245, 158, 11, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
            💳
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Receivables Balance</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--warning)", margin: "0.1rem 0 0 0" }}>
              ₱{totalOutstanding.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(99, 102, 241, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
            🧾
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Receipts Issued</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)", margin: "0.1rem 0 0 0" }}>
              {receipts.length} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-dim)" }}>vouchers</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Search Receipt ID, Waybill Number, Client or Payment Method..."
          style={{ maxWidth: "450px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {onNavigateToStatement && (
            <button className="btn btn-outline" onClick={onNavigateToStatement} title="Open Client Billing Statement Report">
              📄 View Client Billing Statement
            </button>
          )}

          {user && !showAddForm && (
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
              ➕ Issue Freight Payment Receipt
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              {editingReceipt ? `✏️ Edit Waybill Receipt (${editingReceipt.waybillNumber})` : "💳 Issue Freight Payment Receipt"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">Select Dispatch Job / Waybill</label>
                <select
                  className="form-select"
                  required
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    const j = jobs.find((job) => job.id === e.target.value);
                    if (j) {
                      const netFee = calculateJobNetFee(j, clients);
                      setAmountPaid(netFee);
                    }
                  }}
                >
                  <option value="" disabled>Select Waybill...</option>
                  {jobs.map((j) => {
                    const netFee = calculateJobNetFee(j, clients);
                    const hasPresets = netFee !== j.freightFee;
                    return (
                      <option key={j.id} value={j.id}>
                        {j.waybillNumber} — {j.clientName} (Net Payable: ₱{netFee.toLocaleString()}{hasPresets ? ` [Base: ₱${j.freightFee.toLocaleString()}]` : ""})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Collected / Paid (₱)</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Terms / Method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as WaybillReceipt["paymentMethod"])}
                >
                  <option value="Terms 30 Days">Terms 30 Days</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline" onClick={handleCloseForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingReceipt ? "💾 Save Waybill Changes" : "💾 Issue Receipt"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Receipt ID</th>
              <th>Waybill Number</th>
              <th>Client Shipper</th>
              <th>Freight Fee</th>
              <th>Amount Collected</th>
              <th>Payment Method</th>
              <th>Collection Status</th>
              <th>Date Issued</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                  No payment collection receipts found.
                </td>
              </tr>
            ) : (
              filteredReceipts.map((r) => {
                const job = jobs.find((j) => j.id === r.jobId || j.waybillNumber === r.waybillNumber);
                const baseFreightFee = job ? job.freightFee : r.amountPaid;
                const expectedNetFee = job ? calculateJobNetFee(job, clients) : r.amountPaid;
                const isFullyPaid = r.amountPaid >= expectedNetFee;
                const client = clients.find((c) => c.companyName === r.clientName);
                const hasAdditionsDeductions = client && client.billingAdditions && client.billingAdditions.length > 0;

                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.id}</td>
                    <td style={{ fontWeight: 700 }}>
                      <span className="badge badge-purple">{r.waybillNumber}</span>
                    </td>
                    <td><strong>{r.clientName}</strong></td>
                    <td style={{ fontSize: "0.85rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                        ₱{expectedNetFee.toLocaleString()}
                      </div>
                      {hasAdditionsDeductions && expectedNetFee !== baseFreightFee && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          Base: ₱{baseFreightFee.toLocaleString()} (Includes client presets)
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: "var(--success)" }}>
                      ₱{r.amountPaid.toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontSize: "0.78rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", display: "inline-block" }}>
                        💳 {r.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isFullyPaid ? "badge-success" : "badge-warning"}`}>
                        {isFullyPaid ? "✅ Fully Paid" : "⚠️ Partial Collection"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{r.timestamp}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        {onNavigateToStatement && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            title="View Client Billing Statement"
                            onClick={onNavigateToStatement}
                          >
                            📄 Statement
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          title="Print Official Collection Receipt & Payment Voucher"
                          onClick={() => setPrintableReceipt(r)}
                        >
                          🧾 Print Receipt
                        </button>
                        {user && (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            onClick={() => handleStartEdit(r)}
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {user && onDeleteReceipt && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            onClick={async () => {
                              const confirmed = await showConfirm(
                                `Are you sure you want to delete payment receipt record "${r.id}" (${r.waybillNumber})?`,
                                "Delete Payment Receipt Record"
                              );
                              if (confirmed) {
                                await onDeleteReceipt(r.id);
                              }
                            }}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Printable Receipt Modal */}
      {printableReceipt && (
        <PrintableReceiptModal
          receipt={printableReceipt}
          job={jobs.find((j) => j.id === printableReceipt.jobId || j.waybillNumber === printableReceipt.waybillNumber)}
          companyName={companyName}
          companyLogo={companyLogo}
          onClose={() => setPrintableReceipt(null)}
        />
      )}
    </div>
  );
}
