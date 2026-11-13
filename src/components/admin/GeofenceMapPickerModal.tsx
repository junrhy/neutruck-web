import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PH_COORDINATES } from "../../utils/philippineCoordinates";

interface GeofenceMapPickerModalProps {
  initialLat: number | null;
  initialLng: number | null;
  initialRadius: number;
  initialLabel: string;
  onConfirm: (data: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    label: string;
  }) => void;
  onClose: () => void;
}

function createGeofenceCenterIcon(radiusMeters: number): L.DivIcon {
  const radiusLabel =
    radiusMeters >= 1000
      ? `${(radiusMeters / 1000).toFixed(1).replace(/\.0$/, "")} km Radius`
      : `${radiusMeters} m Radius`;

  return L.divIcon({
    className: "custom-geofence-center-pin",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    html: `
      <div style="
        width: 48px;
        height: 48px;
        position: relative;
        cursor: grab;
        box-sizing: border-box;
      ">
        <!-- Floating Dynamic Radius Pill (Exact Center X) -->
        <div style="
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #00d4ff;
          border: 1px solid #00d4ff;
          padding: 3px 9px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          pointer-events: none;
          letter-spacing: 0.3px;
          box-sizing: border-box;
        ">
          ${radiusLabel}
        </div>

        <!-- Outer Radar Pulse Halo (Exact Center X & Y) -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 2px solid #00d4ff;
          background: rgba(0, 212, 255, 0.22);
          box-sizing: border-box;
          pointer-events: none;
          box-shadow: 0 0 14px rgba(0, 212, 255, 0.6);
        "></div>

        <!-- Centered SVG Location Pin Badge (Exact Center X & Y) -->
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #00d4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 12px rgba(0,0,0,0.5);
          border: 2px solid #ffffff;
          box-sizing: border-box;
          z-index: 2;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3" fill="#0f172a"></circle>
          </svg>
        </div>
      </div>
    `,
  });
}

export default function GeofenceMapPickerModal({
  initialLat,
  initialLng,
  initialRadius,
  initialLabel,
  onConfirm,
  onClose,
}: GeofenceMapPickerModalProps) {
  // Default fallback: Cebu / Central Visayas or Philippines center
  const defaultLat = initialLat ?? 10.3157;
  const defaultLng = initialLng ?? 123.8854;

  const [selectedLat, setSelectedLat] = useState<number>(defaultLat);
  const [selectedLng, setSelectedLng] = useState<number>(defaultLng);
  const [radiusMeters, setRadiusMeters] = useState<number>(initialRadius || 1000);
  const [locationLabel, setLocationLabel] = useState<string>(initialLabel || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ name: string; coords: [number, number] }[]>([]);
  const [locatingCurrent, setLocatingCurrent] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Search through PH_COORDINATES dictionary
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches: { name: string; coords: [number, number] }[] = [];
    for (const [name, coords] of Object.entries(PH_COORDINATES)) {
      if (name.includes(q)) {
        // Capitalize name for display
        const displayName = name.replace(/\b\w/g, (c) => c.toUpperCase());
        matches.push({ name: displayName, coords });
        if (matches.length >= 8) break;
      }
    }
    setSearchResults(matches);
  }, [searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [selectedLat, selectedLng],
      zoom: 14,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap standard tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom glowing pinpoint icon centered directly inside the perimeter circle
    const pinIcon = createGeofenceCenterIcon(radiusMeters);

    // Draggable Marker
    const marker = L.marker([selectedLat, selectedLng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    // Radius Circle
    const circle = L.circle([selectedLat, selectedLng], {
      radius: radiusMeters,
      color: "#00d4ff",
      fillColor: "#00d4ff",
      fillOpacity: 0.18,
      weight: 2,
      dashArray: "4, 6",
    }).addTo(map);
    circleRef.current = circle;

    // Fit initial bounds to circle
    map.fitBounds(circle.getBounds(), { padding: [50, 50], maxZoom: 17 });

    // Marker drag listener
    marker.on("drag", (e: any) => {
      const latlng = e.target.getLatLng();
      circle.setLatLng(latlng);
    });

    marker.on("dragend", (e: any) => {
      const latlng = e.target.getLatLng();
      const lat = Number(latlng.lat.toFixed(6));
      const lng = Number(latlng.lng.toFixed(6));
      setSelectedLat(lat);
      setSelectedLng(lng);
      circle.setLatLng(latlng);
    });

    // Map click listener: moves marker to clicked spot
    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      setSelectedLat(lat);
      setSelectedLng(lng);
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
    });

    // Invalidate size once modal animation settles
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Circle, Marker Radius Pill & Fit Bounds when Radius Changes
  useEffect(() => {
    if (circleRef.current && markerRef.current) {
      circleRef.current.setRadius(radiusMeters);
      markerRef.current.setIcon(createGeofenceCenterIcon(radiusMeters));
      if (mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), {
          padding: [50, 50],
          maxZoom: 17,
          animate: true,
        });
      }
    }
  }, [radiusMeters]);

  // Jump to specific search coordinate
  const handleSelectSearchLocation = (item: { name: string; coords: [number, number] }) => {
    const [lat, lng] = item.coords;
    setSelectedLat(lat);
    setSelectedLng(lng);
    if (!locationLabel) {
      setLocationLabel(item.name);
    }
    setSearchQuery("");
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), {
        padding: [50, 50],
        maxZoom: 17,
        animate: true,
      });
    }
  };

  // Center on User's Current GPS Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setSelectedLat(lat);
        setSelectedLng(lng);
        setLocatingCurrent(false);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          circleRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), {
            padding: [50, 50],
            maxZoom: 17,
            animate: true,
          });
        }
      },
      (err) => {
        alert("Failed to acquire device location: " + err.message);
        setLocatingCurrent(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleApply = () => {
    onConfirm({
      latitude: selectedLat,
      longitude: selectedLng,
      radiusMeters,
      label: locationLabel.trim() || `Facility (${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)})`,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          background: "var(--bg-main, #0f172a)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .custom-geofence-center-pin {
            background: transparent !important;
            border: none !important;
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.15rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🗺️</span> Pick Geofence Location on Map
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
              Click anywhere on the map or drag the pin to designate the authorized facility. The perimeter circle updates live.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            onClick={onClose}
            style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Search & Location Bar */}
        <div
          style={{
            padding: "0.85rem 1.5rem",
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Search Box */}
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              className="form-input form-input-sm"
              placeholder="🔍 Search city, municipality, port, or landmark (e.g. Mandaue, Batangas, Manila, Davao)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: "0.825rem", width: "100%" }}
            />

            {searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "var(--bg-main, #1e293b)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  marginTop: "4px",
                  zIndex: 1000,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {searchResults.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => handleSelectSearchLocation(item)}
                    style={{
                      padding: "0.55rem 0.85rem",
                      fontSize: "0.825rem",
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--text-main)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 212, 255, 0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>📍 {item.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                      {item.coords[0].toFixed(2)}, {item.coords[1].toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleUseCurrentLocation}
            disabled={locatingCurrent}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}
          >
            <span>📍</span> {locatingCurrent ? "Locating..." : "Use My Device Location"}
          </button>
        </div>

        {/* Map Container */}
        <div style={{ position: "relative", width: "100%", height: "420px" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

          {/* Floating Instructions Overlay */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "12px",
              zIndex: 1000,
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "0.4rem 0.75rem",
              fontSize: "0.75rem",
              color: "var(--text-dim)",
              backdropFilter: "blur(4px)",
              pointerEvents: "none",
            }}
          >
            💡 Click anywhere to move pin &bull; Drag pin to fine-tune
          </div>
        </div>

        {/* Selected Coordinates & Perimeter Controls Footer */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "rgba(255,255,255,0.02)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.78rem" }}>Facility / Geofence Name</label>
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="e.g. Mandaue Port Garage / Dispatch Terminal"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.78rem" }}>Selected Latitude</label>
              <input
                type="number"
                step="0.000001"
                className="form-input form-input-sm"
                value={selectedLat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setSelectedLat(val);
                    markerRef.current?.setLatLng([val, selectedLng]);
                    circleRef.current?.setLatLng([val, selectedLng]);
                  }
                }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: "0.78rem" }}>Selected Longitude</label>
              <input
                type="number"
                step="0.000001"
                className="form-input form-input-sm"
                value={selectedLng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setSelectedLng(val);
                    markerRef.current?.setLatLng([selectedLat, val]);
                    circleRef.current?.setLatLng([selectedLat, val]);
                  }
                }}
              />
            </div>
          </div>

          {/* Radius Selector Pills & Custom Slider */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>Perimeter Radius:</span>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {[250, 500, 1000, 2000, 5000, 10000].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    className={`btn btn-xs ${radiusMeters === radius ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setRadiusMeters(radius)}
                  >
                    {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="50"
                step="50"
                className="form-input form-input-sm"
                style={{ width: "90px", fontSize: "0.8rem" }}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10) || 1000)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>meters</span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
                💾 Apply Selected Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
