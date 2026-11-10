import React from "react";
import { SavedBillingRecord } from "../../types";

interface DeleteStatementConfirmModalProps {
  showModal: boolean;
  statementToDelete: SavedBillingRecord | null;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export const DeleteStatementConfirmModal: React.FC<DeleteStatementConfirmModalProps> = ({
  showModal,
  statementToDelete,
  onClose,
  onConfirmDelete,
}) => {
  if (!showModal || !statementToDelete) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          animation: "fadeIn 0.2s ease-in-out",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.1rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(220, 38, 38, 0.08)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            ⚠️ Delete Billing Statement
          </h3>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "0.9rem", color: "var(--text-main)", lineHeight: 1.5 }}>
            Are you sure you want to permanently delete <strong>Billing Statement #{statementToDelete.statementNo}</strong> for <strong>{statementToDelete.clientName}</strong>?
          </div>

          <div
            style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              borderRadius: "var(--radius)",
              padding: "0.85rem 1rem",
              fontSize: "0.82rem",
              color: "#ef4444",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            <strong>⚠️ Warning:</strong>
            <div>• This statement record snapshot will be removed from history.</div>
            <div>• This action cannot be undone.</div>
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
            className="btn btn-danger btn-sm"
            onClick={onConfirmDelete}
            style={{ fontWeight: 700, padding: "0.45rem 1.1rem" }}
          >
            🗑 Delete Statement
          </button>
        </div>
      </div>
    </div>
  );
};
