import React from "react";

type ChecklistStatus = "OK" | "Needs Attention" | "Not Checked";

interface StepInspectionProps {
  enablePreTripInspection: boolean;
  setEnablePreTripInspection: (val: boolean) => void;
  checklistBattery: ChecklistStatus;
  setChecklistBattery: (val: ChecklistStatus) => void;
  checklistLights: ChecklistStatus;
  setChecklistLights: (val: ChecklistStatus) => void;
  checklistOil: ChecklistStatus;
  setChecklistOil: (val: ChecklistStatus) => void;
  checklistWater: ChecklistStatus;
  setChecklistWater: (val: ChecklistStatus) => void;
  checklistBrakes: ChecklistStatus;
  setChecklistBrakes: (val: ChecklistStatus) => void;
  checklistAirPressure: ChecklistStatus;
  setChecklistAirPressure: (val: ChecklistStatus) => void;
  checklistGasFuel: ChecklistStatus;
  setChecklistGasFuel: (val: ChecklistStatus) => void;
  checklistElectrical: ChecklistStatus;
  setChecklistElectrical: (val: ChecklistStatus) => void;
  checklistTires: ChecklistStatus;
  setChecklistTires: (val: ChecklistStatus) => void;
  checklistSelfDriver: ChecklistStatus;
  setChecklistSelfDriver: (val: ChecklistStatus) => void;
  checklistNotes: string;
  setChecklistNotes: (val: string) => void;
}

export const StepInspection: React.FC<StepInspectionProps> = ({
  enablePreTripInspection,
  setEnablePreTripInspection,
  checklistBattery,
  setChecklistBattery,
  checklistLights,
  setChecklistLights,
  checklistOil,
  setChecklistOil,
  checklistWater,
  setChecklistWater,
  checklistBrakes,
  setChecklistBrakes,
  checklistAirPressure,
  setChecklistAirPressure,
  checklistGasFuel,
  setChecklistGasFuel,
  checklistElectrical,
  setChecklistElectrical,
  checklistTires,
  setChecklistTires,
  checklistSelfDriver,
  setChecklistSelfDriver,
  checklistNotes,
  setChecklistNotes,
}) => {
  const markAllPass = () => {
    setChecklistBattery("OK");
    setChecklistLights("OK");
    setChecklistOil("OK");
    setChecklistWater("OK");
    setChecklistBrakes("OK");
    setChecklistAirPressure("OK");
    setChecklistGasFuel("OK");
    setChecklistElectrical("OK");
    setChecklistTires("OK");
    setChecklistSelfDriver("OK");
  };

  const blowbagetsList = [
    { key: "B", label: "🔋 Battery", value: checklistBattery, setter: setChecklistBattery },
    { key: "L", label: "💡 Lights", value: checklistLights, setter: setChecklistLights },
    { key: "O", label: "🛢️ Oil", value: checklistOil, setter: setChecklistOil },
    { key: "W", label: "💧 Water / Coolant", value: checklistWater, setter: setChecklistWater },
    { key: "B2", label: "🛑 Brakes", value: checklistBrakes, setter: setChecklistBrakes },
    { key: "A", label: "💨 Air Pressure", value: checklistAirPressure, setter: setChecklistAirPressure },
    { key: "G", label: "⛽ Gas / Fuel", value: checklistGasFuel, setter: setChecklistGasFuel },
    { key: "E", label: "⚡ Electrical", value: checklistElectrical, setter: setChecklistElectrical },
    { key: "T", label: "🛞 Tires", value: checklistTires, setter: setChecklistTires },
    { key: "S", label: "👨‍✈️ Self / Driver", value: checklistSelfDriver, setter: setChecklistSelfDriver },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ padding: "1rem", border: "1px dashed var(--primary)", borderRadius: "8px", background: "rgba(0, 212, 255, 0.03)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", color: "var(--primary)" }}>
          <input
            type="checkbox"
            checked={enablePreTripInspection}
            onChange={(e) => setEnablePreTripInspection(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
          />
          🛠️ Enable Pre-Trip Unit Safety Inspection Checklist (BLOWBAGETS)
        </label>
        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginTop: "0.25rem", marginLeft: "2.1rem" }}>
          Uncheck if your fleet monitors unit maintenance and safety inspections per vehicle schedule rather than per individual trip.
        </span>
      </div>

      {enablePreTripInspection && (
        <div style={{ padding: "1rem 1.25rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              🛠️ Pre-Trip Safety Inspection
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={markAllPass}
              style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem", borderColor: "var(--success)", color: "var(--success)", fontWeight: 700 }}
            >
              ⚡ Mark All OK
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
            {blowbagetsList.map((item) => (
              <div key={item.key} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", whiteSpace: "nowrap" }}>{item.label}</label>
                <select className="form-select" style={{ padding: "0.35rem 1.4rem 0.35rem 0.5rem", fontSize: "0.78rem" }} value={item.value} onChange={(e) => item.setter(e.target.value as ChecklistStatus)}>
                  <option value="Not Checked">❓ Not Checked</option>
                  <option value="OK">✅ Pass</option>
                  <option value="Needs Attention">⚠️ Defect</option>
                </select>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ margin: 0, paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
            <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              style={{ padding: "0.4rem 0.65rem", fontSize: "0.8rem" }}
              placeholder="e.g. Air pressure adjusted, oil topped up"
              value={checklistNotes}
              onChange={(e) => setChecklistNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

