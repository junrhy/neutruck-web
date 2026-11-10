import React from "react";

interface StepContainerProps {
  containerNumber: string;
  setContainerNumber: (val: string) => void;
  trailerNumber: string;
  setTrailerNumber: (val: string) => void;
  sealNumber: string;
  setSealNumber: (val: string) => void;
}

export const StepContainer: React.FC<StepContainerProps> = ({
  containerNumber,
  setContainerNumber,
  trailerNumber,
  setTrailerNumber,
  sealNumber,
  setSealNumber,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ padding: "1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          📦 Intermodal Equipment &amp; Container Tracking
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Container Serial Number (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. MSCU-882910-4"
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trailer Chassis Plate No. (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. TRL-409"
              value={trailerNumber}
              onChange={(e) => setTrailerNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Security Bolt Seal No. (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. SEAL-998123"
              value={sealNumber}
              onChange={(e) => setSealNumber(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
