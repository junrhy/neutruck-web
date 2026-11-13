import React, { useState, useEffect, useCallback } from "react";
import { User } from "../types";
import UnauthorizedGeofenceScreen from "./UnauthorizedGeofenceScreen";

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface GeofenceGatekeeperProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function GeofenceGatekeeper({
  user,
  onLogout,
  children,
}: GeofenceGatekeeperProps) {
  // If user is not logged in, or is admin, or does not have geofencing enabled, bypass check immediately
  const isEnforced = Boolean(
    user &&
      user.username?.toLowerCase() !== "admin" &&
      user.geofence_enabled &&
      user.allowed_latitude !== null &&
      user.allowed_latitude !== undefined &&
      user.allowed_longitude !== null &&
      user.allowed_longitude !== undefined
  );

  const bypassKey = user ? `geofence_session_bypass_${user.id}` : "";
  const [hasBypass, setHasBypass] = useState<boolean>(() => {
    if (!bypassKey) return false;
    return sessionStorage.getItem(bypassKey) === "true";
  });

  const [checking, setChecking] = useState<boolean>(isEnforced && !hasBypass);
  const [isAllowed, setIsAllowed] = useState<boolean>(!isEnforced || hasBypass);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const verifyLocation = useCallback(() => {
    if (!isEnforced || hasBypass) {
      setIsAllowed(true);
      setChecking(false);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setIsAllowed(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const uLat = position.coords.latitude;
        const uLng = position.coords.longitude;
        setCurrentLat(uLat);
        setCurrentLng(uLng);

        const targetLat = Number(user!.allowed_latitude);
        const targetLng = Number(user!.allowed_longitude);
        const radius = Number(user!.allowed_radius_meters) || 1000;

        const distance = calculateDistanceMeters(uLat, uLng, targetLat, targetLng);
        setDistanceMeters(distance);

        if (distance <= radius) {
          setIsAllowed(true);
          setGeoError(null);
        } else {
          setIsAllowed(false);
          setGeoError(
            `Device location is ${(distance / 1000).toFixed(2)} km away from ${
              user!.geofence_label || "the authorized facility"
            } (Max allowed: ${radius}m).`
          );
        }
        setChecking(false);
      },
      (error) => {
        let msg = "Failed to determine device location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "Location permission denied by user or browser.";
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "Device location is currently unavailable. Check your GPS / Wi-Fi.";
            break;
          case error.TIMEOUT:
            msg = "Device location request timed out.";
            break;
        }
        setGeoError(msg);
        setIsAllowed(false);
        setChecking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, [isEnforced, hasBypass, user]);

  useEffect(() => {
    verifyLocation();
    if (!isEnforced || hasBypass) return;

    // Periodic background check every 3 minutes
    const interval = setInterval(verifyLocation, 180000);
    return () => clearInterval(interval);
  }, [verifyLocation, isEnforced, hasBypass]);

  const handleAdminBypass = () => {
    if (bypassKey) {
      sessionStorage.setItem(bypassKey, "true");
    }
    setHasBypass(true);
    setIsAllowed(true);
  };

  // If not enforced or bypassed, render directly
  if (!isEnforced || hasBypass) {
    return <>{children}</>;
  }

  // Loading Screen while verifying position
  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-main)",
          color: "var(--primary)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📍</div>
        <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--primary)" }}>
          Verifying Workstation Location...
        </h3>
        <span style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-dim)" }}>
          Confirming geographical presence at authorized site ({user?.geofence_label || "Work Facility"})
        </span>
      </div>
    );
  }

  // Blocked Screen if outside allowed geofence or permission denied
  if (!isAllowed && user) {
    return (
      <UnauthorizedGeofenceScreen
        user={user}
        currentLat={currentLat}
        currentLng={currentLng}
        distanceMeters={distanceMeters}
        geoError={geoError}
        onRetry={verifyLocation}
        onBypass={handleAdminBypass}
        onLogout={onLogout}
      />
    );
  }

  return <>{children}</>;
}

