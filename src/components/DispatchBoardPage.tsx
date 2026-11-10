import { useState, useEffect } from "react";
import { DispatchJob, TruckVehicle, ClientShipper, RoroRoute, DropoffDestination, DriverProfile, HelperProfile } from "../types";
import { sendWebhookEvent } from "../utils/webhook";
import PrintableWaybillModal from "./PrintableWaybillModal";
import CreateDispatchWizardModal from "./CreateDispatchWizardModal";
import { DispatchTableRow } from "./DispatchTableRow";
import { DispatchCard } from "./DispatchCard";
import TrucksMapView from "./TrucksMapView";
import { useAuth } from "../hooks/useAuth";

interface DispatchBoardPageProps {
  jobs: DispatchJob[];
  vehicles: TruckVehicle[];
  drivers?: DriverProfile[];
  helpers?: HelperProfile[];
  clients: ClientShipper[];
  roroRoutes?: RoroRoute[];
  destinations?: DropoffDestination[];
  companyName: string;
  companyLogo?: string;
  allowAddRecord?: boolean;
  onAddJob: (job: Omit<DispatchJob, "id"> & { id: string }) => Promise<void>;
  onUpdateJob?: (job: DispatchJob) => Promise<void>;
  onUpdateJobStatus: (id: string, status: DispatchJob["deliveryStatus"]) => Promise<void>;
  onUpdateJobLocation: (id: string, currentLocation: string) => Promise<void>;
  onToggleArchiveJob: (id: string) => Promise<void>;
  onDeleteJob?: (id: string) => Promise<void>;
  onReloadData?: () => void;
  onOpenClientsPage?: () => void;
  onOpenRoroPage?: () => void;
  onOpenDestinationsPage?: () => void;
}

export default function DispatchBoardPage({
  jobs,
  vehicles,
  drivers = [],
  helpers = [],
  clients,
  roroRoutes = [],
  destinations = [],
  companyName,
  companyLogo = "",
  allowAddRecord = true,
  onAddJob,
  onUpdateJob,
  onUpdateJobStatus,
  onUpdateJobLocation,
  onToggleArchiveJob,
  onDeleteJob,
  onReloadData,
  onOpenClientsPage,
  onOpenRoroPage,
  onOpenDestinationsPage,
}: DispatchBoardPageProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedTruck, setSelectedTruck] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [layoutStyle, setLayoutStyle] = useState<"table" | "card" | "map">("table");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [autoReload, setAutoReload] = useState(false);

  const handleReloadClick = () => {
    setIsReloading(true);
    if (onReloadData) {
      onReloadData();
    }
    setTimeout(() => setIsReloading(false), 800);
  };

  // Auto-reload timer (every 10 seconds when enabled)
  useEffect(() => {
    if (!autoReload || !onReloadData) return;
    const timer = setInterval(() => {
      onReloadData();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoReload, onReloadData]);
  const [editingJob, setEditingJob] = useState<DispatchJob | null>(null);

  // Live Location Update Modal State
  const [locationModalJob, setLocationModalJob] = useState<DispatchJob | null>(null);
  const [locationInput, setLocationInput] = useState("");

  // Printable Waybill Ticket Modal State
  const [printableJob, setPrintableJob] = useState<DispatchJob | null>(null);

  // Copy Helper State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (key: string, textToCopy: string) => {
    if (!textToCopy || textToCopy === "—") return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allTruckPlates = Array.from(
    new Set([
      ...vehicles.map((v) => v.plateNumber),
      ...jobs.map((j) => j.truckPlate),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const filteredJobs = jobs.filter((j) => {
    const isArchived = j.isArchived === true;
    const matchesView = viewMode === "archived" ? isArchived : !isArchived;
    const query = search.toLowerCase();
    const matchesSearch =
      j.clientName.toLowerCase().includes(query) ||
      j.waybillNumber.toLowerCase().includes(query) ||
      j.truckPlate.toLowerCase().includes(query) ||
      j.driverName.toLowerCase().includes(query) ||
      (j.driverPhone && j.driverPhone.toLowerCase().includes(query)) ||
      (j.cargoDescription && j.cargoDescription.toLowerCase().includes(query)) ||
      j.pickupLocation.toLowerCase().includes(query) ||
      j.dropoffLocation.toLowerCase().includes(query) ||
      (j.roroRoute && j.roroRoute.toLowerCase().includes(query));
    const matchesStatus = statusFilter === "All" || j.deliveryStatus === statusFilter;
    const matchesTruck = selectedTruck === "All" || j.truckPlate === selectedTruck;
    return matchesView && matchesSearch && matchesStatus && matchesTruck;
  });

  const availableTrucks = vehicles.filter((v) => v.status === "Available");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner Stats (5 Cards per Row) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚛</div>
          <div className="stat-info">
            <span className="stat-title">Active Trips</span>
            <span className="stat-number">{jobs.filter((j) => j.deliveryStatus === "In Transit" || j.deliveryStatus === "Dispatched" || j.deliveryStatus === "Port Queueing" || j.deliveryStatus === "Onboard RoRo").length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <span className="stat-title">Delivered</span>
            <span className="stat-number">{jobs.filter((j) => j.deliveryStatus === "Delivered").length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚚</div>
          <div className="stat-info">
            <span className="stat-title">Fleet Ready</span>
            <span className="stat-number">{availableTrucks.length} / {vehicles.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-title">Total Freight Revenue</span>
            <span className="stat-number">
              ₱{jobs
                .filter((j) => j.deliveryStatus !== "Cancelled" && j.deliveryStatus !== "Draft")
                .reduce((sum, j) => {
                  const primaryFee = j.freightFee || 0;
                  const backhaulFee = j.hasReturnTrip && j.returnCargoType === "Backhaul Cargo" ? (j.returnFreightFee || 0) : 0;
                  return sum + primaryFee + backhaulFee;
                }, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💸</div>
          <div className="stat-info">
            <span className="stat-title">Total Trip Expenses</span>
            <span className="stat-number" style={{ color: "var(--warning)" }}>
              ₱{jobs
                .filter((j) => j.deliveryStatus !== "Cancelled" && j.deliveryStatus !== "Draft")
                .reduce((sum, j) => {
                  const driver = j.driverRate || 0;
                  const fuel = (j.fuelAllowance || 0) + (j.hasReturnTrip ? (j.returnFuelAllowance || 0) : 0);
                  const roro = (j.roroTicketFee || 0) + (j.hasReturnTrip ? (j.returnRoroTicketFee || 0) : 0);
                  return sum + driver + fuel + roro;
                }, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.75rem", flex: 1, minWidth: "280px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Active / Archived View Toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "0.2rem", borderRadius: "8px", border: "1px solid var(--border)", flexWrap: "nowrap" }}>
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
                whiteSpace: "nowrap",
              }}
            >
              📋 Active Dispatches ({jobs.filter((j) => !j.isArchived).length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("archived")}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "archived" ? "var(--purple)" : "transparent",
                color: viewMode === "archived" ? "#fff" : "var(--text-main)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              📦 Archived ({jobs.filter((j) => j.isArchived).length})
            </button>
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="Search Waybill, Truck Plate, Driver Name, Client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "200px" }}
          />

          {/* Table vs Card Layout Mode Toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "0.2rem", borderRadius: "8px", border: "1px solid var(--border)", flexWrap: "nowrap" }}>
            <button
              type="button"
              onClick={() => setLayoutStyle("table")}
              style={{
                padding: "0.45rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                background: layoutStyle === "table" ? "var(--primary)" : "transparent",
                color: layoutStyle === "table" ? "#fff" : "var(--text-main)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Table View"
              aria-label="Table View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setLayoutStyle("card")}
              style={{
                padding: "0.45rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                background: layoutStyle === "card" ? "var(--primary)" : "transparent",
                color: layoutStyle === "card" ? "#fff" : "var(--text-main)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Grid Card View"
              aria-label="Grid Card View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setLayoutStyle("map")}
              style={{
                padding: "0.45rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                background: layoutStyle === "map" ? "var(--primary)" : "transparent",
                color: layoutStyle === "map" ? "#fff" : "var(--text-main)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Map View"
              aria-label="Map View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </button>
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: "160px", width: "auto" }}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Port Queueing">Port Queueing</option>
            <option value="Onboard RoRo">Onboard RoRo</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Returning / En Route Garage">Returning / Garage</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Unified Reload & Auto-Reload Control */}
          <div style={{ display: "inline-flex", borderRadius: "var(--radius-sm, 6px)", border: "1px solid var(--border)", background: "var(--bg-card, rgba(255,255,255,0.03))", overflow: "hidden" }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ border: "none", borderRadius: 0, padding: "0.5rem 0.85rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
              title="Reload latest dispatch & vehicle records from shared database"
              onClick={handleReloadClick}
            >
              <span style={{ display: "inline-block", transform: isReloading ? "rotate(360deg)" : "none", transition: "transform 0.6s ease" }}>
                🔄
              </span>{" "}
              {isReloading ? "Reloading..." : autoReload ? "Reload (Auto On)" : "Reload"}
            </button>
            <button
              type="button"
              onClick={() => setAutoReload(!autoReload)}
              style={{
                border: "none",
                borderLeft: "1px solid var(--border)",
                background: autoReload ? "var(--primary-alpha, rgba(0,212,255,0.15))" : "transparent",
                color: autoReload ? "var(--primary, #00d4ff)" : "var(--text-muted)",
                padding: "0.5rem 0.65rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                transition: "all 0.2s ease",
              }}
              title={autoReload ? "Auto Reload (10s) is ON. Click to turn OFF" : "Click to turn ON Auto Reload (10s)"}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: autoReload ? "var(--primary, #00d4ff)" : "#64748b", boxShadow: autoReload ? "0 0 6px var(--primary)" : "none" }}></span>
              Auto 10s
            </button>
          </div>

          {user && !showAddForm && viewMode === "active" && (
            <button
              className="btn btn-primary"
              disabled={!allowAddRecord}
              onClick={() => {
                if (allowAddRecord) setShowAddForm(true);
              }}
              title={!allowAddRecord ? "Adding new records is disabled by your license permissions" : "Create new dispatch job"}
              style={!allowAddRecord ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              ➕ Create Dispatch Job
            </button>
          )}
        </div>
      </div>

      {/* Small Truck Filter Buttons Bar */}
      {allTruckPlates.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            flexWrap: "wrap",
            background: "var(--bg-card)",
            padding: "0.45rem 0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--text-dim)",
              marginRight: "0.25rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            🚚 Filter Truck:
          </span>

          <button
            type="button"
            onClick={() => setSelectedTruck("All")}
            style={{
              padding: "0.18rem 0.5rem",
              borderRadius: "14px",
              fontSize: "0.72rem",
              fontWeight: selectedTruck === "All" ? 700 : 500,
              border: selectedTruck === "All" ? "1px solid var(--primary)" : "1px solid var(--border)",
              background: selectedTruck === "All" ? "var(--primary-alpha)" : "rgba(255, 255, 255, 0.03)",
              color: selectedTruck === "All" ? "var(--primary)" : "var(--text-main)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span>All Trucks</span>
            <span
              style={{
                fontSize: "0.68rem",
                background: selectedTruck === "All" ? "var(--primary)" : "rgba(100, 116, 139, 0.2)",
                color: selectedTruck === "All" ? "#000" : "var(--text-main)",
                padding: "0.08rem 0.45rem",
                borderRadius: "10px",
                fontWeight: 800,
                border: selectedTruck === "All" ? "none" : "1px solid rgba(100, 116, 139, 0.25)",
              }}
            >
              {jobs.filter((j) => {
                const isArchived = j.isArchived === true;
                const matchesView = viewMode === "archived" ? isArchived : !isArchived;
                const matchesStatus = statusFilter === "All" || j.deliveryStatus === statusFilter;
                return matchesView && matchesStatus;
              }).length}
            </span>
          </button>

          {allTruckPlates.map((plate) => {
            const count = jobs.filter((j) => {
              const isArchived = j.isArchived === true;
              const matchesView = viewMode === "archived" ? isArchived : !isArchived;
              const matchesStatus = statusFilter === "All" || j.deliveryStatus === statusFilter;
              return matchesView && matchesStatus && j.truckPlate === plate;
            }).length;
            const isSelected = selectedTruck === plate;

            return (
              <button
                key={plate}
                type="button"
                onClick={() => setSelectedTruck(isSelected ? "All" : plate)}
                style={{
                  padding: "0.18rem 0.5rem",
                  borderRadius: "14px",
                  fontSize: "0.72rem",
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                  background: isSelected ? "var(--primary-alpha)" : "rgba(255, 255, 255, 0.03)",
                  color: isSelected ? "var(--primary)" : "var(--text-main)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <span>{plate}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    background: isSelected ? "var(--primary)" : "rgba(100, 116, 139, 0.2)",
                    color: isSelected ? "#000" : "var(--text-main)",
                    padding: "0.08rem 0.45rem",
                    borderRadius: "10px",
                    fontWeight: 800,
                    border: isSelected ? "none" : "1px solid rgba(100, 116, 139, 0.25)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {selectedTruck !== "All" && (
            <button
              type="button"
              onClick={() => setSelectedTruck("All")}
              style={{
                padding: "0.15rem 0.45rem",
                borderRadius: "6px",
                fontSize: "0.7rem",
                border: "none",
                background: "transparent",
                color: "var(--danger)",
                cursor: "pointer",
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              ✕ Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Create Dispatch Ticket Wizard Modal */}
      {showAddForm && (
        <CreateDispatchWizardModal
          vehicles={vehicles}
          drivers={drivers}
          helpers={helpers}
          clients={clients}
          roroRoutes={roroRoutes}
          destinations={destinations}
          onClose={() => setShowAddForm(false)}
          onOpenClientsPage={onOpenClientsPage}
          onOpenRoroPage={onOpenRoroPage}
          onOpenDestinationsPage={onOpenDestinationsPage}
          onSaveDraft={async (draftJob) => {
            await onAddJob(draftJob);
            sendWebhookEvent("dispatch.created", draftJob);
          }}
          onSubmit={async (newJob) => {
            await onAddJob(newJob);
            sendWebhookEvent("dispatch.created", newJob);
            setShowAddForm(false);
          }}
        />
      )}

      {/* Edit Dispatch Ticket Wizard Modal */}
      {editingJob && (
        <CreateDispatchWizardModal
          initialJob={editingJob}
          vehicles={vehicles}
          drivers={drivers}
          helpers={helpers}
          clients={clients}
          roroRoutes={roroRoutes}
          destinations={destinations}
          onClose={() => setEditingJob(null)}
          onOpenClientsPage={onOpenClientsPage}
          onOpenRoroPage={onOpenRoroPage}
          onOpenDestinationsPage={onOpenDestinationsPage}
          onSaveDraft={async (draftJob) => {
            if (onUpdateJob) {
              await onUpdateJob(draftJob);
            }
            sendWebhookEvent("dispatch.updated", draftJob);
          }}
          onSubmit={async (updatedJob) => {
            if (onUpdateJob) {
              await onUpdateJob(updatedJob);
            }
            sendWebhookEvent("dispatch.updated", updatedJob);
            setEditingJob(null);
          }}
        />
      )}

      {/* Live Location Checkpoint Modal Card */}
      {locationModalJob && (
        <div style={{ padding: "1.5rem", background: "rgba(0, 212, 255, 0.08)", border: "1px dashed var(--primary)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, color: "var(--primary)", fontSize: "1.1rem" }}>
              📍 Log Live Location Checkpoint: <strong>{locationModalJob.waybillNumber}</strong> ({locationModalJob.truckPlate} — {locationModalJob.driverName})
            </h4>
            <button className="btn btn-outline btn-sm" onClick={() => setLocationModalJob(null)}>✕ Close</button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!locationInput.trim()) return;
              await onUpdateJobLocation(locationModalJob.id, locationInput.trim());
              setLocationModalJob(null);
            }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div className="form-group">
              <label className="form-label">Current Checkpoint / Landmark Location</label>
              <input
                type="text"
                required
                className="form-input"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Batangas Port Pier 3, FastCat Ferry Mid-Crossing, Southern Highway Km 45"
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setLocationModalJob(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                💾 Log Checkpoint Position
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Render Main Content: Table View vs Grid Card View vs Live Map View */}
      {layoutStyle === "map" ? (
        <TrucksMapView
          jobs={filteredJobs}
          vehicles={vehicles}
          onOpenLocationModal={(job) => {
            setLocationModalJob(job);
            setLocationInput(job.currentLocation || "");
          }}
          onPrintJob={(job) => setPrintableJob(job)}
        />
      ) : layoutStyle === "table" ? (
        <div className="table-card">
          <table style={{ width: "100%", boxSizing: "border-box" }}>
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Route (Origin → Destination)</th>
                <th style={{ width: "22%" }}>Driver &amp; Contact</th>
                <th style={{ width: "24%" }}>Cargo / Weight</th>
                <th style={{ width: "24%" }}>Freight &amp; RoRo Fees</th>
              </tr>
            </thead>
            {filteredJobs.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No dispatch jobs found matching your filter criteria.
                  </td>
                </tr>
              </tbody>
            ) : (
              filteredJobs.map((j) => (
                <DispatchTableRow
                  key={j.id}
                  job={j}
                  vehicles={vehicles}
                  copiedId={copiedId}
                  onCopyText={handleCopyText}
                  onUpdateJobStatus={onUpdateJobStatus}
                  onOpenLocationModal={(job) => {
                    setLocationModalJob(job);
                    setLocationInput(job.currentLocation || "");
                  }}
                  onEditJob={(job) => setEditingJob(job)}
                  onPrintJob={(job) => setPrintableJob(job)}
                  onToggleArchiveJob={onToggleArchiveJob}
                  onDeleteJob={onDeleteJob}
                />
              ))
            )}
          </table>
        </div>
      ) : (
        /* Card Grid View Layout */
        <div>
          {filteredJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              No dispatch jobs found matching your filter criteria.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {filteredJobs.map((j) => (
                <DispatchCard
                  key={j.id}
                  job={j}
                  vehicles={vehicles}
                  copiedId={copiedId}
                  onCopyText={handleCopyText}
                  onUpdateJobStatus={onUpdateJobStatus}
                  onOpenLocationModal={(job) => {
                    setLocationModalJob(job);
                    setLocationInput(job.currentLocation || "");
                  }}
                  onEditJob={(job) => setEditingJob(job)}
                  onPrintJob={(job) => setPrintableJob(job)}
                  onToggleArchiveJob={onToggleArchiveJob}
                  onDeleteJob={onDeleteJob}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Printable Waybill Modal */}
      {printableJob && (
        <PrintableWaybillModal
          job={printableJob}
          vehicle={vehicles.find((v) => v.id === printableJob.truckId || v.plateNumber === printableJob.truckPlate)}
          companyName={companyName}
          companyLogo={companyLogo}
          onClose={() => setPrintableJob(null)}
        />
      )}
    </div>
  );
}
