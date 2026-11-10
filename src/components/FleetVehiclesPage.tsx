import { useState } from "react";
import { TruckVehicle, DispatchJob, MaintenanceLog, DriverProfile, HelperProfile } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";
import { ManageTruckModelsModal } from "./ManageTruckModelsModal";

interface FleetVehiclesPageProps {
  vehicles: TruckVehicle[];
  drivers?: DriverProfile[];
  helpers?: HelperProfile[];
  jobs: DispatchJob[];
  maintenanceLogs: MaintenanceLog[];
  isLicensedAndPaid?: boolean;
  truckModels?: string[];
  onAddVehicle: (vehicle: TruckVehicle) => Promise<void>;
  onUpdateVehicle: (vehicle: TruckVehicle) => Promise<void>;
  onUpdateStatus: (id: string, status: TruckVehicle["status"]) => Promise<void>;
  onDecommission: (id: string, reason?: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onAddTruckModel?: (modelName: string) => void;
  onUpdateTruckModel?: (oldName: string, newName: string) => void;
  onDeleteTruckModel?: (modelName: string) => void;
  onOpenFuelPage?: () => void;
}

export default function FleetVehiclesPage({
  vehicles,
  drivers = [],
  helpers = [],
  jobs,
  maintenanceLogs,
  isLicensedAndPaid = true,
  truckModels = [
    "10-Wheeler Wingvan",
    "Prime Mover 40ft Container",
    "6-Wheeler Closed Aluminum Van",
    "Tractor Head Trailer",
    "Dump Truck Heavy Hauler",
  ],
  onAddVehicle,
  onUpdateVehicle,
  onUpdateStatus,
  onDecommission,
  onRestore,
  onDeleteVehicle,
  onAddTruckModel,
  onUpdateTruckModel,
  onDeleteTruckModel,
  onOpenFuelPage,
}: FleetVehiclesPageProps) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"active" | "decommissioned">("active");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TruckVehicle | null>(null);
  const [isManageModelsOpen, setIsManageModelsOpen] = useState(false);

  // Form State
  const [plateNumber, setPlateNumber] = useState("");
  const [modelType, setModelType] = useState(truckModels[0] || "10-Wheeler Wingvan");
  const [capacityTons, setCapacityTons] = useState<number>(25);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [helperName, setHelperName] = useState("");
  const [helperPhone, setHelperPhone] = useState("");
  const [fuelCapacityLiters, setFuelCapacityLiters] = useState<number | "">(300);
  const [currentFuelLevelPercent, setCurrentFuelLevelPercent] = useState<number | "">(100);
  const [currentFuelLiters, setCurrentFuelLiters] = useState<number | "">("");
  const [fuelCardNumber, setFuelCardNumber] = useState("");
  const [gpsTrackingUrl, setGpsTrackingUrl] = useState("");
  const [gpsAuthToken, setGpsAuthToken] = useState("");
  const [gpsAutoSync, setGpsAutoSync] = useState(true);
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [showAdvancedGps, setShowAdvancedGps] = useState(false);

  const filteredVehicles = vehicles.filter((v) => {
    const isDecommissioned = v.status === "Decommissioned" || v.isArchived === true;
    const matchesView = viewMode === "decommissioned" ? isDecommissioned : !isDecommissioned;
    const matchesSearch =
      v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.modelType.toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName && v.driverName.toLowerCase().includes(search.toLowerCase())) ||
      (v.helperName && v.helperName.toLowerCase().includes(search.toLowerCase()));
    return matchesView && matchesSearch;
  });

  const handleStartEdit = (v: TruckVehicle) => {
    setEditingVehicle(v);
    setPlateNumber(v.plateNumber);
    setModelType(v.modelType);
    setCapacityTons(v.capacityTons);
    setDriverName(v.driverName || "");
    setDriverPhone(v.driverPhone || "");
    setHelperName(v.helperName || "");
    setHelperPhone(v.helperPhone || "");
    setFuelCapacityLiters(v.fuelCapacityLiters ?? 300);
    setCurrentFuelLevelPercent(v.currentFuelLevelPercent ?? 100);
    setCurrentFuelLiters(v.currentFuelLiters ?? "");
    setFuelCardNumber(v.fuelCardNumber || "");
    setGpsTrackingUrl(v.gpsTrackingUrl || "");
    setGpsAuthToken(v.gpsAuthToken || "");
    setGpsAutoSync(v.gpsAutoSync !== false);
    setShowAdvancedGps(!!v.gpsTrackingUrl);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingVehicle(null);
    setPlateNumber("");
    setDriverName("");
    setDriverPhone("");
    setHelperName("");
    setHelperPhone("");
    setFuelCapacityLiters(300);
    setCurrentFuelLevelPercent(100);
    setCurrentFuelLiters("");
    setFuelCardNumber("");
    setGpsTrackingUrl("");
    setGpsAuthToken("");
    setGpsAutoSync(true);
    setShowAdvancedGps(false);
  };

  const handleTestGpsEndpoint = async () => {
    if (!gpsTrackingUrl.trim()) {
      showAlert("Please enter a GET Request URL first.", "Missing URL", "warning");
      return;
    }
    setIsTestingGps(true);
    try {
      const headers: Record<string, string> = {};
      if (gpsAuthToken.trim()) {
        headers["Authorization"] = gpsAuthToken.trim().startsWith("Bearer ") ? gpsAuthToken.trim() : `Bearer ${gpsAuthToken.trim()}`;
      }
      const res = await fetch(gpsTrackingUrl.trim(), { method: "GET", headers });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const sampleLoc = data.locationName || data.location || data.address || data.city || JSON.stringify(data);
      showAlert(`GPS GET Request Successful! HTTP ${res.status}. Extracted Location: "${sampleLoc}"`, "GPS Endpoint Verified", "success");
    } catch (err: any) {
      showAlert(`GPS Endpoint Test Failed: ${err.message || err}`, "GPS Error", "danger");
    } finally {
      setIsTestingGps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim() || !driverName.trim()) {
      showAlert("Please fill in plate number and driver name.", "Validation Error", "warning");
      return;
    }

    const capacityNum = fuelCapacityLiters === "" ? undefined : Number(fuelCapacityLiters);
    const litersNum = currentFuelLiters === "" ? undefined : Number(currentFuelLiters);
    let calculatedPercent = currentFuelLevelPercent === "" ? undefined : Number(currentFuelLevelPercent);

    if (litersNum !== undefined && capacityNum && capacityNum > 0) {
      calculatedPercent = Math.min(100, Math.round((litersNum / capacityNum) * 100));
    }

    if (editingVehicle) {
      const updatedVehicle: TruckVehicle = {
        ...editingVehicle,
        plateNumber: plateNumber.trim().toUpperCase(),
        modelType,
        capacityTons: Number(capacityTons),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        helperName: helperName.trim() || undefined,
        helperPhone: helperPhone.trim() || undefined,
        fuelCapacityLiters: capacityNum,
        currentFuelLevelPercent: calculatedPercent,
        currentFuelLiters: litersNum,
        fuelCardNumber: fuelCardNumber.trim() || undefined,
        gpsTrackingUrl: gpsTrackingUrl.trim() || undefined,
        gpsAuthToken: gpsAuthToken.trim() || undefined,
        gpsAutoSync,
      };
      await onUpdateVehicle(updatedVehicle);
    } else {
      const newVehicle: TruckVehicle = {
        id: `TRK-${Math.floor(100 + Math.random() * 900)}`,
        plateNumber: plateNumber.trim().toUpperCase(),
        modelType,
        capacityTons: Number(capacityTons),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        helperName: helperName.trim() || undefined,
        helperPhone: helperPhone.trim() || undefined,
        fuelCapacityLiters: capacityNum,
        currentFuelLevelPercent: calculatedPercent,
        currentFuelLiters: litersNum,
        fuelCardNumber: fuelCardNumber.trim() || undefined,
        gpsTrackingUrl: gpsTrackingUrl.trim() || undefined,
        gpsAuthToken: gpsAuthToken.trim() || undefined,
        gpsAutoSync,
        status: "Available",
      };
      await onAddVehicle(newVehicle);
    }

    handleCloseForm();
  };

  const [decommissionModalVehicle, setDecommissionModalVehicle] = useState<TruckVehicle | null>(null);
  const [decommissionReasonInput, setDecommissionReasonInput] = useState("Total Loss / Engine Failure Write-Off");

  const handleOpenDecommissionModal = (v: TruckVehicle) => {
    setDecommissionModalVehicle(v);
    setDecommissionReasonInput("Total Loss / Engine Failure Write-Off");
  };

  const handleConfirmDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decommissionModalVehicle) return;
    await onDecommission(decommissionModalVehicle.id, decommissionReasonInput.trim());
    setDecommissionModalVehicle(null);
  };

  const handleDeleteWithSafetyCheck = async (v: TruckVehicle) => {
    const relatedDispatches = jobs.filter((j) => j.truckId === v.id || j.truckPlate === v.plateNumber);
    const relatedMaintenance = maintenanceLogs.filter((m) => m.truckId === v.id || m.plateNumber === v.plateNumber);

    if (relatedDispatches.length > 0 || relatedMaintenance.length > 0) {
      showAlert(
        `Cannot permanently delete vehicle "${v.plateNumber}" (${v.modelType}). This vehicle has ${relatedDispatches.length} historical waybills and ${relatedMaintenance.length} maintenance records.`,
        "Deletion Locked",
        "danger"
      );
      return;
    }

    const confirmed = await showConfirm(`Are you sure you want to PERMANENTLY delete vehicle "${v.plateNumber}"? This action cannot be undone.`, "Delete Vehicle");
    if (confirmed) {
      await onDeleteVehicle(v.id);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1, maxWidth: "650px" }}>
          {/* Active / Decommissioned View Toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "0.2rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={() => setViewMode("active")}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "active" ? "var(--primary)" : "transparent",
                color: viewMode === "active" ? "#fff" : "var(--text-main)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              🚛 Active Fleet ({vehicles.filter((v) => v.status !== "Decommissioned" && !v.isArchived).length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("decommissioned")}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "decommissioned" ? "var(--danger)" : "transparent",
                color: viewMode === "decommissioned" ? "#fff" : "var(--text-main)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              🛠️ Decommissioned / Retired ({vehicles.filter((v) => v.status === "Decommissioned" || v.isArchived).length})
            </button>
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="Search Plate Number, Vehicle Model, or Driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {user && viewMode === "active" && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (onOpenFuelPage) onOpenFuelPage();
              }}
              title="Dedicated fuel refilling, tank balance & container source tracking"
            >
              ⛽ Fuel &amp; Tank Monitoring
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsManageModelsOpen(true)}
              title="Manage truck model classifications & categories"
            >
              ⚙️ Manage Truck Models
            </button>
            {!showAddForm && (
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                ➕ Add Fleet Truck
              </button>
            )}
          </div>
        )}
      </div>

      <ManageTruckModelsModal
        isOpen={isManageModelsOpen}
        onClose={() => setIsManageModelsOpen(false)}
        truckModels={truckModels}
        onAddTruckModel={onAddTruckModel || (() => { })}
        onUpdateTruckModel={onUpdateTruckModel || (() => { })}
        onDeleteTruckModel={onDeleteTruckModel || (() => { })}
        usedModels={vehicles.map((v) => v.modelType)}
      />

      {showAddForm && (
        <div style={{ padding: "1.75rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
              {editingVehicle ? `✏️ Edit Fleet Vehicle Record (${editingVehicle.plateNumber})` : "🚚 Register Fleet Vehicle"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseForm}>✕ Close</button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Section 1: Vehicle Specifications */}
            <div style={{ padding: "1rem", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>🚛 Vehicle Specifications</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Plate Number</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. ABC-1234"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="form-label" style={{ margin: 0 }}>Vehicle Model / Category</label>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.72rem", cursor: "pointer", padding: 0 }}
                      onClick={() => setIsManageModelsOpen(true)}
                    >
                      ⚙️ Edit Models
                    </button>
                  </div>
                  <select
                    className="form-select"
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    style={{ marginTop: "0.25rem" }}
                  >
                    {truckModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {modelType && !truckModels.includes(modelType) && (
                      <option value={modelType}>{modelType}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payload Capacity (Tons)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={capacityTons}
                    onChange={(e) => setCapacityTons(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Assigned Crew */}
            <div style={{ padding: "1rem", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>👥 Assigned Fleet Crew</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {/* Driver Column */}
                <div style={{ padding: "0.85rem", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-main)", marginBottom: "0.6rem" }}>
                    👤 Primary Driver
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Select Driver</label>
                      {drivers.length > 0 ? (
                        <select
                          className="form-select"
                          value={drivers.some((d) => d.name === driverName) ? driverName : driverName ? "__custom__" : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__custom__") {
                              // Keep driverName as is
                            } else {
                              const matched = drivers.find((d) => d.name === val);
                              setDriverName(val);
                              if (matched?.phone) {
                                setDriverPhone(matched.phone);
                              }
                            }
                          }}
                        >
                          <option value="">-- Select Driver from Roster --</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.name}>
                              👤 {d.name} {d.phone ? `(${d.phone})` : ""} - {d.status}
                            </option>
                          ))}
                          {driverName && !drivers.some((d) => d.name === driverName) && (
                            <option value="__custom__">✏️ Custom / Unlisted: {driverName}</option>
                          )}
                        </select>
                      ) : null}

                      {(drivers.length === 0 || !drivers.some((d) => d.name === driverName)) && (
                        <input
                          type="text"
                          required
                          className="form-input"
                          placeholder="Driver Full Name"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          style={{ marginTop: drivers.length > 0 ? "0.4rem" : 0 }}
                        />
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Driver Mobile Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 09171234567"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Helper Column */}
                <div style={{ padding: "0.85rem", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-main)", marginBottom: "0.6rem" }}>
                    🧑‍🔧 Driver Assistant / Helper (Optional)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Select Helper</label>
                      {helpers.length > 0 ? (
                        <select
                          className="form-select"
                          value={helpers.some((h) => h.name === helperName) ? helperName : helperName ? "__custom__" : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__custom__") {
                              // Keep helperName as is
                            } else {
                              const matched = helpers.find((h) => h.name === val);
                              setHelperName(val);
                              if (matched?.phone) {
                                setHelperPhone(matched.phone);
                              }
                            }
                          }}
                        >
                          <option value="">-- Select Helper from Roster --</option>
                          {helpers.map((h) => (
                            <option key={h.id} value={h.name}>
                              🧑‍🔧 {h.name} {h.phone ? `(${h.phone})` : ""} - {h.status}
                            </option>
                          ))}
                          {helperName && !helpers.some((h) => h.name === helperName) && (
                            <option value="__custom__">✏️ Custom / Unlisted: {helperName}</option>
                          )}
                        </select>
                      ) : null}

                      {(helpers.length === 0 || !helpers.some((h) => h.name === helperName)) && (
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Helper Full Name"
                          value={helperName}
                          onChange={(e) => setHelperName(e.target.value)}
                          style={{ marginTop: helpers.length > 0 ? "0.4rem" : 0 }}
                        />
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.75rem" }}>Helper Mobile Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 09198765432"
                        value={helperPhone}
                        onChange={(e) => setHelperPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Fuel Setup */}
            <div style={{ padding: "1rem", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span>⛽ Fuel &amp; Tank Configuration</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Fuel Tank Capacity (Liters)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-input"
                    placeholder="e.g. 300"
                    value={fuelCapacityLiters}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setFuelCapacityLiters(val);
                      if (typeof val === "number" && val > 0 && typeof currentFuelLiters === "number") {
                        setCurrentFuelLevelPercent(Math.min(100, Math.round((currentFuelLiters / val) * 100)));
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fuel Card / Fleet Pass (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PETRON-FLEET-9921"
                    value={fuelCardNumber}
                    onChange={(e) => setFuelCardNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Subtle Text-Only Advanced Options Trigger */}
            <div style={{ marginTop: "0.25rem" }}>
              <button
                type="button"
                onClick={() => setShowAdvancedGps(!showAdvancedGps)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0.25rem 0",
                  color: "var(--primary)",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  cursor: "pointer",
                }}
              >
                <span>⚙️ {showAdvancedGps ? "Hide Advanced Options" : "Show Advanced Options"}</span>
                {gpsTrackingUrl && (
                  <span style={{ fontSize: "0.68rem", background: "rgba(0, 212, 255, 0.15)", color: "var(--primary)", padding: "0.1rem 0.4rem", borderRadius: "4px", marginLeft: "0.25rem" }}>
                    GPS Configured
                  </span>
                )}
                <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{showAdvancedGps ? "▲" : "▼"}</span>
              </button>

              {showAdvancedGps && (
                <div style={{ marginTop: "0.5rem", padding: "1.1rem", background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "8px", position: "relative" }}>
                  {!isLicensedAndPaid && (
                    <div
                      style={{
                        padding: "1rem",
                        background: "rgba(15, 23, 42, 0.92)",
                        border: "1px dashed #f59e0b",
                        borderRadius: "8px",
                        marginBottom: "1rem",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                        🔒 Enterprise Telematics Feature Locked
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                        Automated GET Request API Telematics sync requires an active, paid NeuTruck software license. Please activate your license in <strong>Settings ➔ License &amp; Payment</strong>.
                      </div>
                    </div>
                  )}

                  <fieldset disabled={!isLicensedAndPaid} style={{ border: "none", padding: 0, margin: 0, opacity: isLicensedAndPaid ? 1 : 0.45 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <h4 style={{ margin: 0, fontSize: "0.88rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span>🛰️ Live Telemetry GET Request API Integration</span>
                      </h4>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleTestGpsEndpoint}
                        disabled={isTestingGps || !isLicensedAndPaid}
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                      >
                        {isTestingGps ? "⏳ Testing..." : "🧪 Test GET Endpoint"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>
                          GET Request API Endpoint URL
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="e.g. https://api.my-gps-vendor.com/v1/trucks/TRK-101/location"
                          value={gpsTrackingUrl}
                          onChange={(e) => setGpsTrackingUrl(e.target.value)}
                        />
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Must return JSON response with <code style={{ color: "var(--primary)" }}>locationName</code>, <code style={{ color: "var(--primary)" }}>location</code>, or <code style={{ color: "var(--primary)" }}>address</code> field.
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>
                          Authorization Header (Optional)
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Bearer token or API key"
                          value={gpsAuthToken}
                          onChange={(e) => setGpsAuthToken(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        id="gps-auto-sync-check"
                        checked={gpsAutoSync}
                        onChange={(e) => setGpsAutoSync(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="gps-auto-sync-check" style={{ fontSize: "0.8rem", color: "var(--text-main)", cursor: "pointer", fontWeight: 600 }}>
                        Automatically sync truck GPS location every 60 seconds when map or dispatch board is active
                      </label>
                    </div>
                  </fieldset>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="button" className="btn btn-outline" onClick={handleCloseForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingVehicle ? "💾 Save Vehicle Changes" : "💾 Save Vehicle Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Decommissioning Confirmation Card */}
      {decommissionModalVehicle && (
        <div style={{ padding: "1.5rem", background: "rgba(244, 63, 94, 0.08)", border: "1px dashed #f43f5e", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, color: "#f43f5e", fontSize: "1.1rem" }}>
              🛠️ Retire &amp; Decommission Vehicle: <strong>{decommissionModalVehicle.plateNumber}</strong> ({decommissionModalVehicle.modelType})
            </h4>
            <button className="btn btn-outline btn-sm" onClick={() => setDecommissionModalVehicle(null)}>✕ Cancel</button>
          </div>

          <form onSubmit={handleConfirmDecommission} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label" style={{ color: "var(--text-main)" }}>Decommission / Written-Off Reason Rationale</label>
              <input
                type="text"
                required
                className="form-input"
                value={decommissionReasonInput}
                onChange={(e) => setDecommissionReasonInput(e.target.value)}
                placeholder="e.g. Total loss accident, Engine overhaul exceeds truck value, Sold to scrap"
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setDecommissionModalVehicle(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                ⚠️ Confirm Retire &amp; Decommission Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Plate Number</th>
              <th>Category / Model</th>
              <th>Capacity</th>
              <th>Assigned Driver</th>
              <th>Fuel Level</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-dim)", padding: "3rem 1.5rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🚛</div>
                  <div style={{ color: "var(--text-main)", marginBottom: "0.25rem" }}>
                    {viewMode === "active" ? "No Active Fleet Trucks Found" : "No Decommissioned Vehicles"}
                  </div>
                </td>
              </tr>
            ) : (
              filteredVehicles.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{v.id}</td>
                  <td style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {v.plateNumber}
                    {v.gpsTrackingUrl && (
                      <div style={{ marginTop: "0.2rem" }}>
                        <span
                          title={`Configured Telematics GET API: ${v.gpsTrackingUrl}`}
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            background: "rgba(0, 212, 255, 0.12)",
                            color: "var(--primary)",
                            border: "1px solid rgba(0, 212, 255, 0.3)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          🛰️ GPS Telematics API
                        </span>
                      </div>
                    )}
                  </td>
                  <td>{v.modelType}</td>
                  <td><span className="badge badge-purple">{v.capacityTons} Tons</span></td>
                  <td>
                    <div>👤 <strong>{v.driverName}</strong></div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{v.driverPhone || "—"}</div>
                    {v.helperName && (
                      <div style={{ marginTop: "0.25rem", paddingTop: "0.25rem", borderTop: "1px dashed var(--border)", fontSize: "0.78rem" }}>
                        <span style={{ color: "var(--text-dim)" }}>🧑‍🔧 Helper: </span>
                        <strong>{v.helperName}</strong>
                        {v.helperPhone && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace", marginLeft: "0.3rem" }}>({v.helperPhone})</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: (v.currentFuelLevelPercent ?? 100) < 25 ? "var(--danger)" : (v.currentFuelLevelPercent ?? 100) < 50 ? "var(--warning)" : "var(--success)" }}>
                        ⛽ {v.currentFuelLevelPercent ?? 100}%
                        {v.currentFuelLiters !== undefined && v.currentFuelLiters !== null && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 400, marginLeft: "0.25rem" }}>
                            ({v.currentFuelLiters}L{v.fuelCapacityLiters ? ` / ${v.fuelCapacityLiters}L Tank` : ""})
                          </span>
                        )}
                      </div>
                      {v.fuelCardNumber && (
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          💳 {v.fuelCardNumber}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${v.status === "Available" ? "badge-success" :
                      v.status === "In Transit" ? "badge-primary" :
                        v.status === "Decommissioned" ? "badge-danger" :
                          v.status === "Maintenance" ? "badge-danger" : "badge-warning"
                      }`}>
                      {v.status}
                    </span>

                    {/* Render Health & Retirement Advisory Flag */}
                    {(() => {
                      const truckJobs = jobs.filter((j) => (j.truckId === v.id || j.truckPlate === v.plateNumber) && j.deliveryStatus !== "Cancelled");
                      const truckLogs = maintenanceLogs.filter((m) => m.truckId === v.id || m.plateNumber === v.plateNumber);

                      const grossRev = truckJobs.reduce((sum, j) => sum + (j.freightFee || 0), 0);
                      const tripExp = truckJobs.reduce((sum, j) => sum + (j.fuelAllowance || 0) + (j.driverRate || 0) + (j.helperCommission || 0) + (j.roroTicketFee || 0), 0);
                      const maintExp = truckLogs.reduce((sum, m) => sum + (m.cost || 0), 0);
                      const netProfit = grossRev - (tripExp + maintExp);
                      const maintRatio = grossRev > 0 ? (maintExp / grossRev) * 100 : maintExp > 0 ? 100 : 0;

                      if (v.status === "Decommissioned" || v.isArchived) return null;

                      if (netProfit < 0 || maintRatio >= 30) {
                        return (
                          <div style={{ marginTop: "0.3rem", padding: "0.25rem 0.45rem", background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "4px", maxWidth: "190px" }}>
                            <div style={{ fontSize: "0.7rem", color: "#f43f5e", fontWeight: 800 }}>
                              🔴 Retire Candidate
                            </div>
                            <div style={{ fontSize: "0.66rem", color: "var(--text-dim)" }}>
                              {netProfit < 0 ? "Negative Profit" : `Maint. Drag ${maintRatio.toFixed(0)}%`}
                            </div>
                          </div>
                        );
                      } else if (maintRatio >= 15 || truckLogs.length >= 4) {
                        return (
                          <div style={{ marginTop: "0.3rem", padding: "0.25rem 0.45rem", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "4px", maxWidth: "190px" }}>
                            <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 800 }}>
                              🟡 Monitor Overhead
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div style={{ marginTop: "0.3rem", padding: "0.15rem 0.4rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "4px", maxWidth: "190px", display: "inline-block" }}>
                          <div style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 700 }}>
                            🟢 Healthy Fleet Unit
                          </div>
                        </div>
                      );
                    })()}

                    {/* Render active truck live location checkpoint */}
                    {(() => {
                      const activeJob = jobs.find((j) => (j.truckId === v.id || j.truckPlate === v.plateNumber) && j.deliveryStatus !== "Delivered" && j.deliveryStatus !== "Cancelled");
                      if (activeJob && activeJob.currentLocation) {
                        return (
                          <div style={{ marginTop: "0.3rem", padding: "0.25rem 0.45rem", background: "rgba(0, 212, 255, 0.08)", border: "1px solid rgba(0, 212, 255, 0.2)", borderRadius: "4px", maxWidth: "190px" }}>
                            <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 700 }}>
                              📍 {activeJob.currentLocation}
                            </div>
                            {activeJob.lastLocationUpdate && (
                              <div style={{ fontSize: "0.66rem", color: "var(--text-dim)" }}>
                                ⏱️ {activeJob.lastLocationUpdate}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {v.decommissionReason && (
                      <div style={{ fontSize: "0.72rem", color: "#f43f5e", marginTop: "0.2rem", maxWidth: "180px" }}>
                        ⚠️ {v.decommissionReason}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
                      {v.status !== "Decommissioned" ? (
                        <>
                          <select
                            className="form-select"
                            disabled={!user || v.status === "In Transit"}
                            title={!user ? "Login required to change vehicle status" : v.status === "In Transit" ? "Status is locked while vehicle is active In Transit. Update via Dispatch Board." : "Update vehicle operational status"}
                            style={{
                              padding: "0.3rem 0.5rem",
                              fontSize: "0.75rem",
                              width: "auto",
                              cursor: !user || v.status === "In Transit" ? "not-allowed" : "pointer",
                              opacity: !user || v.status === "In Transit" ? 0.6 : 1,
                            }}
                            value={v.status}
                            onChange={(e) => onUpdateStatus(v.id, e.target.value as TruckVehicle["status"])}
                          >
                            <option value="Available">Available</option>
                            <option value="In Transit" disabled>In Transit (Active Dispatch)</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Reserved">Reserved</option>
                          </select>

                          {user && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: "0.3rem 0.55rem", fontSize: "0.72rem" }}
                              onClick={() => handleStartEdit(v)}
                            >
                              ✏️ Edit
                            </button>
                          )}

                          {user && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={v.status === "In Transit"}
                              style={{
                                padding: "0.3rem 0.55rem",
                                fontSize: "0.72rem",
                                opacity: v.status === "In Transit" ? 0.45 : 1,
                                cursor: v.status === "In Transit" ? "not-allowed" : "pointer",
                              }}
                              title={v.status === "In Transit" ? "Cannot retire vehicle while hauling an active dispatch ticket." : "Decommission vehicle due to total loss, breakdown, or sale"}
                              onClick={() => handleOpenDecommissionModal(v)}
                            >
                              🛠️ Retire Truck
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {user && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: "0.3rem 0.55rem", fontSize: "0.72rem" }}
                              onClick={() => handleStartEdit(v)}
                            >
                              ✏️ Edit
                            </button>
                          )}

                          {user && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: "0.3rem 0.55rem", fontSize: "0.72rem" }}
                              onClick={() => onRestore(v.id)}
                            >
                              🔄 Restore Fleet Vehicle
                            </button>
                          )}

                          {user && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: "0.3rem 0.55rem", fontSize: "0.72rem" }}
                              title="Permanently delete vehicle if no historical records exist"
                              onClick={() => handleDeleteWithSafetyCheck(v)}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
