import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DispatchJob, TruckVehicle } from "../types";
import { resolveCoordinates } from "../utils/philippineCoordinates";

interface TrucksMapViewProps {
  jobs: DispatchJob[];
  vehicles: TruckVehicle[];
  onOpenLocationModal?: (job: DispatchJob) => void;
  onPrintJob?: (job: DispatchJob) => void;
  onSyncGpsLocation?: (jobId: string, location: string) => void;
}

function getStatusColor(status: DispatchJob["deliveryStatus"]): string {
  switch (status) {
    case "In Transit":
      return "#00d4ff"; // Cyan
    case "Port Queueing":
    case "Onboard RoRo":
      return "#a855f7"; // Purple
    case "Dispatched":
    case "Pending":
      return "#f59e0b"; // Amber
    case "Delivered":
      return "#10b981"; // Emerald
    case "Returning / En Route Garage":
      return "#3b82f6"; // Blue
    case "Cancelled":
      return "#f43f5e"; // Rose
    default:
      return "#64748b";
  }
}

export default function TrucksMapView({
  jobs,
  vehicles,
  onOpenLocationModal,
  onPrintJob,
  onSyncGpsLocation,
}: TrucksMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  // Background Auto-Fetcher for Configured GET Telematics APIs
  const syncAllGpsLocations = async () => {
    if (!onSyncGpsLocation) return;

    for (const job of jobs) {
      if (job.deliveryStatus === "Delivered" || job.deliveryStatus === "Cancelled") continue;
      const veh = vehicles.find((v) => v.id === job.truckId || v.plateNumber === job.truckPlate);
      if (!veh || !veh.gpsTrackingUrl) continue;

      try {
        const headers: Record<string, string> = {};
        if (veh.gpsAuthToken) {
          headers["Authorization"] = veh.gpsAuthToken.startsWith("Bearer ") ? veh.gpsAuthToken : `Bearer ${veh.gpsAuthToken}`;
        }
        const res = await fetch(veh.gpsTrackingUrl, { method: "GET", headers });
        if (res.ok) {
          const data = await res.json();
          const extractedLocation = data.locationName || data.location || data.address || data.city;
          if (extractedLocation && typeof extractedLocation === "string") {
            onSyncGpsLocation(job.id, extractedLocation);
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch GET telemetry for truck ${veh.plateNumber}:`, e);
      }
    }
  };

  useEffect(() => {
    // Initial sync check on mount
    syncAllGpsLocations();

    // Set up 60-second auto-poll interval for active telematics
    const interval = setInterval(() => {
      syncAllGpsLocations();
    }, 60000);

    return () => clearInterval(interval);
  }, [jobs, vehicles]);

  // Dynamic Theme Mode Detection (Dark vs Light)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const updateTheme = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      setTheme(isLight ? "light" : "dark");
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Combine jobs and fleet vehicles into mapped units
  const mappedTrucks = jobs.map((job) => {
    const veh = vehicles.find((v) => v.id === job.truckId || v.plateNumber === job.truckPlate);
    const currentLocation = job.currentLocation || job.pickupLocation || "Manila Garage";
    const coords = resolveCoordinates(currentLocation, job.truckPlate);

    return {
      id: job.id,
      waybillNumber: job.waybillNumber,
      truckPlate: job.truckPlate,
      driverName: job.driverName,
      driverPhone: job.driverPhone || veh?.driverPhone || "N/A",
      helperName: job.helperName || veh?.helperName,
      helperPhone: job.helperPhone || veh?.helperPhone,
      clientName: job.clientName,
      pickupLocation: job.pickupLocation,
      dropoffLocation: job.dropoffLocation,
      currentLocation,
      deliveryStatus: job.deliveryStatus,
      cargoDescription: job.cargoDescription,
      weightTons: job.weightTons,
      coords,
      job,
    };
  });

  const filteredTrucks = mappedTrucks.filter((t) => {
    const query = filterSearch.toLowerCase();
    const matchesSearch =
      t.truckPlate.toLowerCase().includes(query) ||
      t.waybillNumber.toLowerCase().includes(query) ||
      t.driverName.toLowerCase().includes(query) ||
      t.clientName.toLowerCase().includes(query) ||
      t.currentLocation.toLowerCase().includes(query);
    const matchesStatus = filterStatus === "All" || t.deliveryStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Initialize OpenStreetMap Leaflet Instance & Tile Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent duplicate init

    const map = L.map(mapContainerRef.current, {
      center: [12.8797, 121.7740], // Philippines Center
      zoom: 6,
      zoomControl: true,
    });

    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Trigger map resize calculation after DOM mount transition
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Update Markers on Map whenever filteredTrucks or theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    const isDark = theme === "dark";
    const bgCard = isDark ? "#0f172a" : "#ffffff";
    const textColor = isDark ? "#f8fafc" : "#0f172a";
    const subBg = isDark ? "rgba(255,255,255,0.05)" : "#f8fafc";
    const subBorder = isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1";
    const textMuted = isDark ? "#94a3b8" : "#475569";
    const textSub = isDark ? "#cbd5e1" : "#1e293b";
    const waybillColor = isDark ? "#00d4ff" : "#0284c7";
    const btnCheckBg = isDark ? "#00d4ff" : "#0284c7";
    const btnCheckColor = isDark ? "#000000" : "#ffffff";
    const btnPrintBg = isDark ? "rgba(255,255,255,0.08)" : "#ffffff";
    const btnPrintBorder = isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1";
    const btnPrintColor = isDark ? "#ffffff" : "#0f172a";

    filteredTrucks.forEach((t) => {
      const color = getStatusColor(t.deliveryStatus);
      const isFocused = selectedTruckId === t.id;

      // Create Premium Custom SVG Marker Icon
      const driverFirstName = t.driverName.split(" ")[0];
      const vehModel = vehicles.find((v) => v.plateNumber === t.truckPlate || v.id === t.job.truckId)?.modelType || "Freight Van";

      const customIcon = L.divIcon({
        className: "custom-truck-map-marker",
        html: `
          <div class="map-truck-pin ${isFocused ? "is-focused" : ""}" id="map-pin-${t.id}" style="--marker-color: ${color};">
            <div class="map-truck-label-popup">
              <span class="plate">${t.truckPlate}</span>
              <span class="driver-name">${driverFirstName}</span>
            </div>
            <div class="map-truck-icon-node">
              <span class="truck-emoji-icon">🚛</span>
            </div>
            <div class="map-truck-pointer"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(t.coords, { icon: customIcon, zIndexOffset: isFocused ? 1000 : 0 }).addTo(map);

      // Theme-Aware Popup HTML Card Content
      const popupContent = `
        <div style="width: 270px; padding: 14px; font-family: system-ui, -apple-system, sans-serif; background: ${bgCard}; color: ${textColor}; box-sizing: border-box;">
          <!-- Header Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${subBorder}; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: ${waybillColor}; letter-spacing: 0.5px;">
              ${t.waybillNumber}
            </div>
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 12px; background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
              ${t.deliveryStatus}
            </span>
          </div>

          <!-- Vehicle & Driver Manifest Card -->
          <div style="background: ${subBg}; border: 1px solid ${subBorder}; border-radius: 8px; padding: 9px 11px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-family: monospace; font-size: 13px; font-weight: 800; color: ${textColor};">🚛 ${t.truckPlate}</span>
              <span style="font-size: 10px; color: ${textMuted}; font-weight: 600;">${vehModel}</span>
            </div>
            <div style="font-size: 12px; font-weight: 700; color: ${textSub}; display: flex; align-items: center; gap: 4px;">
              <span>👨‍✈️ ${t.driverName}</span>
              ${t.driverPhone !== "N/A" ? `<span style="font-family: monospace; font-size: 11px; color: ${textMuted}; font-weight: 500;">(${t.driverPhone})</span>` : ""}
            </div>
            ${t.helperName ? `<div style="font-size: 11px; color: ${textMuted}; margin-top: 3px; font-weight: 600;">🧑‍🔧 Helper: ${t.helperName}</div>` : ""}
          </div>

          <!-- Live Checkpoint Box -->
          <div style="background: ${isDark ? "rgba(0, 212, 255, 0.08)" : "#f0f9ff"}; border: 1px solid ${isDark ? "rgba(0, 212, 255, 0.3)" : "#bae6fd"}; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: ${waybillColor}; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
              <span>📍 CHECKPOINT POSITION</span>
            </div>
            <div style="font-size: 12px; font-weight: 700; color: ${textColor};">
              ${t.currentLocation}
            </div>
          </div>

          <!-- Route & Cargo Snippet -->
          <div style="font-size: 11px; color: ${textMuted}; margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
            <div>📍 <strong>Pickup:</strong> <span style="color: ${textSub}; font-weight: 600;">${t.pickupLocation}</span></div>
            <div>➔ <strong>Dropoff:</strong> <span style="color: ${textSub}; font-weight: 600;">${t.dropoffLocation}</span></div>
            ${t.cargoDescription ? `<div style="color: ${textSub}; font-weight: 500; border-top: 1px dashed ${subBorder}; padding-top: 5px; margin-top: 3px;">📦 ${t.cargoDescription} (${t.weightTons} Tons)</div>` : ""}
          </div>

          <!-- Action Buttons Footer -->
          <div style="display: flex; gap: 8px;">
            <button id="map-btn-update-${t.id}" style="flex: 1; padding: 7px 10px; font-size: 11px; font-weight: 800; background: ${btnCheckBg}; color: ${btnCheckColor}; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: opacity 0.15s ease;">
              📍 Checkpoint
            </button>
            <button id="map-btn-print-${t.id}" style="flex: 1; padding: 7px 10px; font-size: 11px; font-weight: 700; background: ${btnPrintBg}; color: ${btnPrintColor}; border: 1px solid ${btnPrintBorder}; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: background 0.15s ease;">
              📄 Waybill
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("popupopen", () => {
        setSelectedTruckId(t.id);
        const updateBtn = document.getElementById(`map-btn-update-${t.id}`);
        const printBtn = document.getElementById(`map-btn-print-${t.id}`);

        if (updateBtn && onOpenLocationModal) {
          updateBtn.onclick = () => onOpenLocationModal(t.job);
        }
        if (printBtn && onPrintJob) {
          printBtn.onclick = () => onPrintJob(t.job);
        }
      });

      marker.on("click", () => {
        setSelectedTruckId(t.id);
      });

      markersRef.current[t.id] = marker;
      bounds.extend(t.coords);
    });

    // Fit map bounds if markers exist
    if (filteredTrucks.length > 0 && mapInstanceRef.current && !selectedTruckId) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [filteredTrucks, selectedTruckId, theme]);

  // Synchronize pin focus class whenever selectedTruckId updates
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const pinEl = document.getElementById(`map-pin-${id}`);
      const isFocused = id === selectedTruckId;
      if (pinEl) {
        if (isFocused) {
          pinEl.classList.add("is-focused");
        } else {
          pinEl.classList.remove("is-focused");
        }
      }
      if (isFocused) {
        marker.setZIndexOffset(1000);
      } else {
        marker.setZIndexOffset(0);
      }
    });
  }, [selectedTruckId]);

  // Center map on clicked truck card from sidebar
  const handleSelectTruck = (truck: typeof mappedTrucks[0]) => {
    setSelectedTruckId(truck.id);
    const map = mapInstanceRef.current;
    if (map) {
      map.setView(truck.coords, 10, { animate: true });
      const marker = markersRef.current[truck.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div style={{ display: "flex", gap: "1rem", height: "calc(100vh - 210px)", minHeight: "550px", position: "relative" }}>
      {/* Left Sidebar: Mapped Trucks List */}
      <div
        style={{
          width: "320px",
          flexShrink: 0,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>🗺️ Fleet Location Map</span>
            </h4>
            <span style={{ fontSize: "0.72rem", background: "var(--primary-alpha)", color: "var(--primary)", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: 800 }}>
              {filteredTrucks.length} Trucks
            </span>
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="Search plate, driver, location..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "0.4rem 0.65rem", width: "100%", marginBottom: "0.4rem" }}
          />

          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem", width: "100%" }}
          >
            <option value="All">All Statuses</option>
            <option value="In Transit">In Transit</option>
            <option value="Port Queueing">Port Queueing</option>
            <option value="Onboard RoRo">Onboard RoRo</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Sidebar Truck Cards List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filteredTrucks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              No active fleet dispatches found matching map filter.
            </div>
          ) : (
            filteredTrucks.map((t) => {
              const isSelected = selectedTruckId === t.id;
              const color = getStatusColor(t.deliveryStatus);

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTruck(t)}
                  style={{
                    padding: "0.75rem 0.85rem",
                    borderRadius: "10px",
                    border: isSelected ? `2px solid ${color}` : "1px solid var(--border)",
                    background: isSelected ? `${color}18` : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? `0 4px 14px ${color}25` : "none",
                  }}
                >
                  {/* Top Bar: License Plate & Delivery Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: "0.82rem",
                          fontFamily: "monospace",
                          background: "#fbbf24",
                          color: "#000000",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      >
                        {t.truckPlate}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "0.15rem 0.45rem", borderRadius: "10px", background: `${color}22`, color: color, border: `1px solid ${color}44` }}>
                      {t.deliveryStatus}
                    </span>
                  </div>

                  {/* Highlighted Current Position Pill Box */}
                  <div
                    style={{
                      background: isSelected ? "rgba(0, 212, 255, 0.12)" : "rgba(0, 212, 255, 0.05)",
                      border: `1px solid ${isSelected ? "var(--primary)" : "rgba(0, 212, 255, 0.2)"}`,
                      borderRadius: "6px",
                      padding: "0.4rem 0.6rem",
                      marginBottom: "0.45rem",
                    }}
                  >
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span>📍 CURRENT POSITION:</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ wordBreak: "break-word" }}>{t.currentLocation}</span>
                    </div>
                  </div>

                  {/* Driver Name & Cargo Snippet */}
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                    👨‍✈️ {t.driverName} <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>({t.driverPhone})</span>
                  </div>

                  {/* Route Overview: Pickup -> Dropoff */}
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: "0.15rem", background: "rgba(0,0,0,0.15)", padding: "0.35rem 0.5rem", borderRadius: "5px" }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <strong style={{ color: "var(--text-muted)" }}>Origin:</strong> {t.pickupLocation}
                    </div>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <strong style={{ color: "var(--text-muted)" }}>Dest:</strong> {t.dropoffLocation}
                    </div>
                  </div>

                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "flex", justifyContent: "space-between" }}>
                    <span>Ref: <strong style={{ fontFamily: "monospace", color: "var(--text-dim)" }}>{t.waybillNumber}</strong></span>
                    <span>{t.clientName}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main OpenStreetMap Display Canvas */}
      <div
        style={{
          flex: 1,
          borderRadius: "var(--radius)",
          overflow: "hidden",
          border: "1px solid var(--border)",
          position: "relative",
          minHeight: "500px",
          background: theme === "dark" ? "#0f172a" : "#f1f5f9",
        }}
      >
        <div
          ref={mapContainerRef}
          className={theme === "dark" ? "dark-map-tiles" : ""}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, width: "100%", height: "100%", minHeight: "500px" }}
        />
      </div>
    </div>
  );
}
