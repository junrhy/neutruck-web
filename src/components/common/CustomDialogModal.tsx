import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type DialogType = "info" | "warning" | "danger" | "success";

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogContextType {
  showAlert: (message: string, title?: string, type?: DialogType) => Promise<void>;
  showConfirm: (message: string, title?: string, options?: Omit<DialogOptions, "message" | "title">) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a CustomDialogProvider");
  }
  return context;
};

export const CustomDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Notification");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogType, setDialogType] = useState<DialogType>("info");
  const [confirmLabel, setConfirmLabel] = useState("OK");
  const [cancelLabel, setCancelLabel] = useState("Cancel");

  const [resolveRef, setResolveRef] = useState<((val: boolean) => void) | null>(null);

  const showAlert = useCallback((message: string, title: string = "NeuTruck Notice", type: DialogType = "info"): Promise<void> => {
    return new Promise<void>((resolve) => {
      setDialogTitle(title);
      setDialogMessage(message);
      setDialogType(type);
      setIsConfirm(false);
      setConfirmLabel("OK");
      setIsOpen(true);
      setResolveRef(() => () => resolve());
    });
  }, []);

  const showConfirm = useCallback(
    (message: string, title: string = "Confirm Action", options?: Omit<DialogOptions, "message" | "title">): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setDialogTitle(title);
        setDialogMessage(message);
        setDialogType(options?.type || (message.toLowerCase().includes("delete") || message.toLowerCase().includes("remove") ? "danger" : "warning"));
        setIsConfirm(true);
        setConfirmLabel(options?.confirmLabel || (message.toLowerCase().includes("delete") || message.toLowerCase().includes("remove") ? "🗑️ Delete" : "Yes, Proceed"));
        setCancelLabel(options?.cancelLabel || "Cancel");
        setIsOpen(true);
        setResolveRef(() => (val: boolean) => resolve(val));
      });
    },
    []
  );

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef) resolveRef(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef) resolveRef(false);
  };

  // Monkey-patch window.alert and window.confirm so any built-in alert/confirm calls use this UI
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    (window as any).customAlert = showAlert;
    (window as any).customConfirm = showConfirm;

    window.alert = (msg?: any) => {
      const text = String(msg || "");
      const type: DialogType = text.toLowerCase().includes("unique") || text.toLowerCase().includes("please") || text.toLowerCase().includes("required") ? "warning" : "info";
      showAlert(text, "NeuTruck Notice", type);
    };

    window.confirm = (msg?: string) => {
      // Synchronous fallback warning notice in console if sync return needed,
      // but triggering async modal
      const text = String(msg || "");
      showConfirm(text, "Confirmation Required");
      return originalConfirm(msg);
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [showAlert, showConfirm]);

  const getHeaderIcon = () => {
    switch (dialogType) {
      case "danger":
        return "⚠️";
      case "warning":
        return "🔔";
      case "success":
        return "✅";
      case "info":
      default:
        return "🚚";
    }
  };

  const getBorderColor = () => {
    switch (dialogType) {
      case "danger":
        return "var(--danger)";
      case "warning":
        return "var(--warning)";
      case "success":
        return "var(--success)";
      case "info":
      default:
        return "var(--primary)";
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {isOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(5, 8, 18, 0.82)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 999999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1.25rem",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isConfirm) handleCancel();
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${getBorderColor()}`,
              borderRadius: "16px",
              width: "100%",
              maxWidth: "440px",
              padding: "1.75rem",
              boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 25px ${getBorderColor()}25`,
              color: "var(--text-main)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              animation: "scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              position: "relative",
            }}
          >
            {/* Header / Icon */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: `${getBorderColor()}18`,
                  border: `1px solid ${getBorderColor()}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  flexShrink: 0,
                }}
              >
                {getHeaderIcon()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
                  {dialogTitle}
                </h3>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-dim)", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {dialogMessage}
                </p>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              {isConfirm && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancel}
                  style={{ minWidth: "90px", fontSize: "0.85rem" }}
                >
                  {cancelLabel}
                </button>
              )}
              <button
                type="button"
                className={`btn ${dialogType === "danger" ? "btn-danger" : "btn-primary"}`}
                onClick={handleConfirm}
                style={{
                  minWidth: "100px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  ...(dialogType === "danger"
                    ? { background: "var(--danger)", color: "#ffffff" }
                    : dialogType === "warning"
                    ? { background: "var(--warning)", color: "#000000" }
                    : dialogType === "success"
                    ? { background: "var(--success)", color: "#ffffff" }
                    : {}),
                }}
                autoFocus
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
