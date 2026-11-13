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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. TOP KPI METRICS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {/* Card 1: Active Trips */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "1rem 1.15rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "rgba(2, 132, 199, 0.12)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            🚛
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
              Active Trips
            </span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", marginTop: "0.15rem" }}>
              {jobs.filter((j) => j.deliveryStatus === "In Transit" || j.deliveryStatus === "Dispatched" || j.deliveryStatus === "Port Queueing" || j.deliveryStatus === "Onboard RoRo").length}
            </span>
          </div>
        </div>

        {/* Card 2: Delivered */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "1rem 1.15rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--success, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            📦
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
              Delivered
            </span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--success, #10b981)", marginTop: "0.15rem" }}>
              {jobs.filter((j) => j.deliveryStatus === "Delivered").length}
            </span>
          </div>
        </div>

        {/* Card 3: Fleet Ready */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "1rem 1.15rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "rgba(168, 85, 247, 0.12)",
              color: "var(--purple, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            🚚
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
              Fleet Ready
            </span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", marginTop: "0.15rem" }}>
              {availableTrucks.length} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-muted)" }}>/ {vehicles.length}</span>
            </span>
          </div>
        </div>

        {/* Card 4: Total Freight Revenue */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "1rem 1.15rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "var(--warning, #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            💰
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
              Freight Revenue
            </span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)", marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

        {/* Card 5: Total Trip Expenses */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 12px)",
            padding: "1rem 1.15rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "rgba(244, 63, 94, 0.12)",
              color: "var(--danger, #f43f5e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            💸
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
              Trip Expenses
            </span>
            <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--warning, #f59e0b)", marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

      {/* 2. UNIFIED DISPATCH CONTROL HUB CARD */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius, 14px)",
          padding: "1.1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Top Control Bar: View Tabs + Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Active / Archived View Toggle */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg-main)",
              padding: "0.22rem",
              borderRadius: "var(--radius-sm, 8px)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("active")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "active" ? "var(--primary)" : "transparent",
                color: viewMode === "active" ? "#ffffff" : "var(--text-dim)",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.15s ease",
              }}
            >
              <span>📋</span> Active Dispatches
              <span
                style={{
                  background: viewMode === "active" ? "rgba(255,255,255,0.25)" : "var(--primary-alpha, rgba(2, 132, 199, 0.12))",
                  color: viewMode === "active" ? "#ffffff" : "var(--primary)",
                  padding: "0.08rem 0.45rem",
                  borderRadius: "10px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                {jobs.filter((j) => !j.isArchived).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("archived")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                border: "none",
                background: viewMode === "archived" ? "var(--purple, #a855f7)" : "transparent",
                color: viewMode === "archived" ? "#ffffff" : "var(--text-dim)",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.15s ease",
              }}
            >
              <span>📦</span> Archived
              <span
                style={{
                  background: viewMode === "archived" ? "rgba(255,255,255,0.25)" : "rgba(168, 85, 247, 0.12)",
                  color: viewMode === "archived" ? "#ffffff" : "var(--purple, #a855f7)",
                  padding: "0.08rem 0.45rem",
                  borderRadius: "10px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                {jobs.filter((j) => j.isArchived).length}
              </span>
            </button>
          </div>

          {/* Right Action Controls: Reload & Create Job */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Unified Reload & Auto-Reload Button Group */}
            <div
              style={{
                display: "inline-flex",
                borderRadius: "var(--radius-sm, 8px)",
                border: "1px solid var(--border)",
                background: "var(--bg-main)",
                overflow: "hidden",
                height: "38px",
              }}
            >
              <button
                type="button"
                onClick={handleReloadClick}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-main)",
                  padding: "0 0.85rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  whiteSpace: "nowrap",
                }}
                title="Reload latest dispatch records"
              >
                <span style={{ display: "inline-block", transform: isReloading ? "rotate(360deg)" : "none", transition: "transform 0.6s ease" }}>
                  🔄
                </span>
                {isReloading ? "Reloading..." : "Reload"}
              </button>
              <button
                type="button"
                onClick={() => setAutoReload(!autoReload)}
                style={{
                  border: "none",
                  borderLeft: "1px solid var(--border)",
                  background: autoReload ? "var(--primary-alpha)" : "transparent",
                  color: autoReload ? "var(--primary)" : "var(--text-muted)",
                  padding: "0 0.65rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "all 0.2s ease",
                }}
                title={autoReload ? "Auto Reload (10s) is ON. Click to turn OFF" : "Click to turn ON Auto Reload (10s)"}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: autoReload ? "var(--success, #10b981)" : "var(--text-muted)",
                    boxShadow: autoReload ? "0 0 6px var(--success, #10b981)" : "none",
                  }}
                />
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
                style={{
                  height: "38px",
                  padding: "0 1.15rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  boxShadow: "0 2px 8px var(--primary-alpha)",
                  opacity: !allowAddRecord ? 0.5 : 1,
                  cursor: !allowAddRecord ? "not-allowed" : "pointer",
                }}
              >
                <span>➕</span> Create Dispatch Job
              </button>
            )}
          </div>
        </div>

        {/* Middle Row: Unified Search, Status Filter & View Modes (all 38px height) */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, minWidth: "240px", display: "flex", alignItems: "center" }}>
            <span
              style={{
                position: "absolute",
                left: "0.85rem",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Search by waybill, plate, driver, client, cargo, route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "38px",
                paddingLeft: "2.3rem",
                paddingRight: search ? "2.2rem" : "0.85rem",
                fontSize: "0.85rem",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  padding: "0.2rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: "38px",
              minWidth: "160px",
              fontSize: "0.85rem",
            }}
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

          {/* Table / Card / Map View Switcher */}
          <div
            style={{
              display: "inline-flex",
              height: "38px",
              background: "var(--bg-main)",
              padding: "0.2rem",
              borderRadius: "var(--radius-sm, 8px)",
              border: "1px solid var(--border)",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setLayoutStyle("table")}
              style={{
                height: "30px",
                padding: "0 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: layoutStyle === "table" ? "var(--primary)" : "transparent",
                color: layoutStyle === "table" ? "#ffffff" : "var(--text-dim)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
              title="Table View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutStyle("card")}
              style={{
                height: "30px",
                padding: "0 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: layoutStyle === "card" ? "var(--primary)" : "transparent",
                color: layoutStyle === "card" ? "#ffffff" : "var(--text-dim)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
              title="Card Grid View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutStyle("map")}
              style={{
                height: "30px",
                padding: "0 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: layoutStyle === "map" ? "var(--primary)" : "transparent",
                color: layoutStyle === "map" ? "#ffffff" : "var(--text-dim)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
              title="Interactive Map View"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Integrated Quick Truck Filter Strip */}
        {allTruckPlates.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flexWrap: "wrap",
              borderTop: "1px solid var(--border)",
              paddingTop: "0.75rem",
              marginTop: "0.15rem",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-muted)",
                marginRight: "0.25rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              🚚 Filter Truck:
            </span>

            <button
              type="button"
              onClick={() => setSelectedTruck("All")}
              style={{
                padding: "0.22rem 0.6rem",
                borderRadius: "14px",
                fontSize: "0.74rem",
                fontWeight: selectedTruck === "All" ? 700 : 500,
                border: selectedTruck === "All" ? "1px solid var(--primary)" : "1px solid var(--border)",
                background: selectedTruck === "All" ? "var(--primary-alpha)" : "var(--bg-main)",
                color: selectedTruck === "All" ? "var(--primary)" : "var(--text-dim)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>All Trucks</span>
              <span
                style={{
                  fontSize: "0.68rem",
                  background: selectedTruck === "All" ? "var(--primary)" : "rgba(100, 116, 139, 0.18)",
                  color: selectedTruck === "All" ? "#ffffff" : "var(--text-muted)",
                  padding: "0.06rem 0.45rem",
                  borderRadius: "10px",
                  fontWeight: 800,
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
                    padding: "0.22rem 0.6rem",
                    borderRadius: "14px",
                    fontSize: "0.74rem",
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? "1px solid var(--primary)" : "1px solid var(--border)",
                    background: isSelected ? "var(--primary-alpha)" : "var(--bg-main)",
                    color: isSelected ? "var(--primary)" : "var(--text-dim)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span>{plate}</span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      background: isSelected ? "var(--primary)" : "rgba(100, 116, 139, 0.18)",
                      color: isSelected ? "#ffffff" : "var(--text-muted)",
                      padding: "0.06rem 0.45rem",
                      borderRadius: "10px",
                      fontWeight: 800,
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
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  border: "none",
                  background: "transparent",
                  color: "var(--danger, #ef4444)",
                  cursor: "pointer",
                  fontWeight: 700,
                  marginLeft: "auto",
                }}
              >
                ✕ Clear Filter
              </button>
            )}
          </div>
        )}
      </div>

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
