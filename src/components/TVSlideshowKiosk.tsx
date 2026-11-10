import React, { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import { DispatchJob, TruckVehicle, WaybillReceipt, MaintenanceLog, FuelTopupLog, UnitInspectionLog, SavedBillingRecord } from "../types";

interface TVSlideshowKioskProps {
  companyName?: string;
  companyLogo?: string;
  onExitKiosk?: () => void;
  // Optional initial props
  jobs?: DispatchJob[];
  vehicles?: TruckVehicle[];
  receipts?: WaybillReceipt[];
  maintenanceLogs?: MaintenanceLog[];
  topupLogs?: FuelTopupLog[];
  inspectionLogs?: UnitInspectionLog[];
}

function safeJsonParse(val: any) {
  if (!val) return undefined;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const TVSlideshowKiosk: React.FC<TVSlideshowKioskProps> = ({
  companyName = "NeuTruck",
  companyLogo = "",
  onExitKiosk,
  jobs: initialJobs = [],
  vehicles: initialVehicles = [],
  receipts: initialReceipts = [],
  maintenanceLogs: initialMaintenance = [],
  topupLogs: initialTopup = [],
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // DB State fetched directly by Kiosk
  const [jobs, setJobs] = useState<DispatchJob[]>(initialJobs);
  const [vehicles, setVehicles] = useState<TruckVehicle[]>(initialVehicles);
  const [receipts, setReceipts] = useState<WaybillReceipt[]>(initialReceipts);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(initialMaintenance);
  const [topupLogs, setTopupLogs] = useState<FuelTopupLog[]>(initialTopup);
  const [clients, setClients] = useState<any[]>([]);

  // Clock Timer
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) +
        " | " +
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Direct PostgreSQL DB Fetching inside Kiosk Component
  useEffect(() => {
    let isCancelled = false;

    async function loadDataFromDb() {
      try {
        const configuredPath = await invoke<string>("get_current_db_path").catch((e) => {
          console.error("[TV Kiosk DB] get_current_db_path error:", e);
          return "trucking_logistics.db";
        });

        let cleanPath = (configuredPath || "").trim();
        if (cleanPath.startsWith("postgresql://")) {
          cleanPath = "postgres://" + cleanPath.substring("postgresql://".length);
        }
        if (cleanPath.includes("?")) {
          cleanPath = cleanPath.split("?")[0];
        }
        const dbTarget = cleanPath.startsWith("postgres://")
          ? cleanPath
          : cleanPath.startsWith("sqlite:")
            ? cleanPath
            : `sqlite:${cleanPath}`;

        const dbInstance = await Database.load(dbTarget);
        if (isCancelled || !dbInstance) return;

        const isPg = dbTarget.startsWith("postgres://") || dbTarget.startsWith("postgresql://");
        const schemaPrefix = isPg ? "neutruck." : "";

        const [
          dbVehicles,
          dbJobs,
          dbReceipts,
          dbMaintenance,
          dbFuel,
          dbClients,
        ] = await Promise.all([
          dbInstance.select<any[]>(`SELECT * FROM ${schemaPrefix}truck_vehicles`).catch(() => []),
          dbInstance.select<any[]>(`SELECT * FROM ${schemaPrefix}dispatch_jobs`).catch(() => []),
          dbInstance.select<any[]>(`SELECT * FROM ${schemaPrefix}waybill_receipts`).catch(() => []),
          dbInstance.select<any[]>(`SELECT * FROM ${schemaPrefix}maintenance_logs`).catch(() => []),
          dbInstance.select<any[]>(`SELECT * FROM ${schemaPrefix}fuel_topup_logs`).catch(() => []),
          dbInstance.select<any[]>(`SELECT * FROM ${schemaPrefix}client_shippers`).catch(() => []),
        ]);

        if (isCancelled) return;

        if (dbVehicles) {
          setVehicles(dbVehicles.map((v) => ({
            id: String(v.id || ""),
            plateNumber: String(v.plate_number || ""),
            modelType: String(v.model_type || ""),
            capacityTons: Number(v.capacity_tons || 0),
            defaultDriverId: v.default_driver_id ? String(v.default_driver_id) : undefined,
            driverName: v.driver_name ? String(v.driver_name) : "",
            driverPhone: v.driver_phone ? String(v.driver_phone) : "",
            helperName: v.helper_name ? String(v.helper_name) : "",
            helperPhone: v.helper_phone ? String(v.helper_phone) : "",
            gpsTrackingUrl: v.gps_tracking_url ? String(v.gps_tracking_url) : undefined,
            gpsAuthToken: v.gps_auth_token ? String(v.gps_auth_token) : undefined,
            gpsAutoSync: Boolean(v.gps_auto_sync),
            status: (v.status ? String(v.status) : "Available") as any,
            isArchived: Boolean(v.is_archived),
            decommissionReason: v.decommission_reason ? String(v.decommission_reason) : undefined,
            fuelCapacityLiters: Number(v.fuel_capacity_liters || 300),
            currentFuelLevelPercent: Number(v.current_fuel_level_percent || 100),
            currentFuelLiters: Number(v.current_fuel_liters || 300),
            fuelCardNumber: v.fuel_card_number ? String(v.fuel_card_number) : undefined,
          })));
        }

        if (dbJobs) {
          setJobs(dbJobs.map((j) => ({
            id: String(j.id || ""),
            waybillNumber: String(j.waybill_number || ""),
            clientName: String(j.client_name || ""),
            clientPhone: j.client_phone ? String(j.client_phone) : "",
            pickupLocation: String(j.pickup_location || ""),
            dropoffLocation: String(j.dropoff_location || ""),
            cargoDescription: String(j.cargo_description || ""),
            weightTons: Number(j.weight_tons || 0),
            vanSize: j.van_size ? String(j.van_size) : undefined,
            truckId: j.truck_id ? String(j.truck_id) : "",
            truckPlate: String(j.truck_plate || ""),
            driverName: String(j.driver_name || ""),
            driverPhone: j.driver_phone ? String(j.driver_phone) : "",
            helperName: j.helper_name ? String(j.helper_name) : "",
            helperPhone: j.helper_phone ? String(j.helper_phone) : "",
            helperCommission: Number(j.helper_commission || 0),
            dispatchDate: String(j.dispatch_date || ""),
            deliveryStatus: (j.delivery_status ? String(j.delivery_status) : "Pending") as any,
            freightFee: Number(j.freight_fee || 0),
            freightBillingTerms: (j.freight_billing_terms ? String(j.freight_billing_terms) : undefined) as any,
            loadStatus: (j.load_status ? String(j.load_status) : "Loaded") as any,
            fuelAllowance: Number(j.fuel_allowance || 0),
            driverRate: Number(j.driver_rate || 0),
            containerNumber: j.container_number ? String(j.container_number) : undefined,
            trailerNumber: j.trailer_number ? String(j.trailer_number) : undefined,
            sealNumber: j.seal_number ? String(j.seal_number) : undefined,
            containerMovement: safeJsonParse(j.container_movement),
            truckUnitChecklist: safeJsonParse(j.truck_unit_checklist),
            fuelManagement: safeJsonParse(j.fuel_management),
            isInterIsland: Boolean(j.is_inter_island),
            roroRoute: j.roro_route ? String(j.roro_route) : undefined,
            roroTicketFee: Number(j.roro_ticket_fee || 0),
            shippingLine: j.shipping_line ? String(j.shipping_line) : undefined,
            roroLegs: safeJsonParse(j.roro_legs),
            hasReturnTrip: Boolean(j.has_return_trip),
            returnDestination: j.return_destination ? String(j.return_destination) : undefined,
            returnCargoType: (j.return_cargo_type ? String(j.return_cargo_type) : undefined) as any,
            returnPayer: (j.return_payer ? String(j.return_payer) : undefined) as any,
            returnFreightFee: Number(j.return_freight_fee || 0),
            returnFuelAllowance: Number(j.return_fuel_allowance || 0),
            returnRoroTicketFee: Number(j.return_roro_ticket_fee || 0),
            returnRoroLegs: safeJsonParse(j.return_roro_legs),
            currentLocation: j.current_location ? String(j.current_location) : undefined,
            lastLocationUpdate: j.last_location_update ? String(j.last_location_update) : undefined,
            isArchived: Boolean(j.is_archived),
          })));
        }

        if (dbReceipts) {
          setReceipts(dbReceipts.map((r) => ({
            id: String(r.id || ""),
            jobId: String(r.job_id || ""),
            waybillNumber: String(r.waybill_number || ""),
            clientName: String(r.client_name || ""),
            amountPaid: Number(r.amount_paid || 0),
            paymentMethod: (r.payment_method ? String(r.payment_method) : "Cash") as any,
            paymentStatus: (r.payment_status ? String(r.payment_status) : "Pending") as any,
            timestamp: String(r.timestamp || ""),
          })));
        }

        if (dbMaintenance) {
          setMaintenanceLogs(dbMaintenance.map((m) => ({
            id: String(m.id || ""),
            truckId: String(m.truck_id || ""),
            plateNumber: String(m.plate_number || ""),
            serviceType: String(m.service_type || ""),
            cost: Number(m.cost || 0),
            serviceDate: String(m.service_date || ""),
            odometerKm: Number(m.odometer_km || 0),
            notes: m.notes ? String(m.notes) : "",
          })));
        }

        if (dbFuel) {
          setTopupLogs(dbFuel.map((f) => ({
            id: String(f.id || ""),
            truckId: String(f.truck_id || ""),
            plateNumber: String(f.plate_number || ""),
            topupDate: String(f.topup_date || ""),
            liters: Number(f.liters || 0),
            costPerLiter: Number(f.cost_per_liter || 0),
            totalCost: Number(f.total_cost || 0),
            location: String(f.location || ""),
            containerSource: String(f.container_source || ""),
            odometerKm: f.odometer_km !== null && f.odometer_km !== undefined ? Number(f.odometer_km) : undefined,
            driverName: f.driver_name ? String(f.driver_name) : "",
            waybillNumber: f.waybill_number ? String(f.waybill_number) : "",
            notes: f.notes ? String(f.notes) : "",
          })));
        }

        if (dbClients && dbClients.length > 0) {
          setClients(dbClients.map((c) => ({
            id: String(c.id || ""),
            companyName: String(c.company_name || ""),
            billingNumber: c.billing_number ? String(c.billing_number) : undefined,
            statementStatus: (c.statement_status ? String(c.statement_status) : "Draft") as any,
            billingHistory: safeJsonParse(c.billing_history) || [],
          })));
        } else {
          try {
            const rawClients = localStorage.getItem("neutruck_client_shippers");
            if (rawClients) setClients(JSON.parse(rawClients));
          } catch (_) {}
        }
      } catch (err) {
        console.error("[TV Kiosk DB Load Error]:", err);
      }
    }

    loadDataFromDb();
    const interval = setInterval(loadDataFromDb, 10000);

    const channel = new BroadcastChannel("neutruck_kiosk_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "REFRESH_KIOSK_DATA" || event.data?.type === "DATA_UPDATED") {
        loadDataFromDb();
      }
    };

    const handleFocus = () => loadDataFromDb();
    window.addEventListener("focus", handleFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      channel.close();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // TV Wall Slides List
  const availableSlides = [
    { id: "fleet-command", label: "Fleet Command", icon: "🚚" },
    { id: "dispatch-kpi", label: "Dispatches & Waybills", icon: "📦" },
    { id: "fuel-gauges", label: "Fuel & Capacity", icon: "🛢️" },
    { id: "financial-kpi", label: "Financial KPI", icon: "📊" },
    { id: "billing-statements", label: "Billing Statements", icon: "📄" },
  ];

  const activeSlides = availableSlides;

  // Auto Rotation Timer (Every 60 seconds / 1 minute per slide)
  useEffect(() => {
    if (activeSlides.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlideIndex((oldIdx) => (oldIdx + 1) % activeSlides.length);
    }, 60000);

    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const activeSlide = activeSlides[currentSlideIndex] || availableSlides[0];

  // Date Parsing Helper (Normalizes date strings to Asia/Manila calendar date parts: year, month (0-11), day)
  const parsePhDate = (dateStr?: string) => {
    if (!dateStr) return null;
    let d: Date;
    // Handle YYYY-MM-DD string without time by appending T00:00:00 to avoid UTC midnight shifting back a day
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const parts = dateStr.trim().split("-").map(Number);
      return { year: parts[0], month: parts[1] - 1, day: parts[2] };
    }
    d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    // Format parts using Asia/Manila
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(d);
    let year = 0, month = 0, day = 0;
    for (const p of parts) {
      if (p.type === "year") year = parseInt(p.value, 10);
      if (p.type === "month") month = parseInt(p.value, 10) - 1;
      if (p.type === "day") day = parseInt(p.value, 10);
    }
    return { year, month, day };
  };

  // Get current PH calendar date representation
  const getPhNow = () => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(new Date());
    let year = 0, month = 0, day = 0;
    for (const p of parts) {
      if (p.type === "year") year = parseInt(p.value, 10);
      if (p.type === "month") month = parseInt(p.value, 10) - 1;
      if (p.type === "day") day = parseInt(p.value, 10);
    }
    return { year, month, day };
  };

  // Date Helper: Calculate metrics for a specific day window (days = 0 for Today, >0 for past N calendar days)
  const getMetricsForDays = (days: number) => {
    const nowPh = getPhNow();
    const todayTimestamp = Date.UTC(nowPh.year, nowPh.month, nowPh.day);

    const isWithin = (dateStr?: string) => {
      const parsed = parsePhDate(dateStr);
      if (!parsed) return false;
      const targetTimestamp = Date.UTC(parsed.year, parsed.month, parsed.day);
      const diffDays = Math.floor((todayTimestamp - targetTimestamp) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    };

    const periodJobs = jobs.filter((j) => isWithin(j.dispatchDate));
    const periodReceipts = receipts.filter((r) => isWithin(r.timestamp));
    const periodMaintenance = maintenanceLogs.filter((m) => isWithin(m.serviceDate));
    const periodTopup = topupLogs.filter((f) => isWithin(f.topupDate));

    const freightRevenue = periodJobs.reduce((acc, j) => acc + (j.freightFee || 0), 0);
    const fuelAllowance = periodJobs.reduce((acc, j) => acc + (j.fuelAllowance || 0), 0);
    const driverBirada = periodJobs.reduce((acc, j) => acc + (j.driverRate || 0), 0);
    const helperBirada = periodJobs.reduce((acc, j) => acc + (j.helperCommission || 0), 0);
    const maintenanceCost = periodMaintenance.reduce((acc, m) => acc + (m.cost || 0), 0);
    const actualFuelCost = periodTopup.reduce((acc, f) => acc + (f.totalCost || 0), 0);
    const totalLaborBirada = driverBirada + helperBirada;

    // Net Profit = Freight Revenue - (Fuel Allowance + Driver/Helper Birada + Maintenance Expense)
    const netProfit = freightRevenue - (fuelAllowance + totalLaborBirada + maintenanceCost);

    return {
      totalJobs: periodJobs.length,
      deliveredJobs: periodJobs.filter((j) => j.deliveryStatus === "Delivered").length,
      inTransitJobs: periodJobs.filter((j) => j.deliveryStatus === "In Transit" || j.deliveryStatus === "Dispatched" || j.deliveryStatus === "Onboard RoRo").length,
      pendingJobs: periodJobs.filter((j) => j.deliveryStatus === "Pending" || j.deliveryStatus === "Draft").length,
      freightRevenue,
      collectedPayments: periodReceipts.reduce((acc, r) => acc + (r.amountPaid || 0), 0),
      fuelAllowance,
      driverBirada,
      helperBirada,
      totalLaborBirada,
      maintenanceCost,
      actualFuelCost,
      fuelLiters: periodTopup.reduce((acc, f) => acc + (f.liters || 0), 0),
      netProfit,
    };
  };

  // Date Helper: Calculate metrics for a specific calendar month (0 = current month, -1 = last month)
  const getMetricsForMonthOffset = (offsetMonths: number) => {
    const nowPh = getPhNow();
    let targetYear = nowPh.year;
    let targetMonthIdx = nowPh.month + offsetMonths;

    while (targetMonthIdx < 0) {
      targetMonthIdx += 12;
      targetYear -= 1;
    }
    while (targetMonthIdx > 11) {
      targetMonthIdx -= 12;
      targetYear += 1;
    }

    const isMatch = (dateStr?: string) => {
      const parsed = parsePhDate(dateStr);
      if (!parsed) return false;
      return parsed.year === targetYear && parsed.month === targetMonthIdx;
    };

    const periodJobs = jobs.filter((j) => isMatch(j.dispatchDate));
    const periodReceipts = receipts.filter((r) => isMatch(r.timestamp));
    const periodMaintenance = maintenanceLogs.filter((m) => isMatch(m.serviceDate));
    const periodTopup = topupLogs.filter((f) => isMatch(f.topupDate));

    // Construct label (e.g. "Oct 2026")
    const dummyDate = new Date(Date.UTC(targetYear, targetMonthIdx, 1));
    const monthLabel = dummyDate.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

    const freightRevenue = periodJobs.reduce((acc, j) => acc + (j.freightFee || 0), 0);
    const fuelAllowance = periodJobs.reduce((acc, j) => acc + (j.fuelAllowance || 0), 0);
    const driverBirada = periodJobs.reduce((acc, j) => acc + (j.driverRate || 0), 0);
    const helperBirada = periodJobs.reduce((acc, j) => acc + (j.helperCommission || 0), 0);
    const maintenanceCost = periodMaintenance.reduce((acc, m) => acc + (m.cost || 0), 0);
    const actualFuelCost = periodTopup.reduce((acc, f) => acc + (f.totalCost || 0), 0);
    const totalLaborBirada = driverBirada + helperBirada;

    const netProfit = freightRevenue - (fuelAllowance + totalLaborBirada + maintenanceCost);

    return {
      monthLabel,
      totalJobs: periodJobs.length,
      deliveredJobs: periodJobs.filter((j) => j.deliveryStatus === "Delivered").length,
      inTransitJobs: periodJobs.filter((j) => j.deliveryStatus === "In Transit" || j.deliveryStatus === "Dispatched" || j.deliveryStatus === "Onboard RoRo").length,
      pendingJobs: periodJobs.filter((j) => j.deliveryStatus === "Pending" || j.deliveryStatus === "Draft").length,
      freightRevenue,
      collectedPayments: periodReceipts.reduce((acc, r) => acc + (r.amountPaid || 0), 0),
      fuelAllowance,
      driverBirada,
      helperBirada,
      totalLaborBirada,
      maintenanceCost,
      actualFuelCost,
      fuelLiters: periodTopup.reduce((acc, f) => acc + (f.liters || 0), 0),
      netProfit,
    };
  };

  // Multi-Period Comparative Data Object (6 Period Columns)
  const periodData = {
    today: getMetricsForDays(0), // Exact today (0 days difference)
    days7: getMetricsForDays(7),
    days14: getMetricsForDays(14),
    days30: getMetricsForDays(30),
    thisMonth: getMetricsForMonthOffset(0),
    lastMonth: getMetricsForMonthOffset(-1),
  };

  // Live Vehicle Metrics
  const inTransitCount = vehicles.filter((v) => v.status === "In Transit").length;
  const availableVehiclesCount = vehicles.filter((v) => v.status === "Available" && !v.isArchived).length;
  const maintenanceCount = vehicles.filter((v) => v.status === "Maintenance").length;

  // Theme & Appearance Listener
  useEffect(() => {
    const applyAppearance = () => {
      try {
        const savedMode = localStorage.getItem("neutruck_theme_mode") || "dark";
        if (savedMode === "light") {
          document.documentElement.setAttribute("data-theme", "light");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }

        const savedAccent = localStorage.getItem("neutruck_accent_color") || "cyan";
        if (savedAccent !== "cyan") {
          document.documentElement.setAttribute("data-accent", savedAccent);
        } else {
          document.documentElement.removeAttribute("data-accent");
        }
      } catch (e) {
        console.error("Kiosk theme restore error", e);
      }
    };

    applyAppearance();
    window.addEventListener("storage", applyAppearance);
    return () => window.removeEventListener("storage", applyAppearance);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "var(--bg-main)",
        color: "var(--text-main)",
        boxSizing: "border-box",
        overflow: "hidden",
        padding: "1rem 1.25rem",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "0.6rem 1.25rem",
          marginBottom: "0.85rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}
      >
        {/* Company & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" style={{ height: "36px", objectFit: "contain" }} />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "var(--primary)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.1rem",
              }}
            >
              🚛
            </div>
          )}
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.5px", color: "var(--text-main)" }}>
              {companyName} <span style={{ color: "var(--primary)", fontSize: "0.9rem" }}>COMMAND CENTER</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Exit Option if provided */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>

          {onExitKiosk && (
            <button
              onClick={onExitKiosk}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✕ Exit Kiosk
            </button>
          )}

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, fontFamily: "monospace", color: "var(--primary)" }}>
              {currentTimeStr.split(" | ")[1] || ""}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              {currentTimeStr.split(" | ")[0] || ""}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Selection Bar */}
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.85rem", flexShrink: 0 }}>
        {availableSlides.map((slide, idx) => {
          const isActive = activeSlide?.id === slide.id;
          return (
            <button
              key={slide.id}
              onClick={() => setCurrentSlideIndex(idx)}
              style={{
                flex: 1,
                padding: "0.6rem 0.85rem",
                borderRadius: "10px",
                border: isActive ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: isActive
                  ? "linear-gradient(135deg, var(--primary-alpha) 0%, rgba(59,130,246,0.15) 100%)"
                  : "var(--bg-card)",
                color: isActive ? "var(--primary)" : "var(--text-dim)",
                fontWeight: isActive ? 800 : 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isActive ? "0 4px 15px var(--primary-alpha)" : "none",
                transform: isActive ? "translateY(-1px)" : "none",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{slide.icon}</span>
              <span>{slide.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main TV Screen Content Container (Zero-Scroll Wall Display) */}
      <div
        style={{
          flex: 1,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* SLIDE 1: 🚚 Live Fleet Command & Vehicle Activity */}
        {activeSlide?.id === "fleet-command" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0.85rem", overflow: "hidden" }}>
            {/* Top Section: Live Fleet Status Banner */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", flexShrink: 0 }}>
              <div style={{ background: "var(--primary-alpha)", border: "1px solid var(--primary-border)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Fleet Units</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--primary)" }}>{vehicles.length}</div>
              </div>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Units In Transit</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--success)" }}>{inTransitCount}</div>
              </div>
              <div style={{ background: "var(--primary-alpha)", border: "1px solid var(--primary-border)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Available / Depo</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--primary)" }}>{availableVehiclesCount}</div>
              </div>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>In Maintenance</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--warning)" }}>{maintenanceCount}</div>
              </div>
            </div>

            {/* Middle Section: 6 Period Operational Performance Comparison */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, textTransform: "uppercase", color: "var(--primary)", marginBottom: "0.6rem", letterSpacing: "0.6px" }}>
                📊 DISPATCH & FUEL PERFORMANCE COMPARISON
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.85rem" }}>
                {[
                  { label: "Today", data: periodData.today, highlight: false },
                  { label: "Last 7 Days", data: periodData.days7, highlight: false },
                  { label: "Last 14 Days", data: periodData.days14, highlight: false },
                  { label: "Past 30 Days", data: periodData.days30, highlight: false },
                  { label: `This Month (${periodData.thisMonth.monthLabel})`, data: periodData.thisMonth, highlight: true },
                  { label: `Last Month (${periodData.lastMonth.monthLabel})`, data: periodData.lastMonth, highlight: false },
                ].map((col, i) => (
                  <div
                    key={i}
                    style={{
                      background: col.highlight ? "var(--primary-alpha)" : "var(--bg-main)",
                      border: col.highlight ? "2px solid var(--primary)" : "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "0.9rem 1rem",
                      boxShadow: col.highlight ? "0 6px 20px var(--primary-alpha)" : "none",
                    }}
                  >
                    <div style={{ fontSize: "1.05rem", fontWeight: 900, textTransform: "uppercase", color: col.highlight ? "var(--primary)" : "var(--text-main)", marginBottom: "0.6rem", borderBottom: "1px dashed var(--border)", paddingBottom: "0.35rem" }}>
                      📅 {col.label}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.0rem", color: "var(--text-dim)", marginBottom: "0.4rem" }}>
                      <span>Jobs:</span>
                      <strong style={{ color: "var(--text-main)", fontSize: "1.35rem", fontWeight: 900 }}>{col.data.totalJobs}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.0rem", color: "var(--text-dim)", marginBottom: "0.4rem" }}>
                      <span>Done:</span>
                      <strong style={{ color: "var(--success)", fontSize: "1.35rem", fontWeight: 900 }}>{col.data.deliveredJobs}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.0rem", color: "var(--text-dim)" }}>
                      <span>Fuel:</span>
                      <strong style={{ color: "var(--warning)", fontSize: "1.25rem", fontWeight: 900 }}>₱{col.data.actualFuelCost.toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Section: Active Fleet Vehicles Live Status Table */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, marginTop: "0.2rem" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, textTransform: "uppercase", color: "var(--text-main)", marginBottom: "0.5rem", letterSpacing: "0.5px" }}>
                🚚 ACTIVE TRUCK UNITS & TANK LEVELS
              </div>
              <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-main)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)", color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.8rem", fontWeight: 800 }}>
                      <th style={{ padding: "0.6rem 0.85rem" }}>Plate Number</th>
                      <th style={{ padding: "0.6rem 0.85rem" }}>Model / Type</th>
                      <th style={{ padding: "0.6rem 0.85rem" }}>Assigned Driver</th>
                      <th style={{ padding: "0.6rem 0.85rem" }}>Current Status</th>
                      <th style={{ padding: "0.6rem 0.85rem", width: "35%" }}>Fuel Tank Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                          No truck vehicles found in database
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((v) => {
                        const status = (v.status || "Available") as string;
                        let bgStyle = "rgba(59, 130, 246, 0.15)";
                        let textStyle = "#3b82f6";
                        let borderStyle = "rgba(59, 130, 246, 0.4)";

                        if (status === "In Transit") {
                          bgStyle = "rgba(16, 185, 129, 0.18)";
                          textStyle = "#10b981";
                          borderStyle = "rgba(16, 185, 129, 0.4)";
                        } else if (status === "Available") {
                          bgStyle = "rgba(99, 102, 241, 0.18)";
                          textStyle = "#818cf8";
                          borderStyle = "rgba(99, 102, 241, 0.4)";
                        } else if (status === "Maintenance") {
                          bgStyle = "rgba(245, 158, 11, 0.2)";
                          textStyle = "#f59e0b";
                          borderStyle = "rgba(245, 158, 11, 0.5)";
                        } else if (status === "Reserved") {
                          bgStyle = "rgba(14, 165, 233, 0.18)";
                          textStyle = "#38bdf8";
                          borderStyle = "rgba(14, 165, 233, 0.4)";
                        } else if (status === "Decommissioned") {
                          bgStyle = "rgba(239, 68, 68, 0.18)";
                          textStyle = "#ef4444";
                          borderStyle = "rgba(239, 68, 68, 0.4)";
                        }

                        const fuelPct = v.currentFuelLevelPercent || 100;
                        const fuelLiters = v.currentFuelLiters || 300;
                        const isLowFuel = fuelPct < 30;

                        return (
                          <tr key={v.id} style={{ borderBottom: "1px solid var(--border)", height: "42px" }}>
                            <td style={{ padding: "0.45rem 0.85rem", fontWeight: 900, color: "var(--text-main)", fontSize: "0.95rem" }}>
                              {v.plateNumber}
                            </td>
                            <td style={{ padding: "0.45rem 0.85rem", color: "var(--text-main)", fontWeight: 600 }}>
                              {v.modelType}
                            </td>
                            <td style={{ padding: "0.45rem 0.85rem", color: "var(--text-dim)" }}>
                              {v.driverName || "Unassigned"}
                            </td>
                            <td style={{ padding: "0.45rem 0.85rem" }}>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.25rem 0.65rem",
                                  borderRadius: "12px",
                                  background: bgStyle,
                                  color: textStyle,
                                  border: `1px solid ${borderStyle}`,
                                  fontWeight: 800,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
                                <span>●</span> {status}
                              </span>
                            </td>
                            <td style={{ padding: "0.45rem 0.85rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <div style={{ flex: 1, height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${fuelPct}%`,
                                      background: isLowFuel ? "var(--danger)" : "var(--success)",
                                      transition: "width 0.3s ease",
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isLowFuel ? "var(--danger)" : "var(--text-main)", minWidth: "90px", textAlign: "right" }}>
                                  {fuelPct}% ({fuelLiters}L)
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: 📦 Dispatch Operations & Waybills */}
        {activeSlide?.id === "dispatch-kpi" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "1rem" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "0.5px" }}>
              📦 DISPATCH & WAYBILL COMPARISON ACROSS TIMEFRAMES
            </div>

            {/* 6 Period Comparison Cards */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem" }}>
              {[
                { label: "Today", data: periodData.today },
                { label: "Last 7 Days", data: periodData.days7 },
                { label: "Last 14 Days", data: periodData.days14 },
                { label: "Past 30 Days", data: periodData.days30 },
                { label: `This Month (${periodData.thisMonth.monthLabel})`, data: periodData.thisMonth, highlight: true },
                { label: `Last Month (${periodData.lastMonth.monthLabel})`, data: periodData.lastMonth },
              ].map((col, i) => (
                <div
                  key={i}
                  style={{
                    background: col.highlight ? "var(--primary-alpha)" : "var(--bg-main)",
                    border: col.highlight ? "2px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: col.highlight ? "var(--primary)" : "var(--text-main)", marginBottom: "0.35rem" }}>
                    📅 {col.label}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", flex: 1, justifyContent: "center" }}>
                    <div style={{ background: "var(--bg-card)", padding: "0.45rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Total Dispatch</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--text-main)" }}>{col.data.totalJobs}</span>
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "0.45rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Delivered</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--success)" }}>{col.data.deliveredJobs}</span>
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "0.45rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>En Route</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--primary)" }}>{col.data.inTransitJobs}</span>
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "0.45rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Pending</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--warning)" }}>{col.data.pendingJobs}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "0.45rem", paddingTop: "0.45rem", borderTop: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Freight Revenue</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--success)" }}>₱{col.data.freightRevenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 3: 🛢️ Fleet Fuel & Tank Capacity */}
        {activeSlide?.id === "fuel-gauges" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "1rem" }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "var(--text-main)", letterSpacing: "0.5px" }}>
              🛢️ FLEET FUEL & CONSUMPTION COMPARISON
            </div>

            {/* 6 Period Fuel Comparison */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem" }}>
              {[
                { label: "Today", data: periodData.today },
                { label: "Last 7 Days", data: periodData.days7 },
                { label: "Last 14 Days", data: periodData.days14 },
                { label: "Past 30 Days", data: periodData.days30 },
                { label: `This Month (${periodData.thisMonth.monthLabel})`, data: periodData.thisMonth, highlight: true },
                { label: `Last Month (${periodData.lastMonth.monthLabel})`, data: periodData.lastMonth },
              ].map((col, i) => (
                <div
                  key={i}
                  style={{
                    background: col.highlight ? "var(--primary-alpha)" : "var(--bg-main)",
                    border: col.highlight ? "2px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase", color: col.highlight ? "var(--primary)" : "var(--text-main)", marginBottom: "0.5rem", borderBottom: "1px dashed var(--border)", paddingBottom: "0.3rem" }}>
                    📅 {col.label}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, justifyContent: "center" }}>
                    {/* Topup Logged Cost */}
                    <div style={{ background: "var(--bg-card)", padding: "0.5rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Actual Fuel Topups</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--warning)" }}>₱{col.data.actualFuelCost.toLocaleString()}</div>
                    </div>

                    {/* Liters Dispensed */}
                    <div style={{ background: "var(--bg-card)", padding: "0.5rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Liters Dispensed</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--primary)" }}>{col.data.fuelLiters.toLocaleString()} L</div>
                    </div>

                    {/* Dispatch Fuel Allowance */}
                    <div style={{ background: "var(--bg-card)", padding: "0.5rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Dispatch Fuel Allowance</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#38bdf8" }}>₱{col.data.fuelAllowance.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Grand Total Fuel Expense Footer */}
                  <div style={{ marginTop: "0.6rem", paddingTop: "0.6rem", borderTop: "2px solid var(--border)", background: "var(--bg-card)", padding: "0.6rem", borderRadius: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase" }}>Grand Total Fuel Cost</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--warning)" }}>
                      ₱{(col.data.actualFuelCost > 0 ? col.data.actualFuelCost : col.data.fuelAllowance).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 4: 📊 Profitability & Financial KPI */}
        {activeSlide?.id === "financial-kpi" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0.85rem", overflow: "hidden" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "0.5px" }}>
              📊 FINANCIAL PERFORMANCE & PROFITABILITY COMPARISON
            </div>

            {/* 6 Period Financial KPI Cards */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.75rem", minHeight: 0 }}>
              {[
                { label: "Today", data: periodData.today },
                { label: "Last 7 Days", data: periodData.days7 },
                { label: "Last 14 Days", data: periodData.days14 },
                { label: "Past 30 Days", data: periodData.days30 },
                { label: `This Month (${periodData.thisMonth.monthLabel})`, data: periodData.thisMonth, highlight: true },
                { label: `Last Month (${periodData.lastMonth.monthLabel})`, data: periodData.lastMonth },
              ].map((col, i) => (
                <div
                  key={i}
                  style={{
                    background: col.highlight ? "var(--primary-alpha)" : "var(--bg-main)",
                    border: col.highlight ? "2px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: col.highlight ? "var(--primary)" : "var(--text-main)", marginBottom: "0.3rem" }}>
                    📅 {col.label}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, justifyContent: "center" }}>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "0.4rem 0.55rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Freight Revenue</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--success)" }}>₱{col.data.freightRevenue.toLocaleString()}</div>
                    </div>

                    <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.4rem 0.55rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Fuel Allowances</div>
                      <div style={{ fontSize: "1.0rem", fontWeight: 900, color: "var(--warning)" }}>₱{col.data.fuelAllowance.toLocaleString()}</div>
                    </div>

                    <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)", padding: "0.4rem 0.55rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Driver Birada / Rate</div>
                      <div style={{ fontSize: "1.0rem", fontWeight: 900, color: "#818cf8" }}>₱{col.data.driverBirada.toLocaleString()}</div>
                    </div>

                    <div style={{ background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.3)", padding: "0.4rem 0.55rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Helper Birada / Comm.</div>
                      <div style={{ fontSize: "1.0rem", fontWeight: 900, color: "#38bdf8" }}>₱{col.data.helperBirada.toLocaleString()}</div>
                    </div>

                    <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.4rem 0.55rem", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Maintenance Expense</div>
                      <div style={{ fontSize: "1.0rem", fontWeight: 900, color: "var(--danger)" }}>₱{col.data.maintenanceCost.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Net Profit Grand Total Footer */}
                  <div style={{ background: "var(--primary-alpha)", border: "1.5px solid var(--primary-border)", borderRadius: "8px", padding: "0.45rem 0.55rem", marginTop: "0.35rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Grand Total Net Profit</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--primary)" }}>₱{col.data.netProfit.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 5: 📄 Billing Statements & Receivables */}
        {activeSlide?.id === "billing-statements" && (() => {
          // Extract all billing records from clients or construct from client shippers data
          const allBillingRecords: Array<{
            id: string;
            billingNo: string;
            clientName: string;
            createdAt: string;
            dueDate: string;
            amount: number;
            status: string;
            isOverdue: boolean;
            isNearDue: boolean;
            dueDaysText: string;
          }> = [];

          const nowPh = getPhNow();
          const todayMs = Date.UTC(nowPh.year, nowPh.month, nowPh.day);

          clients.forEach((c) => {
            const history: SavedBillingRecord[] = c.billingHistory || [];
            if (history.length > 0) {
              history.forEach((rec) => {
                const createdStr = rec.createdAt ? rec.createdAt.split("T")[0] : rec.billingDate || "";
                const dueStr = rec.dueDate || "";
                let isOverdue = false;
                let isNearDue = false;
                let dueDaysText = "On Track";

                if (dueStr) {
                  const parsedDue = parsePhDate(dueStr);
                  if (parsedDue) {
                    const dueMs = Date.UTC(parsedDue.year, parsedDue.month, parsedDue.day);
                    const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      isOverdue = true;
                      dueDaysText = `${Math.abs(diffDays)} days OVERDUE`;
                    } else if (diffDays <= 7) {
                      isNearDue = true;
                      dueDaysText = `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
                    } else {
                      dueDaysText = `Due in ${diffDays} days`;
                    }
                  }
                }

                allBillingRecords.push({
                  id: rec.id,
                  billingNo: rec.billingNumber || c.billingNumber || rec.statementNo || "BS-N/A",
                  clientName: c.companyName || rec.clientName || "Client",
                  createdAt: createdStr || "N/A",
                  dueDate: dueStr || "N/A",
                  amount: rec.grandTotal || rec.subtotal || 0,
                  status: rec.status || c.statementStatus || "Draft",
                  isOverdue,
                  isNearDue,
                  dueDaysText,
                });
              });
            }
          });

          const totalStatements = allBillingRecords.length;
          const totalOverdue = allBillingRecords.filter((r) => r.isOverdue).length;
          const totalNearDue = allBillingRecords.filter((r) => r.isNearDue).length;
          const totalReceivableAmount = allBillingRecords.reduce((acc, r) => acc + (r.amount || 0), 0);

          return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0.85rem", overflow: "hidden" }}>
              {/* Summary Stats Header Banner */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", flexShrink: 0 }}>
                <div style={{ background: "var(--primary-alpha)", border: "1px solid var(--primary-border)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Statements</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--primary)" }}>{totalStatements}</div>
                </div>

                <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Overdue Accounts</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--danger)" }}>{totalOverdue}</div>
                </div>

                <div style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Near Due (Within 7 Days)</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--warning)" }}>{totalNearDue}</div>
                </div>

                <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "10px", padding: "0.6rem 0.85rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Receivables Value</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--success)" }}>₱{totalReceivableAmount.toLocaleString()}</div>
                </div>
              </div>

              {/* Table List View */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                <div style={{ fontSize: "1.0rem", fontWeight: 900, textTransform: "uppercase", color: "var(--text-main)", marginBottom: "0.4rem", letterSpacing: "0.5px" }}>
                  📄 CLIENT BILLING STATEMENTS & DUE DATES
                </div>

                <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--bg-main)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)", color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.8rem", fontWeight: 800 }}>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Billing Number</th>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Client Company</th>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Billing Created</th>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Due Date</th>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Grand Total Amount</th>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Statement Status</th>
                        <th style={{ padding: "0.65rem 0.85rem" }}>Due Alert Indicator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBillingRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                            No billing statement records found in database
                          </td>
                        </tr>
                      ) : (
                        allBillingRecords.map((rec, idx) => {
                          const statusBg = rec.status === "Approved" ? "rgba(16, 185, 129, 0.15)" : rec.status === "Checked" ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)";
                          const statusColor = rec.status === "Approved" ? "var(--success)" : rec.status === "Checked" ? "var(--primary)" : "var(--warning)";

                          let indicatorBg = "rgba(100, 116, 139, 0.12)";
                          let indicatorColor = "var(--text-dim)";
                          let indicatorBorder = "rgba(100, 116, 139, 0.3)";
                          let indicatorIcon = "📅";

                          if (rec.isOverdue) {
                            indicatorBg = "rgba(239, 68, 68, 0.18)";
                            indicatorColor = "var(--danger)";
                            indicatorBorder = "rgba(239, 68, 68, 0.5)";
                            indicatorIcon = "⚠️";
                          } else if (rec.isNearDue) {
                            indicatorBg = "rgba(245, 158, 11, 0.18)";
                            indicatorColor = "var(--warning)";
                            indicatorBorder = "rgba(245, 158, 11, 0.5)";
                            indicatorIcon = "⏳";
                          }

                          return (
                            <tr key={rec.id + idx} style={{ borderBottom: "1px solid var(--border)", height: "42px" }}>
                              <td style={{ padding: "0.5rem 0.85rem", fontWeight: 900, color: "var(--primary)", fontFamily: "monospace", fontSize: "0.95rem" }}>
                                {rec.billingNo}
                              </td>
                              <td style={{ padding: "0.5rem 0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                                {rec.clientName}
                              </td>
                              <td style={{ padding: "0.5rem 0.85rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                                {rec.createdAt}
                              </td>
                              <td style={{ padding: "0.5rem 0.85rem", fontWeight: 800, color: rec.isOverdue ? "var(--danger)" : rec.isNearDue ? "var(--warning)" : "var(--text-main)" }}>
                                {rec.dueDate}
                              </td>
                              <td style={{ padding: "0.5rem 0.85rem", fontWeight: 900, color: "var(--success)", fontSize: "0.95rem" }}>
                                {rec.amount > 0 ? `₱${rec.amount.toLocaleString()}` : "₱0"}
                              </td>
                              <td style={{ padding: "0.5rem 0.85rem" }}>
                                <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "10px", background: statusBg, color: statusColor, fontWeight: 800 }}>
                                  ● {rec.status}
                                </span>
                              </td>
                              <td style={{ padding: "0.5rem 0.85rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "0.25rem 0.65rem",
                                    borderRadius: "12px",
                                    background: indicatorBg,
                                    color: indicatorColor,
                                    border: `1px solid ${indicatorBorder}`,
                                    fontWeight: 900,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                  }}
                                >
                                  <span>{indicatorIcon}</span> {rec.dueDaysText}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
