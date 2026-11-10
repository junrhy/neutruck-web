import { WaybillReceipt, DispatchJob } from "../types";

interface PrintableReceiptModalProps {
  receipt: WaybillReceipt;
  job?: DispatchJob;
  companyName: string;
  companyLogo?: string;
  onClose: () => void;
}

export default function PrintableReceiptModal({
  receipt,
  job,
  companyName,
  companyLogo = "",
  onClose,
}: PrintableReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-modal-overlay">
      <div className="printable-modal-container">
        {/* Top Controls (Hidden on print) */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🧾 Official Collection Receipt ({receipt.waybillNumber})</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print Official Collection Receipt
            </button>
            <button className="btn btn-outline" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="printable-ticket" id="receipt-ticket">
          {/* Header Branding */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {companyLogo && (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  style={{ maxHeight: "60px", maxWidth: "120px", objectFit: "contain", borderRadius: "4px" }}
                />
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "1px", color: "#000" }}>
                  {companyName}
                </h1>
                <div style={{ fontSize: "0.85rem", color: "#444", fontWeight: 700, marginTop: "0.2rem" }}>
                  OFFICIAL COLLECTION RECEIPT &amp; PAYMENT VOUCHER
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  Freight Billing &amp; Inter-Island Transport Services
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#000", fontFamily: "monospace" }}>
                {receipt.id}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#555", marginTop: "0.25rem" }}>
                Date Issued: <strong>{receipt.timestamp}</strong>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#555" }}>
                Waybill Ref: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{receipt.waybillNumber}</span>
              </div>
            </div>
          </div>

          {/* Client & Billing Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#666", marginBottom: "0.4rem" }}>
                RECEIVED FROM (CLIENT SHIPPER)
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#000" }}>{receipt.clientName}</div>
              {job?.clientPhone && <div style={{ fontSize: "0.82rem", color: "#333", marginTop: "0.25rem" }}>📞 Phone: {job.clientPhone}</div>}
            </div>

            <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#666", marginBottom: "0.4rem" }}>
                PAYMENT DISPATCH DETAILS
              </div>
              <div style={{ fontSize: "0.85rem", color: "#333" }}>
                📍 <strong>Route:</strong> {job?.pickupLocation || "Origin"} ➔ {job?.dropoffLocation || "Destination"}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#333", marginTop: "0.25rem" }}>
                🚚 <strong>Vehicle Plate:</strong> {job?.truckPlate || "N/A"}
              </div>
            </div>
          </div>

          {/* Payment Itemization Table */}
          <div style={{ border: "1px solid #ccc", borderRadius: "6px", marginBottom: "1.5rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#000" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.65rem 1rem" }}>Description / Particulars</th>
                  <th style={{ padding: "0.65rem 1rem" }}>Payment Method</th>
                  <th style={{ padding: "0.65rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.65rem 1rem", textAlign: "right" }}>Amount Collected</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                    Freight Hauling Payment for Waybill {receipt.waybillNumber}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>{receipt.paymentMethod}</td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#166534" }}>{receipt.paymentStatus}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 800, fontSize: "1.1rem" }}>
                    ₱{receipt.amountPaid.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures & Proof of Collection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginTop: "2.5rem", paddingTop: "0.5rem", pageBreakInside: "avoid" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ height: "35px" }}></div>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", color: "#000" }}>
                {receipt.clientName.toUpperCase()}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>Client Shipper Representative</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ height: "35px" }}></div>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", color: "#000" }}>
                AUTHORIZED CASHIER / ACCOUNTANT
              </div>
              <div style={{ fontSize: "0.7rem", color: "#666" }}>{companyName} Logistics Representative</div>
            </div>
          </div>

          {/* Footer Notice */}
          <div style={{ textAlign: "center", fontSize: "0.68rem", color: "#94a3b8", marginTop: "1.5rem", borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem" }}>
            Thank you for shipping with {companyName}! Official Electronic Payment Collection Voucher.
          </div>
        </div>
      </div>
    </div>
  );
}
