import React from "react";
import { DispatchJob, ClientShipper, BillingColumnConfig, BillingAdditionPreset } from "../../types";
import { StatementStatus } from "./BillingStatementReport";

interface PrintableBillingSheetProps {
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  statementStatus: StatementStatus;
  selectedClient: string;
  matchedClientObj?: ClientShipper;
  billingNumber: string;
  setBillingNumber: (val: string) => void;
  billingDate: string;
  setBillingDate: (val: string) => void;
  dueDate?: string;
  setDueDate?: (val: string) => void;
  clientAddress: string;
  setClientAddress: (val: string) => void;
  clientTinNumber: string;
  remarks: string;
  setRemarks: (val: string) => void;
  enabledCols: BillingColumnConfig[];
  clientJobs: DispatchJob[];
  setWeighingFees: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  getRowWeighingFee: (jobId: string) => number;
  getRowTotal: (j: DispatchJob) => number;
  formatDateShort: (dateStr?: string) => string;
  customAdditions: BillingAdditionPreset[];
  calculatedAdditions: Array<BillingAdditionPreset & { calculatedValue: number }>;
  subtotalAmount: number;
  grandTotal: number;
  handleRemoveCustomAddition: (id: string) => void;
  sigPreparedBy?: string;
  sigCheckedBy?: string;
  sigApprovedBy?: string;
  sigPreparedByImg?: string;
  sigCheckedByImg?: string;
  sigApprovedByImg?: string;
}

export const PrintableBillingSheet: React.FC<PrintableBillingSheetProps> = ({
  companyName,
  companyLogo = "",
  companyAddress = "",
  companyPhone = "",
  statementStatus,
  selectedClient,
  billingNumber,
  setBillingNumber,
  billingDate,
  setBillingDate,
  dueDate = "",
  setDueDate,
  clientAddress,
  setClientAddress,
  clientTinNumber,
  remarks,
  setRemarks,
  enabledCols,
  clientJobs,
  setWeighingFees,
  getRowWeighingFee,
  getRowTotal,
  formatDateShort,
  customAdditions,
  calculatedAdditions,
  subtotalAmount,
  grandTotal,
  handleRemoveCustomAddition,
  sigPreparedBy = "ANGEL ABACON",
  sigCheckedBy = "CHRISTIE DIONGZON",
  sigApprovedBy = "MH. TAN",
  sigPreparedByImg = "",
  sigCheckedByImg = "",
  sigApprovedByImg = "",
}) => {
  // Check if due date is overdue compared to today
  const isOverdue = (() => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  })();

  return (
    <div
      id="billing-statement-paper-sheet"
      style={{
        background: "#ffffff",
        color: "#000000",
        borderRadius: "4px",
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Overdue Rubber Stamp Overlay */}
      {isOverdue && (
        <div
          style={{
            position: "absolute",
            top: "140px",
            right: "40px",
            transform: "rotate(-16deg)",
            border: "4px double #dc2626",
            color: "#dc2626",
            padding: "0.25rem 1.25rem",
            borderRadius: "8px",
            fontWeight: 900,
            fontSize: "2.2rem",
            letterSpacing: "4px",
            textTransform: "uppercase",
            opacity: 0.82,
            pointerEvents: "none",
            userSelect: "none",
            boxShadow: "0 0 0 2px rgba(220, 38, 38, 0.2)",
            zIndex: 10,
          }}
        >
          OVERDUE
        </div>
      )}
      {/* Document Company Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem", borderBottom: "2px solid #000000", paddingBottom: "0.35rem" }}>
        {companyLogo && (
          <img
            src={companyLogo}
            alt="Company Logo"
            style={{ maxHeight: "65px", maxWidth: "140px", objectFit: "contain", borderRadius: "4px" }}
          />
        )}
        <div style={{ textAlign: companyLogo ? "left" : "center" }}>
          <h1 style={{ margin: 0, textTransform: "uppercase", fontSize: "1.4rem", fontWeight: 900, letterSpacing: "1px", color: "#000000" }}>
            {companyName}
          </h1>
          {(companyAddress || companyPhone) && (
            <div style={{ marginTop: "0.2rem", lineHeight: 1.4, display: "flex", flexDirection: "column", alignItems: companyLogo ? "flex-start" : "center", gap: "0.1rem" }}>
              {companyAddress && (
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#111" }}>{companyAddress}</div>
              )}
              {companyPhone && (
                <div style={{ fontSize: "0.8rem", color: "#333" }}>Tel: {companyPhone}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title Bar */}
      <div style={{ textAlign: "center", margin: "0.25rem 0", position: "relative" }}>
        <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "2px" }}>
          BILLING STATEMENT
        </h2>
        <div
          className="no-print"
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "0.68rem",
            fontWeight: 800,
            textTransform: "uppercase",
            padding: "0.15rem 0.55rem",
            borderRadius: "4px",
            border: statementStatus === "Approved" ? "1.5px solid #16a34a" : statementStatus === "Checked" ? "1.5px solid #9333ea" : statementStatus === "Prepared" ? "1.5px solid #2563eb" : "1.5px solid #64748b",
            color: statementStatus === "Approved" ? "#15803d" : statementStatus === "Checked" ? "#7e22ce" : statementStatus === "Prepared" ? "#1d4ed8" : "#475569",
            letterSpacing: "0.5px",
          }}
        >
          STATUS: {statementStatus}
        </div>
      </div>

      {/* Client & Billing Metadata Block */}
      <div style={{ border: "2px solid #000000", padding: "0.45rem 0.65rem", display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.82rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "0.78rem", color: "#444" }}>BILLING DATE :</strong>{" "}
              <input
                type="text"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                style={{ border: "none", fontWeight: 800, fontSize: "0.82rem", width: "160px", color: "#000", background: "transparent" }}
              />
            </div>
            {dueDate && (
              <div>
                <strong style={{ fontSize: "0.78rem", color: "#b91c1c" }}>DUE DATE :</strong>{" "}
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate && setDueDate(e.target.value)}
                  style={{ border: "none", fontWeight: 900, fontSize: "0.82rem", width: "160px", color: "#b91c1c", background: "transparent" }}
                />
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.35rem" }}>
            <strong style={{ fontSize: "0.88rem", fontWeight: 900 }}>Billing No.</strong>
            <input
              type="text"
              value={billingNumber}
              onChange={(e) => setBillingNumber(e.target.value)}
              placeholder="—"
              style={{
                border: "none",
                fontWeight: 900,
                fontSize: "0.88rem",
                width: "140px",
                color: "#000",
                background: "transparent",
                textAlign: "right",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "#000" }}>
            {selectedClient ? selectedClient.toUpperCase() : "NO CLIENT SELECTED"}
          </span>
          {clientTinNumber && (
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111", fontFamily: "monospace" }}>
              TIN: {clientTinNumber}
            </span>
          )}
        </div>

        {(clientAddress || remarks === "") && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <strong style={{ fontSize: "0.78rem", color: "#444", whiteSpace: "nowrap" }}>ADDRESS :</strong>
            <input
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              style={{ border: "none", width: "100%", fontSize: "0.82rem", fontWeight: 600, color: "#000", background: "transparent" }}
              placeholder=""
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <strong style={{ fontSize: "0.78rem", color: "#444", whiteSpace: "nowrap" }}>REMARKS :</strong>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            style={{ border: "none", width: "100%", fontSize: "0.82rem", color: "#000", background: "transparent" }}
            placeholder=""
          />
        </div>
      </div>

      {/* Itemized Billing Table */}
      <div style={{ marginTop: "0.35rem", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.75rem",
            color: "#000000",
            border: "2px solid #000000",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f1f1", borderBottom: "2px solid #000000", textAlign: "center", fontWeight: 800 }}>
              {enabledCols.map((col, index) => (
                <th
                  key={col.id}
                  style={{
                    padding: "0.3rem 0.25rem",
                    borderRight: index === enabledCols.length - 1 ? "none" : "1px solid #000000",
                    width: col.width || "auto",
                    textAlign: col.align || "center",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientJobs.length > 0 ? (
              clientJobs.map((j, idx) => {
                const weighingFee = getRowWeighingFee(j.id);
                const rowTotal = getRowTotal(j);

                const renderCellContent = (colId: string) => {
                  switch (colId) {
                    case "si_no":
                      return <span style={{ fontWeight: 700 }}>{idx + 1}</span>;
                    case "transaction_date":
                      return formatDateShort(j.dispatchDate);
                    case "waybill_no":
                      return <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{j.waybillNumber}</span>;
                    case "service_mode":
                      return j.freightBillingTerms || (j.containerNumber ? "Container" : "Per Trip");
                    case "shipping_line":
                      return <span style={{ fontWeight: 600 }}>{j.shippingLine || "—"}</span>;
                    case "container_no":
                      return <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{j.containerNumber || "—"}</span>;
                    case "seal_no":
                      return <span style={{ fontFamily: "monospace" }}>{j.sealNumber || "—"}</span>;
                    case "trailer_no":
                      return <span style={{ fontFamily: "monospace" }}>{j.trailerNumber || "—"}</span>;
                    case "pickup_location":
                      return j.pickupLocation || "—";
                    case "destination":
                      return <span style={{ fontWeight: 700 }}>{j.dropoffLocation || "—"}</span>;
                    case "cargo_desc":
                      return j.cargoDescription || "—";
                    case "weight_tons":
                      return j.vanSize ? `${j.vanSize}${j.weightTons ? ` (${j.weightTons} T)` : ""}` : (j.weightTons ? `${j.weightTons} T` : "—");
                    case "truck_plate":
                      return <span style={{ fontWeight: 700 }}>{j.truckPlate || "—"}</span>;
                    case "driver_name":
                      return j.driverName || "—";
                    case "helper_name":
                      return j.helperName || "—";
                    case "roro_fee":
                      return (j.roroTicketFee || 0) > 0 ? `₱${(j.roroTicketFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
                    case "withdrawal_date":
                      return formatDateShort(j.containerMovement?.withdrawalDate);
                    case "pullout_date":
                      return formatDateShort(j.containerMovement?.pullOutDate);
                    case "gatein_date":
                      return formatDateShort(j.containerMovement?.gateInDate);
                    case "return_dest":
                      return j.returnDestination || "—";
                    case "delivery_status":
                      return <span style={{ fontWeight: 600 }}>{j.deliveryStatus}</span>;
                    case "fuel_allowance":
                      return (j.fuelAllowance || 0) > 0 ? `₱${(j.fuelAllowance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
                    case "weighing_fee":
                      return (
                        <input
                          type="number"
                          value={weighingFee}
                          onChange={(e) => setWeighingFees((prev) => ({ ...prev, [j.id]: Number(e.target.value) }))}
                          style={{ width: "55px", border: "none", textAlign: "right", background: "transparent", fontSize: "0.75rem" }}
                        />
                      );
                    case "trucking_charges":
                      return <span style={{ fontWeight: 700 }}>{(j.freightFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                    case "other_charges":
                      return "—";
                    case "total_amount":
                      return <span style={{ fontWeight: 800 }}>{rowTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                    default:
                      return "—";
                  }
                };

                return (
                  <tr key={j.id} style={{ borderBottom: "1px solid #000000", height: "28px", textAlign: "center" }}>
                    {enabledCols.map((col, index) => (
                      <td
                        key={col.id}
                        style={{
                          padding: "0.2rem 0.3rem",
                          borderRight: index === enabledCols.length - 1 ? "none" : "1px solid #000000",
                          textAlign: col.align || "center",
                        }}
                      >
                        {renderCellContent(col.id)}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #000000", height: "28px" }}>
                  {enabledCols.map((col, index) => (
                    <td
                      key={col.id}
                      style={{
                        borderRight: index === enabledCols.length - 1 ? "none" : "1px solid #000000",
                        textAlign: col.align || "center",
                      }}
                    >
                      —
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Statement Footer & Grand Total */}
      <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
        {customAdditions.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
            <span style={{ color: "#444", fontWeight: 700 }}>SUBTOTAL:</span>
            <span style={{ fontFamily: "monospace", fontWeight: 800, width: "130px", textAlign: "right" }}>
              ₱{subtotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {calculatedAdditions.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
            <button
              type="button"
              className="btn btn-outline btn-xs no-print"
              onClick={() => handleRemoveCustomAddition(item.id)}
              title="Remove Item"
              style={{ padding: "0.1rem 0.35rem", fontSize: "0.68rem", marginRight: "0.2rem" }}
            >
              ✕
            </button>
            <span style={{ color: item.calculatedValue < 0 ? "#dc2626" : "#111827", fontWeight: 600 }}>
              {item.label} {item.isPercentage ? `(${item.amount}%)` : ""}:
            </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, width: "130px", textAlign: "right", color: item.calculatedValue < 0 ? "#dc2626" : "#111827" }}>
              {item.calculatedValue < 0 ? "-" : ""}₱{Math.abs(item.calculatedValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem", marginTop: "0.2rem" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 900, letterSpacing: "1px" }}>
            {customAdditions.length > 0 ? "GRAND TOTAL:" : "TOTAL:"}
          </span>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 900,
              borderBottom: "4px double #000000",
              padding: "0.15rem 0.75rem",
              fontFamily: "monospace",
            }}
          >
            ₱{grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Signature Block */}
      {(() => {
        const showPreparedSig = (statementStatus === "Prepared" || statementStatus === "Checked" || statementStatus === "Approved") && sigPreparedByImg;
        const showCheckedSig = (statementStatus === "Checked" || statementStatus === "Approved") && sigCheckedByImg;
        const showApprovedSig = statementStatus === "Approved" && sigApprovedByImg;

        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem 4rem",
              marginTop: "2.5rem",
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            {/* Prepared By */}
            <div>
              <div style={{ color: "#555", fontWeight: 600, fontSize: "0.75rem" }}>Prepared by:</div>
              <div style={{ height: "45px", display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                {showPreparedSig && (
                  <img
                    src={sigPreparedByImg}
                    alt="Prepared Signature"
                    style={{ maxHeight: "42px", maxWidth: "200px", objectFit: "contain", marginBottom: "-3px" }}
                  />
                )}
              </div>
              <div style={{ width: "80%", maxWidth: "230px", borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase" }}>
                {sigPreparedBy || "ANGEL ABACON"}
              </div>
            </div>

            {/* Checked By */}
            <div>
              <div style={{ color: "#555", fontWeight: 600, fontSize: "0.75rem" }}>Checked by:</div>
              <div style={{ height: "45px", display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                {showCheckedSig && (
                  <img
                    src={sigCheckedByImg}
                    alt="Checked Signature"
                    style={{ maxHeight: "42px", maxWidth: "200px", objectFit: "contain", marginBottom: "-3px" }}
                  />
                )}
              </div>
              <div style={{ width: "80%", maxWidth: "230px", borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase" }}>
                {sigCheckedBy || "CHRISTIE DIONGZON"}
              </div>
            </div>

            {/* Approved By */}
            <div>
              <div style={{ color: "#555", fontWeight: 600, fontSize: "0.75rem" }}>Approved by:</div>
              <div style={{ height: "45px", display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                {showApprovedSig && (
                  <img
                    src={sigApprovedByImg}
                    alt="Approved Signature"
                    style={{ maxHeight: "42px", maxWidth: "200px", objectFit: "contain", marginBottom: "-3px" }}
                  />
                )}
              </div>
              <div style={{ width: "80%", maxWidth: "230px", borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase" }}>
                {sigApprovedBy || "MH. TAN"}
              </div>
            </div>

            {/* Received By */}
            <div>
              <div style={{ color: "#555", fontWeight: 600, fontSize: "0.75rem" }}>Received by:</div>
              <div style={{ height: "45px" }} />
              <div style={{ width: "80%", maxWidth: "230px", borderTop: "1.5px solid #000", paddingTop: "0.3rem", fontSize: "0.75rem", color: "#666", fontStyle: "italic" }}>
                Signature over printed name / Date
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
