import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import { DispatchJob, TruckVehicle, WaybillReceipt, MaintenanceLog, FuelTopupLog, UnitInspectionLog, SMSLog, SMSRecipientTarget, ClientShipper, RoroPort, RoroRoute, DropoffDestination, DriverProfile, HelperProfile } from "./types";
import Header, { Tab } from "./components/Header";
import DispatchBoardPage from "./components/DispatchBoardPage";
import FleetVehiclesPage from "./components/FleetVehiclesPage";
import FuelManagementPage from "./components/FuelManagementPage";
import UnitInspectionPage from "./components/UnitInspectionPage";
import DriversPage from "./components/DriversPage";
import HelpersPage from "./components/HelpersPage";
import ClientShippersPage from "./components/ClientShippersPage";
import RoroManagementPage from "./components/RoroManagementPage";
import DropoffDestinationsPage from "./components/DropoffDestinationsPage";
import WaybillsPage from "./components/WaybillsPage";
import MaintenancePage from "./components/MaintenancePage";
import ReportsPage from "./components/ReportsPage";
import { TVSlideshowKiosk } from "./components/TVSlideshowKiosk";
import SMSConsole from "./components/SMSConsole";
import SettingsPage from "./components/SettingsPage";
import ActivationScreen from "./components/ActivationScreen";
import TrucksMapView from "./components/TrucksMapView";
import PrintableWaybillModal from "./components/PrintableWaybillModal";
import UserLogin from "./components/auth/UserLogin";
import ChangePasswordModal from "./components/auth/ChangePasswordModal";
import GuestLandingPage from "./components/GuestLandingPage";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useDialog } from "./components/common/CustomDialogModal";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getNextSequentialId } from "./utils/idGenerator";
import "./App.css";

const INITIAL_TRUCK_MODELS: string[] = [
  "10-Wheeler Wingvan",
  "Prime Mover 40ft Container",
  "6-Wheeler Closed Aluminum Van",
  "Tractor Head Trailer",
  "Dump Truck Heavy Hauler",
  "4-Wheeler Drop-Side Pickup",
  "8-Wheeler Refrigerated Thermo-Van",
  "12-Wheeler Heavy Cargo Wingvan",
];

function TvKioskPage() {
  const companyName = localStorage.getItem("neutruck_company_name") || "NeuTruck";
  const companyLogo = localStorage.getItem("neutruck_company_logo") || "";
  return <TVSlideshowKiosk companyName={companyName} companyLogo={companyLogo} />;
}

export default function App() {
  const isTvKioskMode = window.location.search.includes("mode=tv-kiosk");
  if (isTvKioskMode) {
    return <TvKioskPage />;
  }

  const { showAlert, showConfirm } = useDialog();
  const [db, setDb] = useState<Database | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dispatch");
  const [isLicenseValid, setIsLicenseValid] = useState<boolean>(true);
  const [checkingLicense, setCheckingLicense] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Business Profile
  const [companyName, setCompanyName] = useState(() => localStorage.getItem("neutruck_company_name") || "NeuTruck");
  const [companyTag, setCompanyTag] = useState(() => localStorage.getItem("neutruck_company_tagline") || "Fleet Logistics");
  const [companyLogo, setCompanyLogo] = useState(() => localStorage.getItem("neutruck_company_logo") || "");
  const [companyAddress, setCompanyAddress] = useState(() => localStorage.getItem("neutruck_company_address") || "Bohol, Philippines");
  const [companyPhone, setCompanyPhone] = useState(() => localStorage.getItem("neutruck_company_phone") || "");
  const [sigPreparedBy, setSigPreparedBy] = useState(() => localStorage.getItem("neutruck_sig_prepared_by") || "");
  const [sigCheckedBy, setSigCheckedBy] = useState(() => localStorage.getItem("neutruck_sig_checked_by") || "");
  const [sigApprovedBy, setSigApprovedBy] = useState(() => localStorage.getItem("neutruck_sig_approved_by") || "");
  const [sigPreparedByImg, setSigPreparedByImg] = useState(() => localStorage.getItem("neutruck_sig_prepared_by_img") || "");
  const [sigCheckedByImg, setSigCheckedByImg] = useState(() => localStorage.getItem("neutruck_sig_checked_by_img") || "");
  const [sigApprovedByImg, setSigApprovedByImg] = useState(() => localStorage.getItem("neutruck_sig_approved_by_img") || "");
  const [mapPrintableJob, setMapPrintableJob] = useState<DispatchJob | null>(null);

  // Dynamically update window title & document title based on profile name in settings
  useEffect(() => {
    const fullTitle = companyTag ? `${companyName} - ${companyTag}` : companyName;
    document.title = fullTitle;
    try {
      getCurrentWindow().setTitle(fullTitle).catch(() => {});
    } catch (_) {}
  }, [companyName, companyTag]);

  // App Data State
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [helpers, setHelpers] = useState<HelperProfile[]>([]);
  const [vehicles, setVehicles] = useState<TruckVehicle[]>([]);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [clients, setClients] = useState<ClientShipper[]>([]);
  const [ports, setPorts] = useState<RoroPort[]>([]);
  const [routes, setRoutes] = useState<RoroRoute[]>([]);
  const [destinations, setDestinations] = useState<DropoffDestination[]>([]);
  const [receipts, setReceipts] = useState<WaybillReceipt[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fuelTopupLogs, setFuelTopupLogs] = useState<FuelTopupLog[]>([]);
  const [unitInspectionLogs, setUnitInspectionLogs] = useState<UnitInspectionLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);

  const handleAddFuelTopupLog = async (log: Omit<FuelTopupLog, "id">) => {
    const newLog: FuelTopupLog = {
      ...log,
      id: getNextSequentialId("TOP", fuelTopupLogs, 101),
    };
    setFuelTopupLogs((prev) => [newLog, ...prev]);

    // Automatically sync truck tank fuel balance in state
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === log.truckId) {
          const currentLiters = (v.currentFuelLiters || 0) + log.liters;
          const capacity = v.fuelCapacityLiters;
          const calculatedPercent = capacity && capacity > 0
            ? Math.min(100, Math.round((currentLiters / capacity) * 100))
            : v.currentFuelLevelPercent;
          return {
            ...v,
            currentFuelLiters: currentLiters,
            currentFuelLevelPercent: calculatedPercent,
          };
        }
        return v;
      })
    );

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.fuel_topup_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const hasOdometer = newLog.odometerKm !== null && newLog.odometerKm !== undefined && typeof newLog.odometerKm === "number" && !isNaN(newLog.odometerKm);

        const sql = isPg
          ? `INSERT INTO neutruck.fuel_topup_logs (
              id, truck_id, plate_number, topup_date, liters, cost_per_liter, total_cost,
              location, container_source, odometer_km, driver_name, waybill_number, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, ${hasOdometer ? "$10" : "NULL"}, $11, $12, $13
            ) ON CONFLICT (id) DO NOTHING`
          : `INSERT INTO fuel_topup_logs (
              id, truck_id, plate_number, topup_date, liters, cost_per_liter, total_cost,
              location, container_source, odometer_km, driver_name, waybill_number, notes
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            ) ON CONFLICT (id) DO NOTHING`;

        const binds = [
          String(newLog.id),
          String(newLog.truckId),
          String(newLog.plateNumber),
          String(newLog.topupDate),
          Number(newLog.liters) || 0,
          Number(newLog.costPerLiter) || 0,
          Number(newLog.totalCost) || 0,
          newLog.location ? String(newLog.location) : "",
          newLog.containerSource ? String(newLog.containerSource) : "",
          ...(hasOdometer ? [Number(newLog.odometerKm)] : [null]),
          newLog.driverName ? String(newLog.driverName) : "",
          newLog.waybillNumber ? String(newLog.waybillNumber) : "",
          newLog.notes ? String(newLog.notes) : "",
        ];

        await db.execute(sql, binds);

        // Sync vehicle fuel levels in database
        const vTarget = vehicles.find((v) => v.id === log.truckId);
        if (vTarget) {
          const currentLiters = (vTarget.currentFuelLiters || 0) + log.liters;
          const capacity = vTarget.fuelCapacityLiters;
          const calculatedPercent = capacity && capacity > 0
            ? Math.min(100, Math.round((currentLiters / capacity) * 100))
            : vTarget.currentFuelLevelPercent;

          const updateVehSql = isPg
            ? "UPDATE neutruck.truck_vehicles SET current_fuel_liters = $1, current_fuel_level_percent = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3"
            : "UPDATE truck_vehicles SET current_fuel_liters = ?, current_fuel_level_percent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";

          await db.execute(updateVehSql, [currentLiters, calculatedPercent, log.truckId]);
        }
        console.log(`[DB SUCCESS]: Saved fuel log ${newLog.id} to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save fuel topup log:", err);
        showAlert(`Failed to save fuel topup log to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateFuelTopupLog = async (updatedLog: FuelTopupLog) => {
    setFuelTopupLogs((prev) => prev.map((l) => (l.id === updatedLog.id ? updatedLog : l)));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.fuel_topup_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const hasOdometer = updatedLog.odometerKm !== null && updatedLog.odometerKm !== undefined && typeof updatedLog.odometerKm === "number" && !isNaN(updatedLog.odometerKm);

        const sql = isPg
          ? `UPDATE neutruck.fuel_topup_logs SET
              truck_id = $1, plate_number = $2, topup_date = $3, liters = $4, cost_per_liter = $5,
              total_cost = $6, location = $7, container_source = $8, odometer_km = ${hasOdometer ? "$9" : "NULL"}, driver_name = $10,
              waybill_number = $11, notes = $12
            WHERE id = $13`
          : `UPDATE fuel_topup_logs SET
              truck_id = ?, plate_number = ?, topup_date = ?, liters = ?, cost_per_liter = ?,
              total_cost = ?, location = ?, container_source = ?, odometer_km = ?, driver_name = ?,
              waybill_number = ?, notes = ?
            WHERE id = ?`;

        const binds = [
          String(updatedLog.truckId),
          String(updatedLog.plateNumber),
          String(updatedLog.topupDate),
          Number(updatedLog.liters) || 0,
          Number(updatedLog.costPerLiter) || 0,
          Number(updatedLog.totalCost) || 0,
          updatedLog.location ? String(updatedLog.location) : "",
          updatedLog.containerSource ? String(updatedLog.containerSource) : "",
          ...(hasOdometer ? [Number(updatedLog.odometerKm)] : [null]),
          updatedLog.driverName ? String(updatedLog.driverName) : "",
          updatedLog.waybillNumber ? String(updatedLog.waybillNumber) : "",
          updatedLog.notes ? String(updatedLog.notes) : "",
          String(updatedLog.id),
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated fuel log ${updatedLog.id} in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update fuel topup log:", err);
        showAlert(`Failed to update fuel log in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteFuelTopupLog = async (id: string) => {
    setFuelTopupLogs((prev) => prev.filter((l) => l.id !== id));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.fuel_topup_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.fuel_topup_logs WHERE id = $1"
          : "DELETE FROM fuel_topup_logs WHERE id = ?";

        await db.execute(sql, [id]);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete fuel topup log:", err);
      }
    }
  };

  const handleAddInspectionLog = async (log: Omit<UnitInspectionLog, "id">) => {
    const newLog: UnitInspectionLog = {
      ...log,
      id: getNextSequentialId("INSP", unitInspectionLogs, 101),
    };
    setUnitInspectionLogs((prev) => [newLog, ...prev]);
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.unit_inspection_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const hasOdometer = newLog.odometerKm !== null && newLog.odometerKm !== undefined && typeof newLog.odometerKm === "number" && !isNaN(newLog.odometerKm);

        const sql = isPg
          ? `INSERT INTO neutruck.unit_inspection_logs (
              id, truck_id, plate_number, inspection_date, inspector_name, odometer_km, overall_status, checklist, notes
            ) VALUES (
              $1, $2, $3, $4, $5, ${hasOdometer ? "$6" : "NULL"}, $7, $8::jsonb, $9
            ) ON CONFLICT (id) DO NOTHING`
          : `INSERT INTO unit_inspection_logs (
              id, truck_id, plate_number, inspection_date, inspector_name, odometer_km, overall_status, checklist, notes
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?
            ) ON CONFLICT (id) DO NOTHING`;

        const binds = [
          String(newLog.id),
          String(newLog.truckId),
          String(newLog.plateNumber),
          String(newLog.inspectionDate),
          newLog.inspectorName ? String(newLog.inspectorName) : "",
          ...(hasOdometer ? [Number(newLog.odometerKm)] : [null]),
          String(newLog.overallStatus),
          JSON.stringify(newLog.checklist || {}),
          newLog.notes ? String(newLog.notes) : "",
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved inspection log ${newLog.id} to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save inspection log:", err);
        showAlert(`Failed to save inspection log to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateInspectionLog = async (updatedLog: UnitInspectionLog) => {
    setUnitInspectionLogs((prev) => prev.map((l) => (l.id === updatedLog.id ? updatedLog : l)));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.unit_inspection_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const hasOdometer = updatedLog.odometerKm !== null && updatedLog.odometerKm !== undefined && typeof updatedLog.odometerKm === "number" && !isNaN(updatedLog.odometerKm);

        const sql = isPg
          ? `UPDATE neutruck.unit_inspection_logs SET
              truck_id = $1, plate_number = $2, inspection_date = $3, inspector_name = $4,
              odometer_km = ${hasOdometer ? "$5" : "NULL"}, overall_status = $6, checklist = $7::jsonb, notes = $8
            WHERE id = $9`
          : `UPDATE unit_inspection_logs SET
              truck_id = ?, plate_number = ?, inspection_date = ?, inspector_name = ?,
              odometer_km = ?, overall_status = ?, checklist = ?, notes = ?
            WHERE id = ?`;

        const binds = [
          String(updatedLog.truckId),
          String(updatedLog.plateNumber),
          String(updatedLog.inspectionDate),
          updatedLog.inspectorName ? String(updatedLog.inspectorName) : "",
          ...(hasOdometer ? [Number(updatedLog.odometerKm)] : [null]),
          String(updatedLog.overallStatus),
          JSON.stringify(updatedLog.checklist || {}),
          updatedLog.notes ? String(updatedLog.notes) : "",
          String(updatedLog.id),
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated inspection log ${updatedLog.id} in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update inspection log:", err);
        showAlert(`Failed to update inspection log in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteInspectionLog = async (id: string) => {
    setUnitInspectionLogs((prev) => prev.filter((l) => l.id !== id));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.unit_inspection_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.unit_inspection_logs WHERE id = $1"
          : "DELETE FROM unit_inspection_logs WHERE id = ?";

        await db.execute(sql, [id]);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete inspection log:", err);
      }
    }
  };
  const [truckModels, setTruckModels] = useState<string[]>([]);

  // Sync handlers for database operations
  const handleAddTruckModel = async (modelName: string) => {
    setTruckModels((prev) => [...prev, modelName]);
    if (db) {
      await db.execute("INSERT INTO neutruck.truck_models (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [modelName]).catch(console.error);
    }
  };

  const handleUpdateTruckModel = async (oldName: string, newName: string) => {
    setTruckModels((prev) => prev.map((m) => (m === oldName ? newName : m)));
    setVehicles((prev) =>
      prev.map((v) => (v.modelType === oldName ? { ...v, modelType: newName } : v))
    );
    if (db) {
      await db.execute("UPDATE neutruck.truck_models SET name = $1 WHERE name = $2", [newName, oldName]).catch(console.error);
    }
  };

  const handleDeleteTruckModel = async (modelName: string) => {
    setTruckModels((prev) => prev.filter((m) => m !== modelName));
    if (db) {
      await db.execute("DELETE FROM neutruck.truck_models WHERE name = $1", [modelName]).catch(console.error);
    }
  };

  const handleAddDriver = (driver: Omit<DriverProfile, "id">) => {
    const newDriver: DriverProfile = {
      ...driver,
      id: getNextSequentialId("DRV", drivers, 101),
    };
    setDrivers((prev) => [...prev, newDriver]);
    if (db) {
      db.execute(
        `INSERT INTO neutruck.driver_profiles (id, name, phone, license_number, license_restriction, spouse_name, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, address, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, license_number = EXCLUDED.license_number`,
        [newDriver.id, newDriver.name, newDriver.phone, newDriver.licenseNumber || null, newDriver.licenseRestriction || null, newDriver.spouseName || null, newDriver.emergencyContactName || null, newDriver.emergencyContactPhone || null, newDriver.emergencyContactRelationship || null, newDriver.address || null, newDriver.status || 'Available', newDriver.notes || null]
      ).catch(console.error);
    }
  };

  const handleUpdateDriver = (updated: DriverProfile) => {
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    if (db) {
      db.execute(
        `UPDATE neutruck.driver_profiles SET name = $1, phone = $2, license_number = $3, license_restriction = $4, spouse_name = $5, emergency_contact_name = $6, emergency_contact_phone = $7, emergency_contact_relationship = $8, address = $9, status = $10, notes = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12`,
        [updated.name, updated.phone, updated.licenseNumber || null, updated.licenseRestriction || null, updated.spouseName || null, updated.emergencyContactName || null, updated.emergencyContactPhone || null, updated.emergencyContactRelationship || null, updated.address || null, updated.status || 'Available', updated.notes || null, updated.id]
      ).catch(console.error);
    }
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    if (db) {
      db.execute("DELETE FROM neutruck.driver_profiles WHERE id = $1", [id]).catch(console.error);
    }
  };

  const handleAddHelper = (helper: Omit<HelperProfile, "id">) => {
    const newHelper: HelperProfile = {
      ...helper,
      id: getNextSequentialId("HLP", helpers, 101),
    };
    setHelpers((prev) => [...prev, newHelper]);
    if (db) {
      db.execute(
        `INSERT INTO neutruck.helper_profiles (id, name, phone, license_number, license_restriction, spouse_name, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, address, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone`,
        [newHelper.id, newHelper.name, newHelper.phone, newHelper.licenseNumber || null, newHelper.licenseRestriction || null, newHelper.spouseName || null, newHelper.emergencyContactName || null, newHelper.emergencyContactPhone || null, newHelper.emergencyContactRelationship || null, newHelper.address || null, newHelper.status || 'Available', newHelper.notes || null]
      ).catch(console.error);
    }
  };

  const handleUpdateHelper = (updated: HelperProfile) => {
    setHelpers((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    if (db) {
      db.execute(
        `UPDATE neutruck.helper_profiles SET name = $1, phone = $2, license_number = $3, license_restriction = $4, spouse_name = $5, emergency_contact_name = $6, emergency_contact_phone = $7, emergency_contact_relationship = $8, address = $9, status = $10, notes = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12`,
        [updated.name, updated.phone, updated.licenseNumber || null, updated.licenseRestriction || null, updated.spouseName || null, updated.emergencyContactName || null, updated.emergencyContactPhone || null, updated.emergencyContactRelationship || null, updated.address || null, updated.status || 'Available', updated.notes || null, updated.id]
      ).catch(console.error);
    }
  };

  const handleDeleteHelper = (id: string) => {
    setHelpers((prev) => prev.filter((h) => h.id !== id));
    if (db) {
      db.execute("DELETE FROM neutruck.helper_profiles WHERE id = $1", [id]).catch(console.error);
    }
  };



  const handleSyncData = () => {
    try {
      const rawJobs = localStorage.getItem("neutruck_dispatch_jobs");
      if (rawJobs) setJobs(JSON.parse(rawJobs));
      const rawVehicles = localStorage.getItem("neutruck_fleet_vehicles");
      if (rawVehicles) setVehicles(JSON.parse(rawVehicles));
      const rawReceipts = localStorage.getItem("neutruck_waybill_receipts");
      if (rawReceipts) setReceipts(JSON.parse(rawReceipts));
      const rawClients = localStorage.getItem("neutruck_client_shippers");
      if (rawClients) setClients(JSON.parse(rawClients));
    } catch (err) {
      console.error("Multi-terminal sync error:", err);
    }
  };

  // Multi-Terminal Auto-Reload Sync Listener
  useEffect(() => {
    window.addEventListener("storage", handleSyncData);
    window.addEventListener("focus", handleSyncData);

    return () => {
      window.removeEventListener("storage", handleSyncData);
      window.removeEventListener("focus", handleSyncData);
    };
  }, []);

  const handleAddClient = async (client: Omit<ClientShipper, "id">) => {
    const isDuplicate = clients.some(
      (c) => c.companyName.trim().toLowerCase() === client.companyName.trim().toLowerCase()
    );
    if (isDuplicate) {
      showAlert(`A client shipper with the company name "${client.companyName.trim()}" already exists. Client company names must be unique.`, "Duplicate Client Name", "warning");
      return;
    }

    const newClient: ClientShipper = {
      ...client,
      id: getNextSequentialId("CLI", clients, 101),
    };

    setClients((prev) => {
      const updated = [...prev, newClient];
      localStorage.setItem("neutruck_client_shippers", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.client_shippers LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.client_shippers (
              id, company_name, contact_person, contact_phone, address, tin_number, billing_number,
              default_pickup_location, notes, statement_status, billing_statement_statuses,
              billing_columns, billing_additions, billing_history, default_weighing_fee
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15
            ) ON CONFLICT (id) DO UPDATE SET
              company_name = EXCLUDED.company_name, contact_person = EXCLUDED.contact_person, contact_phone = EXCLUDED.contact_phone,
              address = EXCLUDED.address, tin_number = EXCLUDED.tin_number, billing_number = EXCLUDED.billing_number,
              default_pickup_location = EXCLUDED.default_pickup_location, notes = EXCLUDED.notes, statement_status = EXCLUDED.statement_status,
              billing_statement_statuses = EXCLUDED.billing_statement_statuses, billing_columns = EXCLUDED.billing_columns,
              billing_additions = EXCLUDED.billing_additions, billing_history = EXCLUDED.billing_history,
              default_weighing_fee = EXCLUDED.default_weighing_fee`
          : `INSERT INTO client_shippers (
              id, company_name, contact_person, contact_phone, address, tin_number, billing_number,
              default_pickup_location, notes, statement_status, billing_statement_statuses,
              billing_columns, billing_additions, billing_history, default_weighing_fee
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            ) ON CONFLICT(id) DO UPDATE SET
              company_name = excluded.company_name, contact_person = excluded.contact_person, contact_phone = excluded.contact_phone,
              address = excluded.address, tin_number = excluded.tin_number, billing_number = excluded.billing_number,
              default_pickup_location = excluded.default_pickup_location, notes = excluded.notes, statement_status = excluded.statement_status,
              billing_statement_statuses = excluded.billing_statement_statuses, billing_columns = excluded.billing_columns,
              billing_additions = excluded.billing_additions, billing_history = excluded.billing_history,
              default_weighing_fee = excluded.default_weighing_fee`;

        const binds = [
          newClient.id,
          newClient.companyName,
          newClient.contactPerson || null,
          newClient.contactPhone || null,
          newClient.address || null,
          newClient.tinNumber || null,
          newClient.billingNumber || null,
          newClient.defaultPickupLocation || null,
          newClient.notes || null,
          newClient.statementStatus || "Draft",
          newClient.billingStatementStatuses ? JSON.stringify(newClient.billingStatementStatuses) : null,
          newClient.billingColumns ? JSON.stringify(newClient.billingColumns) : null,
          newClient.billingAdditions ? JSON.stringify(newClient.billingAdditions) : null,
          newClient.billingHistory ? JSON.stringify(newClient.billingHistory) : null,
          newClient.defaultWeighingFee || 0,
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved client shipper ${newClient.companyName} (${newClient.id}) to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save client shipper:", err);
        showAlert(`Failed to save client shipper ${newClient.companyName} to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteClient = async (id: string) => {
    setClients((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem("neutruck_client_shippers", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.client_shippers LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.client_shippers WHERE id = $1"
          : "DELETE FROM client_shippers WHERE id = ?";

        await db.execute(sql, [id]);
        console.log(`[DB SUCCESS]: Deleted client shipper ${id} from database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete client shipper:", err);
      }
    }
  };

  const handleUpdateClient = async (updated: ClientShipper) => {
    const isDuplicate = clients.some(
      (c) => c.companyName.trim().toLowerCase() === updated.companyName.trim().toLowerCase() && c.id !== updated.id
    );
    if (isDuplicate) {
      showAlert(`A client shipper with the company name "${updated.companyName.trim()}" already exists. Client company names must be unique.`, "Duplicate Client Name", "warning");
      return;
    }

    setClients((prev) => {
      const result = prev.map((c) => (c.id === updated.id ? updated : c));
      localStorage.setItem("neutruck_client_shippers", JSON.stringify(result));
      return result;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.client_shippers LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.client_shippers SET
              company_name = $1, contact_person = $2, contact_phone = $3, address = $4, tin_number = $5,
              billing_number = $6, default_pickup_location = $7, notes = $8, statement_status = $9,
              billing_statement_statuses = $10::jsonb, billing_columns = $11::jsonb,
              billing_additions = $12::jsonb, billing_history = $13::jsonb, default_weighing_fee = $14,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $15`
          : `UPDATE client_shippers SET
              company_name = ?, contact_person = ?, contact_phone = ?, address = ?, tin_number = ?,
              billing_number = ?, default_pickup_location = ?, notes = ?, statement_status = ?,
              billing_statement_statuses = ?, billing_columns = ?,
              billing_additions = ?, billing_history = ?, default_weighing_fee = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`;

        const binds = [
          updated.companyName,
          updated.contactPerson || null,
          updated.contactPhone || null,
          updated.address || null,
          updated.tinNumber || null,
          updated.billingNumber || null,
          updated.defaultPickupLocation || null,
          updated.notes || null,
          updated.statementStatus || "Draft",
          updated.billingStatementStatuses ? JSON.stringify(updated.billingStatementStatuses) : null,
          updated.billingColumns ? JSON.stringify(updated.billingColumns) : null,
          updated.billingAdditions ? JSON.stringify(updated.billingAdditions) : null,
          updated.billingHistory ? JSON.stringify(updated.billingHistory) : null,
          updated.defaultWeighingFee || 0,
          updated.id,
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated client shipper ${updated.companyName} (${updated.id}) in database.`);

        // Broadcast to TV Kiosks & Other Windows
        try {
          const channel = new BroadcastChannel("neutruck_kiosk_channel");
          channel.postMessage({ type: "DATA_UPDATED" });
          channel.close();
        } catch (_) {}
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update client shipper:", err);
        showAlert(`Failed to update client shipper ${updated.companyName} in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleAddPort = async (port: Omit<RoroPort, "id">) => {
    const newPort: RoroPort = {
      ...port,
      id: getNextSequentialId("PORT", ports, 101),
    };
    setPorts((prev) => {
      const updated = [...prev, newPort];
      localStorage.setItem("neutruck_roro_ports", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.roro_ports LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.roro_ports (id, port_name, province, island_group)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
               port_name = EXCLUDED.port_name, province = EXCLUDED.province, island_group = EXCLUDED.island_group`
          : `INSERT INTO roro_ports (id, port_name, province, island_group)
             VALUES (?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
               port_name = excluded.port_name, province = excluded.province, island_group = excluded.island_group`;

        const binds = [newPort.id, newPort.portName, newPort.province, newPort.islandGroup];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved RoRo port ${newPort.portName} (${newPort.id}) to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save RoRo port:", err);
        showAlert(`Failed to save RoRo port ${newPort.portName} to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdatePort = async (updated: RoroPort) => {
    setPorts((prev) => {
      const result = prev.map((p) => (p.id === updated.id ? updated : p));
      localStorage.setItem("neutruck_roro_ports", JSON.stringify(result));
      return result;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.roro_ports LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.roro_ports SET port_name = $1, province = $2, island_group = $3 WHERE id = $4`
          : `UPDATE roro_ports SET port_name = ?, province = ?, island_group = ? WHERE id = ?`;

        const binds = [updated.portName, updated.province, updated.islandGroup, updated.id];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated RoRo port ${updated.portName} (${updated.id}) in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update RoRo port:", err);
        showAlert(`Failed to update RoRo port in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeletePort = async (id: string) => {
    setPorts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem("neutruck_roro_ports", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.roro_ports LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.roro_ports WHERE id = $1"
          : "DELETE FROM roro_ports WHERE id = ?";

        await db.execute(sql, [id]);
        console.log(`[DB SUCCESS]: Deleted RoRo port ${id} from database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete RoRo port:", err);
      }
    }
  };

  const handleAddRoute = async (route: Omit<RoroRoute, "id">) => {
    const newRoute: RoroRoute = {
      ...route,
      id: getNextSequentialId("ROUTE", routes, 501),
    };
    setRoutes((prev) => {
      const updated = [...prev, newRoute];
      localStorage.setItem("neutruck_roro_routes", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.roro_routes LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.roro_routes (id, origin_port_name, destination_port_name, shipping_line, default_ticket_fee)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               origin_port_name = EXCLUDED.origin_port_name, destination_port_name = EXCLUDED.destination_port_name,
               shipping_line = EXCLUDED.shipping_line, default_ticket_fee = EXCLUDED.default_ticket_fee`
          : `INSERT INTO roro_routes (id, origin_port_name, destination_port_name, shipping_line, default_ticket_fee)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
               origin_port_name = excluded.origin_port_name, destination_port_name = excluded.destination_port_name,
               shipping_line = excluded.shipping_line, default_ticket_fee = excluded.default_ticket_fee`;

        const binds = [
          newRoute.id,
          newRoute.originPortName,
          newRoute.destinationPortName,
          newRoute.shippingLine,
          newRoute.defaultTicketFee || 0,
        ];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved RoRo route ${newRoute.id} to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save RoRo route:", err);
        showAlert(`Failed to save RoRo route to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateRoute = async (updated: RoroRoute) => {
    setRoutes((prev) => {
      const result = prev.map((r) => (r.id === updated.id ? updated : r));
      localStorage.setItem("neutruck_roro_routes", JSON.stringify(result));
      return result;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.roro_routes LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.roro_routes SET
              origin_port_name = $1, destination_port_name = $2, shipping_line = $3, default_ticket_fee = $4
            WHERE id = $5`
          : `UPDATE roro_routes SET
              origin_port_name = ?, destination_port_name = ?, shipping_line = ?, default_ticket_fee = ?
            WHERE id = ?`;

        const binds = [
          updated.originPortName,
          updated.destinationPortName,
          updated.shippingLine,
          updated.defaultTicketFee || 0,
          updated.id,
        ];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated RoRo route ${updated.id} in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update RoRo route:", err);
        showAlert(`Failed to update RoRo route in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteRoute = async (id: string) => {
    setRoutes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem("neutruck_roro_routes", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.roro_routes LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.roro_routes WHERE id = $1"
          : "DELETE FROM roro_routes WHERE id = ?";

        await db.execute(sql, [id]);
        console.log(`[DB SUCCESS]: Deleted RoRo route ${id} from database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete RoRo route:", err);
      }
    }
  };

  const handleAddDestination = async (destination: Omit<DropoffDestination, "id">) => {
    const newDest: DropoffDestination = {
      ...destination,
      id: getNextSequentialId("DEST", destinations, 101),
    };
    setDestinations((prev) => {
      const updated = [...prev, newDest];
      localStorage.setItem("neutruck_dropoff_destinations", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.dropoff_destinations LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.dropoff_destinations (id, hub_name, city_province, receiver_name, receiver_phone, default_freight_fee)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               hub_name = EXCLUDED.hub_name, city_province = EXCLUDED.city_province, receiver_name = EXCLUDED.receiver_name,
               receiver_phone = EXCLUDED.receiver_phone, default_freight_fee = EXCLUDED.default_freight_fee`
          : `INSERT INTO dropoff_destinations (id, hub_name, city_province, receiver_name, receiver_phone, default_freight_fee)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
               hub_name = excluded.hub_name, city_province = excluded.city_province, receiver_name = excluded.receiver_name,
               receiver_phone = excluded.receiver_phone, default_freight_fee = excluded.default_freight_fee`;

        const binds = [
          newDest.id,
          newDest.hubName,
          newDest.cityProvince,
          newDest.receiverName || null,
          newDest.receiverPhone || null,
          newDest.defaultFreightFee || 0,
        ];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved dropoff destination ${newDest.hubName} (${newDest.id}) to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save dropoff destination:", err);
        showAlert(`Failed to save destination to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateDestination = async (updated: DropoffDestination) => {
    setDestinations((prev) => {
      const result = prev.map((d) => (d.id === updated.id ? updated : d));
      localStorage.setItem("neutruck_dropoff_destinations", JSON.stringify(result));
      return result;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.dropoff_destinations LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.dropoff_destinations SET
              hub_name = $1, city_province = $2, receiver_name = $3, receiver_phone = $4, default_freight_fee = $5
            WHERE id = $6`
          : `UPDATE dropoff_destinations SET
              hub_name = ?, city_province = ?, receiver_name = ?, receiver_phone = ?, default_freight_fee = ?
            WHERE id = ?`;

        const binds = [
          updated.hubName,
          updated.cityProvince,
          updated.receiverName || null,
          updated.receiverPhone || null,
          updated.defaultFreightFee || 0,
          updated.id,
        ];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated destination ${updated.hubName} (${updated.id}) in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update destination:", err);
        showAlert(`Failed to update destination in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteDestination = async (id: string) => {
    setDestinations((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem("neutruck_dropoff_destinations", JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.dropoff_destinations LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.dropoff_destinations WHERE id = $1"
          : "DELETE FROM dropoff_destinations WHERE id = ?";

        await db.execute(sql, [id]);
        console.log(`[DB SUCCESS]: Deleted destination ${id} from database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete destination:", err);
      }
    }
  };

  // Auth Modals
  const [showLogin, setShowLogin] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [allowAddRecord, setAllowAddRecord] = useState<boolean>(true);

  // Verify license on mount (Web Edition: Active by default)
  useEffect(() => {
    async function verify() {
      try {
        setIsLicenseValid(true);
        const savedKey = localStorage.getItem("neutruck_license_key") || "";
        if (savedKey) {
          const fp = await invoke<string>("get_machine_fingerprint").catch(() => "web-instance");
          const res = await fetch("https://enterprise.neulify.com/api/licenses/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-App-Token": "neulify_desktop_app_secret_token_2026",
            },
            body: JSON.stringify({
              license_key: savedKey.trim(),
              machine_id: fp,
              app_name: "NeuTruck",
            }),
          }).catch(() => null);

          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.status === "success" && data.data) {
              setAllowAddRecord(data.data.allow_add_record ?? true);
            }
          }
        }
      } catch (err) {
        console.error("License verification error:", err);
      } finally {
        setIsLicenseValid(true);
        setCheckingLicense(false);
      }
    }
    verify();
  }, []);

  // Theme Restoration & DB Setup
  useEffect(() => {
    async function initApp() {
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
        }

        const savedBg = localStorage.getItem("neutruck_bg_image") || "";
        if (savedBg) {
          document.documentElement.style.setProperty("--custom-bg-image", `url('${savedBg}')`);
        }

        const configuredPath = await invoke<string>("get_current_db_path").catch(() => "trucking_logistics.db");
        // Convert postgresql:// to postgres:// if needed for tauri-plugin-sql URL parser
        let cleanPath = configuredPath.trim();
        if (cleanPath.startsWith("postgresql://")) {
          cleanPath = "postgres://" + cleanPath.substring("postgresql://".length);
        }
        if (cleanPath.includes("?")) {
          cleanPath = cleanPath.split("?")[0];
        }
        const dbTarget = (cleanPath.startsWith("postgres://"))
          ? cleanPath
          : cleanPath.startsWith("sqlite:")
            ? cleanPath
            : `sqlite:${cleanPath}`;

        let database: Database | null = null;
        try {
          database = await Database.load(dbTarget);
          setDb(database);
        } catch (dbLoadErr: any) {
          console.warn("Database.load failed for target:", dbTarget, dbLoadErr);
        }

        const isPg = dbTarget.startsWith("postgres://") || dbTarget.startsWith("postgresql://");

        // RBAC Tables Setup
        if (database && !isPg) {
          await database.execute(`
            CREATE TABLE IF NOT EXISTS roles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT UNIQUE NOT NULL,
              description TEXT
            );
          `);

          await database.execute(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              username TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              role_id INTEGER NOT NULL,
              is_active INTEGER DEFAULT 1,
              force_password_change INTEGER DEFAULT 0
            );
          `);

          await database.execute(`
            CREATE TABLE IF NOT EXISTS permissions (
              id TEXT PRIMARY KEY,
              module_name TEXT NOT NULL,
              action_name TEXT NOT NULL
            );
          `);

          await database.execute(`
            CREATE TABLE IF NOT EXISTS role_permissions (
              role_id INTEGER NOT NULL,
              permission_id TEXT NOT NULL,
              PRIMARY KEY (role_id, permission_id)
            );
          `);

          await database.execute("INSERT OR IGNORE INTO roles (id, name, description) VALUES (1, 'Administrator', 'Full System Access');");
          await database.execute("INSERT OR IGNORE INTO users (id, name, username, password_hash, role_id, is_active) VALUES (1, 'System Administrator', 'admin', 'password123', 1, 1);");

          await database.execute(`
            CREATE TABLE IF NOT EXISTS truck_models (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT UNIQUE NOT NULL
            );
          `);

          for (const m of INITIAL_TRUCK_MODELS) {
            await database.execute("INSERT OR IGNORE INTO truck_models (name) VALUES (?)", [m]);
          }
        }

        if (database) {
          // Fetch operational records and company profile from neutruck schema in parallel
          try {
            const schemaPrefix = isPg ? "neutruck." : "";

            // Ensure company_profile table exists in PostgreSQL / SQLite
            const createCompanyProfileSql = isPg
              ? `CREATE TABLE IF NOT EXISTS neutruck.company_profile (
                  id INTEGER PRIMARY KEY DEFAULT 1,
                  company_name TEXT,
                  company_tagline TEXT,
                  company_logo TEXT,
                  company_address TEXT,
                  company_phone TEXT,
                  sig_prepared_by TEXT,
                  sig_checked_by TEXT,
                  sig_approved_by TEXT,
                  sig_prepared_by_img TEXT,
                  sig_checked_by_img TEXT,
                  sig_approved_by_img TEXT,
                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )`
              : `CREATE TABLE IF NOT EXISTS company_profile (
                  id INTEGER PRIMARY KEY DEFAULT 1,
                  company_name TEXT,
                  company_tagline TEXT,
                  company_logo TEXT,
                  company_address TEXT,
                  company_phone TEXT,
                  sig_prepared_by TEXT,
                  sig_checked_by TEXT,
                  sig_approved_by TEXT,
                  sig_prepared_by_img TEXT,
                  sig_checked_by_img TEXT,
                  sig_approved_by_img TEXT,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;
            await database.execute(createCompanyProfileSql).catch(console.warn);

            const [
              dbModels,
              dbDrivers,
              dbHelpers,
              dbVehicles,
              dbJobs,
              dbClients,
              dbPorts,
              dbRoutes,
              dbDestinations,
              dbReceipts,
              dbMaintenance,
              dbFuel,
              dbInspection,
              dbProfile,
            ] = await Promise.all([
              database.select<any[]>(`SELECT name FROM ${schemaPrefix}truck_models ORDER BY id ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}driver_profiles ORDER BY name ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}helper_profiles ORDER BY name ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}truck_vehicles ORDER BY id ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}dispatch_jobs ORDER BY created_at DESC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}client_shippers ORDER BY company_name ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}roro_ports ORDER BY id ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}roro_routes ORDER BY id ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}dropoff_destinations ORDER BY id ASC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}waybill_receipts ORDER BY timestamp DESC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}maintenance_logs ORDER BY service_date DESC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}fuel_topup_logs ORDER BY topup_date DESC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}unit_inspection_logs ORDER BY inspection_date DESC`).catch(() => []),
              database.select<any[]>(`SELECT * FROM ${schemaPrefix}company_profile WHERE id = 1`).catch(() => []),
            ]);

            if (dbProfile && dbProfile.length > 0) {
              const prof = dbProfile[0];
              if (prof.company_name) {
                setCompanyName(prof.company_name);
                localStorage.setItem("neutruck_company_name", prof.company_name);
              }
              if (prof.company_tagline) {
                setCompanyTag(prof.company_tagline);
                localStorage.setItem("neutruck_company_tagline", prof.company_tagline);
              }
              if (prof.company_logo) {
                setCompanyLogo(prof.company_logo);
                localStorage.setItem("neutruck_company_logo", prof.company_logo);
              }
              if (prof.company_address) {
                setCompanyAddress(prof.company_address);
                localStorage.setItem("neutruck_company_address", prof.company_address);
              }
              if (prof.company_phone) {
                setCompanyPhone(prof.company_phone);
                localStorage.setItem("neutruck_company_phone", prof.company_phone);
              }
              if (prof.sig_prepared_by) setSigPreparedBy(prof.sig_prepared_by);
              if (prof.sig_checked_by) setSigCheckedBy(prof.sig_checked_by);
              if (prof.sig_approved_by) setSigApprovedBy(prof.sig_approved_by);
              if (prof.sig_prepared_by_img) setSigPreparedByImg(prof.sig_prepared_by_img);
              if (prof.sig_checked_by_img) setSigCheckedByImg(prof.sig_checked_by_img);
              if (prof.sig_approved_by_img) setSigApprovedByImg(prof.sig_approved_by_img);
            }

            if (dbModels) {
              if (dbModels.length > 0) {
                setTruckModels(dbModels.map((r) => r.name));
              } else {
                setTruckModels(INITIAL_TRUCK_MODELS);
                // Seed default truck models into DB asynchronously
                Promise.all(
                  INITIAL_TRUCK_MODELS.map((m) =>
                    isPg
                      ? database!.execute("INSERT INTO neutruck.truck_models (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [m]).catch(() => { })
                      : database!.execute("INSERT OR IGNORE INTO truck_models (name) VALUES (?)", [m]).catch(() => { })
                  )
                ).catch(() => { });
              }
            }

            if (dbDrivers) {
              setDrivers(dbDrivers.map((d) => ({
                id: d.id,
                name: d.name,
                phone: d.phone,
                licenseNumber: d.license_number || "",
                licenseRestriction: d.license_restriction || "",
                spouseName: d.spouse_name || "",
                emergencyContactName: d.emergency_contact_name || "",
                emergencyContactPhone: d.emergency_contact_phone || "",
                emergencyContactRelationship: d.emergency_contact_relationship || "",
                address: d.address || "",
                status: d.status || "Available",
                notes: d.notes || "",
              })));
            }

            if (dbHelpers) {
              setHelpers(dbHelpers.map((h) => ({
                id: h.id,
                name: h.name,
                phone: h.phone,
                licenseNumber: h.license_number || "",
                licenseRestriction: h.license_restriction || "",
                spouseName: h.spouse_name || "",
                emergencyContactName: h.emergency_contact_name || "",
                emergencyContactPhone: h.emergency_contact_phone || "",
                emergencyContactRelationship: h.emergency_contact_relationship || "",
                address: h.address || "",
                status: h.status || "Available",
                notes: h.notes || "",
              })));
            }

            if (dbVehicles) {
              setVehicles(dbVehicles.map((v) => ({
                id: v.id,
                plateNumber: v.plate_number,
                modelType: v.model_type,
                capacityTons: Number(v.capacity_tons || 0),
                defaultDriverId: v.default_driver_id || undefined,
                driverName: v.driver_name || "",
                driverPhone: v.driver_phone || "",
                helperName: v.helper_name || "",
                helperPhone: v.helper_phone || "",
                gpsTrackingUrl: v.gps_tracking_url || undefined,
                gpsAuthToken: v.gps_auth_token || undefined,
                gpsAutoSync: Boolean(v.gps_auto_sync),
                status: v.status || "Available",
                isArchived: Boolean(v.is_archived),
                decommissionReason: v.decommission_reason || undefined,
                fuelCapacityLiters: Number(v.fuel_capacity_liters || 300),
                currentFuelLevelPercent: Number(v.current_fuel_level_percent || 100),
                currentFuelLiters: Number(v.current_fuel_liters || 300),
                fuelCardNumber: v.fuel_card_number || undefined,
              })));
            }

            if (dbJobs) {
              setJobs(dbJobs.map((j) => ({
                id: j.id,
                waybillNumber: j.waybill_number,
                clientName: j.client_name,
                clientPhone: j.client_phone || "",
                pickupLocation: j.pickup_location,
                dropoffLocation: j.dropoff_location,
                cargoDescription: j.cargo_description,
                weightTons: Number(j.weight_tons || 0),
                vanSize: j.van_size || undefined,
                truckId: j.truck_id || "",
                truckPlate: j.truck_plate,
                driverName: j.driver_name,
                driverPhone: j.driver_phone || "",
                helperName: j.helper_name || "",
                helperPhone: j.helper_phone || "",
                helperCommission: Number(j.helper_commission || 0),
                dispatchDate: j.dispatch_date,
                deliveryStatus: j.delivery_status || "Pending",
                freightFee: Number(j.freight_fee || 0),
                freightBillingTerms: j.freight_billing_terms || undefined,
                loadStatus: j.load_status || "Loaded",
                fuelAllowance: Number(j.fuel_allowance || 0),
                driverRate: Number(j.driver_rate || 0),
                containerNumber: j.container_number || undefined,
                trailerNumber: j.trailer_number || undefined,
                sealNumber: j.seal_number || undefined,
                containerMovement: typeof j.container_movement === "string" ? JSON.parse(j.container_movement) : j.container_movement || undefined,
                truckUnitChecklist: typeof j.truck_unit_checklist === "string" ? JSON.parse(j.truck_unit_checklist) : j.truck_unit_checklist || undefined,
                fuelManagement: typeof j.fuel_management === "string" ? JSON.parse(j.fuel_management) : j.fuel_management || undefined,
                isInterIsland: Boolean(j.is_inter_island),
                roroRoute: j.roro_route || undefined,
                roroTicketFee: Number(j.roro_ticket_fee || 0),
                shippingLine: j.shipping_line || undefined,
                roroLegs: typeof j.roro_legs === "string" ? JSON.parse(j.roro_legs) : j.roro_legs || undefined,
                hasReturnTrip: Boolean(j.has_return_trip),
                returnDestination: j.return_destination || undefined,
                returnCargoType: j.return_cargo_type || undefined,
                returnPayer: j.return_payer || undefined,
                returnFreightFee: Number(j.return_freight_fee || 0),
                returnFuelAllowance: Number(j.return_fuel_allowance || 0),
                returnRoroTicketFee: Number(j.return_roro_ticket_fee || 0),
                returnRoroLegs: typeof j.return_roro_legs === "string" ? JSON.parse(j.return_roro_legs) : j.return_roro_legs || undefined,
                currentLocation: j.current_location || undefined,
                lastLocationUpdate: j.last_location_update || undefined,
                isArchived: Boolean(j.is_archived),
              })));
            }

            if (dbClients) {
              setClients(dbClients.map((c) => ({
                id: c.id,
                companyName: c.company_name,
                contactPerson: c.contact_person,
                contactPhone: c.contact_phone,
                address: c.address || "",
                tinNumber: c.tin_number || "",
                billingNumber: c.billing_number || "",
                defaultPickupLocation: c.default_pickup_location || "",
                notes: c.notes || "",
                statementStatus: c.statement_status || "Draft",
                billingStatementStatuses: typeof c.billing_statement_statuses === "string" ? JSON.parse(c.billing_statement_statuses) : c.billing_statement_statuses || undefined,
                billingColumns: typeof c.billing_columns === "string" ? JSON.parse(c.billing_columns) : c.billing_columns || undefined,
                billingAdditions: typeof c.billing_additions === "string" ? JSON.parse(c.billing_additions) : c.billing_additions || undefined,
                billingHistory: typeof c.billing_history === "string" ? JSON.parse(c.billing_history) : c.billing_history || undefined,
                defaultWeighingFee: Number(c.default_weighing_fee || 0),
              })));
            }

            if (dbPorts) {
              setPorts(dbPorts.map((p) => ({
                id: p.id,
                portName: p.port_name,
                province: p.province,
                islandGroup: p.island_group,
              })));
            }

            if (dbRoutes) {
              setRoutes(dbRoutes.map((r) => ({
                id: r.id,
                originPortName: r.origin_port_name,
                destinationPortName: r.destination_port_name,
                shippingLine: r.shipping_line,
                defaultTicketFee: Number(r.default_ticket_fee || 0),
              })));
            }

            if (dbDestinations) {
              setDestinations(dbDestinations.map((d) => ({
                id: d.id,
                hubName: d.hub_name,
                cityProvince: d.city_province,
                receiverName: d.receiver_name || "",
                receiverPhone: d.receiver_phone || "",
                defaultFreightFee: Number(d.default_freight_fee || 0),
              })));
            }

            if (dbReceipts) {
              setReceipts(dbReceipts.map((r) => ({
                id: r.id,
                jobId: r.job_id,
                waybillNumber: r.waybill_number,
                clientName: r.client_name,
                amountPaid: Number(r.amount_paid || 0),
                paymentMethod: r.payment_method || "Cash",
                paymentStatus: r.payment_status || "Pending",
                timestamp: r.timestamp,
              })));
            }

            if (dbMaintenance) {
              setMaintenanceLogs(dbMaintenance.map((m) => ({
                id: m.id,
                truckId: m.truck_id,
                plateNumber: m.plate_number,
                serviceType: m.service_type,
                cost: Number(m.cost || 0),
                serviceDate: m.service_date,
                odometerKm: Number(m.odometer_km || 0),
                notes: m.notes || "",
              })));
            }

            if (dbFuel) {
              setFuelTopupLogs(dbFuel.map((f) => ({
                id: f.id,
                truckId: f.truck_id,
                plateNumber: f.plate_number,
                topupDate: f.topup_date,
                liters: Number(f.liters || 0),
                costPerLiter: Number(f.cost_per_liter || 0),
                totalCost: Number(f.total_cost || 0),
                location: f.location,
                containerSource: f.container_source,
                odometerKm: f.odometer_km ? Number(f.odometer_km) : undefined,
                driverName: f.driver_name || "",
                waybillNumber: f.waybill_number || "",
                notes: f.notes || "",
              })));
            }

            if (dbInspection) {
              setUnitInspectionLogs(dbInspection.map((i) => ({
                id: i.id,
                truckId: i.truck_id,
                plateNumber: i.plate_number,
                inspectionDate: i.inspection_date,
                inspectorName: i.inspector_name || "",
                odometerKm: i.odometer_km ? Number(i.odometer_km) : undefined,
                overallStatus: i.overall_status as any,
                checklist: typeof i.checklist === "string" ? JSON.parse(i.checklist) : i.checklist,
                notes: i.notes || "",
              })));
            }
          } catch (fetchErr) {
            console.warn("Could not fetch operational records from PostgreSQL neutruck schema:", fetchErr);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }
    initApp();
  }, []);

  const sendSMSNotification = async (recipientName: string, recipientPhone: string, waybillNumber: string, message: string) => {
    if (!recipientPhone) return;

    const smsGateway = localStorage.getItem("neutruck_sms_gateway") || "semaphore";
    const semaphoreApiKey = localStorage.getItem("neutruck_semaphore_api_key") || "";
    const semaphoreSenderName = localStorage.getItem("neutruck_semaphore_sender_name") || "";
    const unismsApiKey = localStorage.getItem("neutruck_unisms_api_key") || "";
    const unismsSenderName = localStorage.getItem("neutruck_unisms_sender_name") || "";
    const philsmsToken = localStorage.getItem("neutruck_philsms_token") || "";
    const philsmsSenderName = localStorage.getItem("neutruck_philsms_sender_name") || "";
    const smsWebhookUrl = localStorage.getItem("neutruck_sms_webhook_url") || "";

    let status = "Failed";

    try {
      if (smsGateway === "semaphore" && semaphoreApiKey.trim()) {
        const params = new URLSearchParams();
        params.append("apikey", semaphoreApiKey.trim());
        params.append("number", recipientPhone);
        params.append("message", message);
        if (semaphoreSenderName.trim()) params.append("sendername", semaphoreSenderName.trim());

        const res = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", body: params });
        const data = await res.json();
        status = res.ok && Array.isArray(data) ? "Sent" : "Failed";
      } else if (smsGateway === "unisms" && unismsApiKey.trim()) {
        try {
          const res = await invoke<string>("send_unisms_sms", {
            apiKey: unismsApiKey.trim(),
            recipient: recipientPhone,
            content: message,
            senderId: unismsSenderName.trim() || null,
          });
          console.log("[UniSMS Dispatch Success]:", res);
          status = "Sent";
        } catch (err: any) {
          const errorText = typeof err === "string" ? err : err?.message || JSON.stringify(err);
          console.error("[UniSMS Dispatch Error]:", errorText);
          status = `Failed: ${errorText}`;
        }
      } else if (smsGateway === "philsms" && philsmsToken.trim()) {
        const res = await fetch("https://app.philsms.com/api/v3/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: philsmsToken.trim(), to: recipientPhone, message, from: philsmsSenderName.trim() || undefined }),
        });
        status = res.ok ? "Sent" : "Failed";
      } else if (smsGateway === "webhook" && smsWebhookUrl.trim()) {
        const res = await fetch(smsWebhookUrl.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(localStorage.getItem("neutruck_broadcast_driver") ? { driver: localStorage.getItem("neutruck_broadcast_driver") } : {}),
            channel_name: "neutruck-notifications",
            event_name: "shipment-status-update",
            to: recipientPhone,
            message,
            waybillNumber,
            recipientName
          }),
        });
        status = res.ok ? "Sent" : "Failed";
      }
    } catch (err: any) {
      status = `Failed: ${typeof err === "string" ? err : err?.message || "Unknown error"}`;
    }

    const newLog: SMSLog = {
      id: `SMS-${Date.now()}`,
      recipientName,
      recipientPhone,
      waybillNumber,
      message,
      status,
      timestamp: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }),
    };

    setSmsLogs((prev) => [newLog, ...prev]);
  };

  const handleDeleteSmsLog = (id: string) => {
    setSmsLogs((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAllSmsLogs = async () => {
    const confirmed = await showConfirm(
      "Are you sure you want to clear ALL SMS logs? This action cannot be undone.",
      "Clear SMS Logs",
      { confirmLabel: "Clear All", type: "danger" }
    );
    if (!confirmed) return;
    setSmsLogs([]);
  };

  // Broadcast helper to notify configured targets (Client Shipper + Dynamic Custom Recipients)
  const triggerSMSBroadcast = (clientName: string, clientPhone: string | undefined, waybillNumber: string, message: string) => {
    const notifyClient = localStorage.getItem("neutruck_sms_notify_client") !== "false";

    if (notifyClient && clientPhone) {
      sendSMSNotification(clientName, clientPhone, waybillNumber, message);
    }

    const rawRecipients = localStorage.getItem("neutruck_sms_custom_recipients");
    if (rawRecipients) {
      try {
        const recipients: SMSRecipientTarget[] = JSON.parse(rawRecipients);
        recipients.forEach((r) => {
          if (r.enabled && r.phone.trim()) {
            sendSMSNotification(r.name, r.phone.trim(), waybillNumber, `[${r.name.toUpperCase()} ALERT] ${message}`);
          }
        });
      } catch (e) {
        console.error("Failed to parse custom SMS recipients", e);
      }
    }
  };

  const handleAddJob = async (job: DispatchJob) => {
    setJobs((prev) => [job, ...prev]);
    // Set assigned vehicle to Reserved / Port Queueing / In Transit based on dispatch status
    const newTruckStatus: TruckVehicle["status"] =
      job.deliveryStatus === "Port Queueing" || job.deliveryStatus === "Onboard RoRo" || job.deliveryStatus === "In Transit"
        ? "In Transit"
        : "Reserved";

    setVehicles((prev) =>
      prev.map((v) => (v.id === job.truckId ? { ...v, status: newTruckStatus } : v))
    );

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.dispatch_jobs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.dispatch_jobs (
              id, waybill_number, client_name, client_phone, pickup_location, dropoff_location, cargo_description,
              weight_tons, van_size, truck_id, truck_plate, driver_name, driver_phone, helper_name, helper_phone,
              helper_commission, dispatch_date, delivery_status, freight_fee, freight_billing_terms, load_status,
              fuel_allowance, driver_rate, container_number, trailer_number, seal_number, container_movement,
              truck_unit_checklist, fuel_management, is_inter_island, roro_route, roro_ticket_fee, shipping_line,
              roro_legs, has_return_trip, return_destination, return_cargo_type, return_payer, return_freight_fee,
              return_fuel_allowance, return_roro_ticket_fee, return_roro_legs, current_location, last_location_update, is_archived
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
              $22, $23, $24, $25, $26, $27::jsonb, $28::jsonb, $29::jsonb, ($30 = 1), $31, $32, $33, $34::jsonb, ($35 = 1),
              $36, $37, $38, $39, $40, $41, $42::jsonb, $43, $44, ($45 = 1)
            ) ON CONFLICT (id) DO UPDATE SET delivery_status = EXCLUDED.delivery_status`
          : `INSERT INTO dispatch_jobs (
              id, waybill_number, client_name, client_phone, pickup_location, dropoff_location, cargo_description,
              weight_tons, van_size, truck_id, truck_plate, driver_name, driver_phone, helper_name, helper_phone,
              helper_commission, dispatch_date, delivery_status, freight_fee, freight_billing_terms, load_status,
              fuel_allowance, driver_rate, container_number, trailer_number, seal_number, container_movement,
              truck_unit_checklist, fuel_management, is_inter_island, roro_route, roro_ticket_fee, shipping_line,
              roro_legs, has_return_trip, return_destination, return_cargo_type, return_payer, return_freight_fee,
              return_fuel_allowance, return_roro_ticket_fee, return_roro_legs, current_location, last_location_update, is_archived
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?
            ) ON CONFLICT(id) DO UPDATE SET delivery_status = excluded.delivery_status`;

        const binds = [
          job.id, job.waybillNumber, job.clientName, job.clientPhone || null, job.pickupLocation, job.dropoffLocation, job.cargoDescription,
          job.weightTons || 0, job.vanSize || null, job.truckId || null, job.truckPlate, job.driverName, job.driverPhone || null, job.helperName || null, job.helperPhone || null,
          job.helperCommission || 0, job.dispatchDate, job.deliveryStatus || 'Pending', job.freightFee || 0, job.freightBillingTerms || null, job.loadStatus || 'Loaded',
          job.fuelAllowance || 0, job.driverRate || 0, job.containerNumber || null, job.trailerNumber || null, job.sealNumber || null,
          job.containerMovement ? JSON.stringify(job.containerMovement) : null,
          job.truckUnitChecklist ? JSON.stringify(job.truckUnitChecklist) : null,
          job.fuelManagement ? JSON.stringify(job.fuelManagement) : null,
          job.isInterIsland ? 1 : 0,
          job.roroRoute || null, job.roroTicketFee || 0, job.shippingLine || null,
          job.roroLegs ? JSON.stringify(job.roroLegs) : null,
          job.hasReturnTrip ? 1 : 0,
          job.returnDestination || null, job.returnCargoType || null, job.returnPayer || null, job.returnFreightFee || 0,
          job.returnFuelAllowance || 0, job.returnRoroTicketFee || 0,
          job.returnRoroLegs ? JSON.stringify(job.returnRoroLegs) : null,
          job.currentLocation || null, job.lastLocationUpdate || null, job.isArchived ? 1 : 0
        ];

        await db.execute(sql, binds);

        const updateVehSql = isPg
          ? "UPDATE neutruck.truck_vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2"
          : "UPDATE truck_vehicles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        await db.execute(updateVehSql, [newTruckStatus, job.truckId]);
        console.log(`[DB SUCCESS]: Saved dispatch job ${job.waybillNumber} (${job.id}) to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save dispatch job:", err);
        showAlert(`Failed to save dispatch job to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }

    // Send SMS dispatch notification to configured audience targets
    const msg = `Waybill ${job.waybillNumber} is DISPATCHED! Assigned Truck: ${job.truckPlate} (${job.driverName}). Route: ${job.pickupLocation} to ${job.dropoffLocation}.`;
    triggerSMSBroadcast(job.clientName, job.clientPhone, job.waybillNumber, msg);
  };

  const handleUpdateJob = async (updatedJob: DispatchJob) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === updatedJob.id) {
          // If truck was changed, restore old truck to Available if it has no active jobs
          if (j.truckId !== updatedJob.truckId) {
            setVehicles((vPrev) =>
              vPrev.map((v) => {
                if (v.id === j.truckId) return { ...v, status: "Available" };
                if (v.id === updatedJob.truckId) {
                  const newTruckStatus: TruckVehicle["status"] =
                    updatedJob.deliveryStatus === "Port Queueing" || updatedJob.deliveryStatus === "Onboard RoRo" || updatedJob.deliveryStatus === "In Transit"
                      ? "In Transit"
                      : "Reserved";
                  return { ...v, status: newTruckStatus };
                }
                return v;
              })
            );
          }
          return updatedJob;
        }
        return j;
      })
    );

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.dispatch_jobs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.dispatch_jobs SET
              waybill_number = $1, client_name = $2, client_phone = $3, pickup_location = $4, dropoff_location = $5,
              cargo_description = $6, weight_tons = $7, van_size = $8, truck_id = $9, truck_plate = $10,
              driver_name = $11, driver_phone = $12, helper_name = $13, helper_phone = $14, helper_commission = $15,
              dispatch_date = $16, delivery_status = $17, freight_fee = $18, freight_billing_terms = $19, load_status = $20,
              fuel_allowance = $21, driver_rate = $22, container_number = $23, trailer_number = $24, seal_number = $25,
              container_movement = $26::jsonb, truck_unit_checklist = $27::jsonb, fuel_management = $28::jsonb, is_inter_island = ($29 = 1),
              roro_route = $30, roro_ticket_fee = $31, shipping_line = $32, roro_legs = $33::jsonb, has_return_trip = ($34 = 1),
              return_destination = $35, return_cargo_type = $36, return_payer = $37, return_freight_fee = $38,
              return_fuel_allowance = $39, return_roro_ticket_fee = $40, return_roro_legs = $41::jsonb, current_location = $42,
              last_location_update = $43, is_archived = ($44 = 1), updated_at = CURRENT_TIMESTAMP
            WHERE id = $45`
          : `UPDATE dispatch_jobs SET
              waybill_number = ?, client_name = ?, client_phone = ?, pickup_location = ?, dropoff_location = ?,
              cargo_description = ?, weight_tons = ?, van_size = ?, truck_id = ?, truck_plate = ?,
              driver_name = ?, driver_phone = ?, helper_name = ?, helper_phone = ?, helper_commission = ?,
              dispatch_date = ?, delivery_status = ?, freight_fee = ?, freight_billing_terms = ?, load_status = ?,
              fuel_allowance = ?, driver_rate = ?, container_number = ?, trailer_number = ?, seal_number = ?,
              container_movement = ?, truck_unit_checklist = ?, fuel_management = ?, is_inter_island = ?,
              roro_route = ?, roro_ticket_fee = ?, shipping_line = ?, roro_legs = ?, has_return_trip = ?,
              return_destination = ?, return_cargo_type = ?, return_payer = ?, return_freight_fee = ?,
              return_fuel_allowance = ?, return_roro_ticket_fee = ?, return_roro_legs = ?, current_location = ?,
              last_location_update = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`;

        const binds = [
          updatedJob.waybillNumber, updatedJob.clientName, updatedJob.clientPhone || null, updatedJob.pickupLocation, updatedJob.dropoffLocation,
          updatedJob.cargoDescription, updatedJob.weightTons || 0, updatedJob.vanSize || null, updatedJob.truckId || null, updatedJob.truckPlate,
          updatedJob.driverName, updatedJob.driverPhone || null, updatedJob.helperName || null, updatedJob.helperPhone || null, updatedJob.helperCommission || 0,
          updatedJob.dispatchDate, updatedJob.deliveryStatus || 'Pending', updatedJob.freightFee || 0, updatedJob.freightBillingTerms || null, updatedJob.loadStatus || 'Loaded',
          updatedJob.fuelAllowance || 0, updatedJob.driverRate || 0, updatedJob.containerNumber || null, updatedJob.trailerNumber || null, updatedJob.sealNumber || null,
          updatedJob.containerMovement ? JSON.stringify(updatedJob.containerMovement) : null,
          updatedJob.truckUnitChecklist ? JSON.stringify(updatedJob.truckUnitChecklist) : null,
          updatedJob.fuelManagement ? JSON.stringify(updatedJob.fuelManagement) : null,
          updatedJob.isInterIsland ? 1 : 0,
          updatedJob.roroRoute || null, updatedJob.roroTicketFee || 0, updatedJob.shippingLine || null,
          updatedJob.roroLegs ? JSON.stringify(updatedJob.roroLegs) : null,
          updatedJob.hasReturnTrip ? 1 : 0,
          updatedJob.returnDestination || null, updatedJob.returnCargoType || null, updatedJob.returnPayer || null, updatedJob.returnFreightFee || 0,
          updatedJob.returnFuelAllowance || 0, updatedJob.returnRoroTicketFee || 0,
          updatedJob.returnRoroLegs ? JSON.stringify(updatedJob.returnRoroLegs) : null,
          updatedJob.currentLocation || null, updatedJob.lastLocationUpdate || null, updatedJob.isArchived ? 1 : 0, updatedJob.id
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated dispatch job ${updatedJob.waybillNumber} (${updatedJob.id}) in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update dispatch job:", err);
        showAlert(`Failed to update dispatch job in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }

    const msg = `Waybill ${updatedJob.waybillNumber} dispatch details have been UPDATED. Client: ${updatedJob.clientName}, Truck: ${updatedJob.truckPlate}.`;
    triggerSMSBroadcast(updatedJob.clientName, updatedJob.clientPhone, updatedJob.waybillNumber, msg);
  };

  const handleUpdateJobStatus = async (id: string, status: DispatchJob["deliveryStatus"]) => {
    const targetJob = jobs.find((j) => j.id === id);
    if (!targetJob) return;

    // Sync truck status bidirectionally
    let newTruckStatus: TruckVehicle["status"] = "Available";
    if (status === "Dispatched") newTruckStatus = "Reserved";
    else if (status === "Port Queueing" || status === "Onboard RoRo" || status === "In Transit") newTruckStatus = "In Transit";
    else if (status === "Delivered" || status === "Cancelled") newTruckStatus = "Available";

    setVehicles((vPrev) =>
      vPrev.map((v) => (v.id === targetJob.truckId ? { ...v, status: newTruckStatus } : v))
    );

    // Trigger SMS update ONCE outside of the React state updater
    const msg = `Waybill ${targetJob.waybillNumber} status updated to: ${status.toUpperCase()}. Truck Plate: ${targetJob.truckPlate}. (${companyName})`;
    triggerSMSBroadcast(targetJob.clientName, targetJob.clientPhone, targetJob.waybillNumber, msg);

    const nowIso = new Date().toISOString().substring(0, 16);

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const movement = j.containerMovement || {};
        let updatedMovement = { ...movement };

        if ((status === "Port Queueing" || status === "Dispatched") && !updatedMovement.withdrawalDate) {
          updatedMovement.withdrawalDate = nowIso;
        } else if (status === "Returning / En Route Garage" && !updatedMovement.pullOutDate) {
          updatedMovement.pullOutDate = nowIso;
        } else if (status === "Delivered") {
          if (!updatedMovement.pullOutDate) updatedMovement.pullOutDate = nowIso;
          if (!updatedMovement.gateInDate) updatedMovement.gateInDate = nowIso;
        }

        const updatedJob = { ...j, deliveryStatus: status, containerMovement: updatedMovement };
        if (db) {
          db.execute(
            "UPDATE neutruck.dispatch_jobs SET delivery_status = $1, container_movement = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
            [status, JSON.stringify(updatedMovement), id]
          ).catch(console.error);
          db.execute("UPDATE neutruck.truck_vehicles SET status = $1 WHERE id = $2", [newTruckStatus, targetJob.truckId]).catch(console.error);
        }
        return updatedJob;
      })
    );
  };

  const handleUpdateJobLocation = async (id: string, currentLocation: string) => {
    const targetJob = jobs.find((j) => j.id === id);
    if (!targetJob) return;

    const timestamp = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
    const msg = `Location Update for Waybill ${targetJob.waybillNumber}: Truck ${targetJob.truckPlate} is at "${currentLocation}".`;
    triggerSMSBroadcast(targetJob.clientName, targetJob.clientPhone, targetJob.waybillNumber, msg);

    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, currentLocation, lastLocationUpdate: timestamp } : j))
    );

    if (db) {
      db.execute(
        "UPDATE neutruck.dispatch_jobs SET current_location = $1, last_location_update = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [currentLocation, timestamp, id]
      ).catch(console.error);
    }
  };

  const handleToggleArchiveJob = async (id: string) => {
    const target = jobs.find((j) => j.id === id);
    const nextArchived = target ? !target.isArchived : false;
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, isArchived: !j.isArchived } : j))
    );
    if (db) {
      db.execute(
        "UPDATE neutruck.dispatch_jobs SET is_archived = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [nextArchived ? 1 : 0, id]
      ).catch(console.error);
    }
  };

  const handleDeleteJob = async (id: string) => {
    const jobToDelete = jobs.find((j) => j.id === id);
    if (jobToDelete) {
      // Restore vehicle to Available if it was assigned to this job and has no other active jobs
      setVehicles((vPrev) =>
        vPrev.map((v) => (v.id === jobToDelete.truckId ? { ...v, status: "Available" } : v))
      );
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (db) {
      db.execute("DELETE FROM neutruck.dispatch_jobs WHERE id = $1", [id]).catch(console.error);
    }
  };

  const handleAddVehicle = async (vehicle: TruckVehicle) => {
    setVehicles((prev) => [...prev, vehicle]);
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.truck_vehicles LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.truck_vehicles (
              id, plate_number, model_type, capacity_tons, default_driver_id, driver_name, driver_phone,
              helper_name, helper_phone, gps_tracking_url, gps_auth_token, gps_auto_sync, status, is_archived,
              decommission_reason, fuel_capacity_liters, current_fuel_level_percent, current_fuel_liters, fuel_card_number
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ($12 = 1), $13, ($14 = 1), $15, $16, $17, $18, $19
            ) ON CONFLICT (id) DO UPDATE SET
              plate_number = EXCLUDED.plate_number, model_type = EXCLUDED.model_type, capacity_tons = EXCLUDED.capacity_tons,
              driver_name = EXCLUDED.driver_name, driver_phone = EXCLUDED.driver_phone, helper_name = EXCLUDED.helper_name,
              helper_phone = EXCLUDED.helper_phone, fuel_capacity_liters = EXCLUDED.fuel_capacity_liters,
              fuel_card_number = EXCLUDED.fuel_card_number, gps_tracking_url = EXCLUDED.gps_tracking_url`
          : `INSERT INTO truck_vehicles (
              id, plate_number, model_type, capacity_tons, default_driver_id, driver_name, driver_phone,
              helper_name, helper_phone, gps_tracking_url, gps_auth_token, gps_auto_sync, status, is_archived,
              decommission_reason, fuel_capacity_liters, current_fuel_level_percent, current_fuel_liters, fuel_card_number
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            ) ON CONFLICT(id) DO UPDATE SET
              plate_number = excluded.plate_number, model_type = excluded.model_type, capacity_tons = excluded.capacity_tons,
              driver_name = excluded.driver_name, driver_phone = excluded.driver_phone, helper_name = excluded.helper_name,
              helper_phone = excluded.helper_phone, fuel_capacity_liters = excluded.fuel_capacity_liters,
              fuel_card_number = excluded.fuel_card_number, gps_tracking_url = excluded.gps_tracking_url`;

        const binds = [
          vehicle.id,
          vehicle.plateNumber,
          vehicle.modelType,
          vehicle.capacityTons || 0,
          vehicle.defaultDriverId || null,
          vehicle.driverName || null,
          vehicle.driverPhone || null,
          vehicle.helperName || null,
          vehicle.helperPhone || null,
          vehicle.gpsTrackingUrl || null,
          vehicle.gpsAuthToken || null,
          vehicle.gpsAutoSync ? 1 : 0,
          vehicle.status || "Available",
          vehicle.isArchived ? 1 : 0,
          vehicle.decommissionReason || null,
          vehicle.fuelCapacityLiters || 300,
          vehicle.currentFuelLevelPercent ?? 100,
          vehicle.currentFuelLiters ?? 300,
          vehicle.fuelCardNumber || null,
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved vehicle ${vehicle.plateNumber} to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save vehicle:", err);
        showAlert(`Failed to save vehicle ${vehicle.plateNumber} to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateVehicle = async (updated: TruckVehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.truck_vehicles LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.truck_vehicles SET
              plate_number = $1, model_type = $2, capacity_tons = $3, default_driver_id = $4, driver_name = $5,
              driver_phone = $6, helper_name = $7, helper_phone = $8, gps_tracking_url = $9, gps_auth_token = $10,
              gps_auto_sync = ($11 = 1), status = $12, is_archived = ($13 = 1), decommission_reason = $14, fuel_capacity_liters = $15,
              current_fuel_level_percent = $16, current_fuel_liters = $17, fuel_card_number = $18, updated_at = CURRENT_TIMESTAMP
            WHERE id = $19`
          : `UPDATE truck_vehicles SET
              plate_number = ?, model_type = ?, capacity_tons = ?, default_driver_id = ?, driver_name = ?,
              driver_phone = ?, helper_name = ?, helper_phone = ?, gps_tracking_url = ?, gps_auth_token = ?,
              gps_auto_sync = ?, status = ?, is_archived = ?, decommission_reason = ?, fuel_capacity_liters = ?,
              current_fuel_level_percent = ?, current_fuel_liters = ?, fuel_card_number = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`;

        const binds = [
          updated.plateNumber,
          updated.modelType,
          updated.capacityTons || 0,
          updated.defaultDriverId || null,
          updated.driverName || null,
          updated.driverPhone || null,
          updated.helperName || null,
          updated.helperPhone || null,
          updated.gpsTrackingUrl || null,
          updated.gpsAuthToken || null,
          updated.gpsAutoSync ? 1 : 0,
          updated.status || "Available",
          updated.isArchived ? 1 : 0,
          updated.decommissionReason || null,
          updated.fuelCapacityLiters || 300,
          updated.currentFuelLevelPercent ?? 100,
          updated.currentFuelLiters ?? 300,
          updated.fuelCardNumber || null,
          updated.id,
        ];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated vehicle ${updated.plateNumber} in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update vehicle:", err);
        showAlert(`Failed to update vehicle ${updated.plateNumber} in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateVehicleStatus = async (id: string, status: TruckVehicle["status"]) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    if (db) {
      db.execute("UPDATE neutruck.truck_vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [status, id]).catch(console.error);
    }
    // If vehicle status changed to Available, cancel or update pending dispatches if needed
    if (status === "Maintenance") {
      // Flag warning on any active job assigned to this truck
      setJobs((jPrev) =>
        jPrev.map((j) => {
          if (j.truckId === id && (j.deliveryStatus === "Dispatched" || j.deliveryStatus === "Port Queueing")) {
            return { ...j, deliveryStatus: "Cancelled" as const };
          }
          return j;
        })
      );
    }
  };

  const handleDecommissionVehicle = async (id: string, reason?: string) => {
    const reasonText = reason || "Decommissioned / Written Off";
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: "Decommissioned" as const, isArchived: true, decommissionReason: reasonText }
          : v
      )
    );

    if (db) {
      db.execute(
        "UPDATE neutruck.truck_vehicles SET status = 'Decommissioned', is_archived = 1, decommission_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [reasonText, id]
      ).catch(console.error);
    }

    // Auto-cancel active dispatches for decommissioned truck
    setJobs((jPrev) =>
      jPrev.map((j) => {
        if (j.truckId === id && j.deliveryStatus !== "Delivered") {
          return { ...j, deliveryStatus: "Cancelled" as const };
        }
        return j;
      })
    );
  };

  const handleRestoreVehicle = async (id: string) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: "Available" as const, isArchived: false, decommissionReason: undefined }
          : v
      )
    );
    if (db) {
      db.execute(
        "UPDATE neutruck.truck_vehicles SET status = 'Available', is_archived = 0, decommission_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      ).catch(console.error);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    if (db) {
      db.execute("DELETE FROM neutruck.truck_vehicles WHERE id = $1", [id]).catch(console.error);
    }
  };

  const handleAddReceipt = async (receipt: WaybillReceipt) => {
    setReceipts((prev) => [receipt, ...prev]);

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.waybill_receipts LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.waybill_receipts (id, job_id, waybill_number, client_name, amount_paid, payment_method, payment_status, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               job_id = EXCLUDED.job_id, waybill_number = EXCLUDED.waybill_number, client_name = EXCLUDED.client_name,
               amount_paid = EXCLUDED.amount_paid, payment_method = EXCLUDED.payment_method, payment_status = EXCLUDED.payment_status,
               timestamp = EXCLUDED.timestamp`
          : `INSERT INTO waybill_receipts (id, job_id, waybill_number, client_name, amount_paid, payment_method, payment_status, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
               job_id = excluded.job_id, waybill_number = excluded.waybill_number, client_name = excluded.client_name,
               amount_paid = excluded.amount_paid, payment_method = excluded.payment_method, payment_status = excluded.payment_status,
               timestamp = excluded.timestamp`;

        const binds = [
          receipt.id,
          receipt.jobId,
          receipt.waybillNumber,
          receipt.clientName,
          receipt.amountPaid || 0,
          receipt.paymentMethod || "Cash",
          receipt.paymentStatus || "Paid",
          receipt.timestamp,
        ];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Saved waybill receipt ${receipt.id} to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save waybill receipt:", err);
        showAlert(`Failed to save receipt to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateReceipt = async (updated: WaybillReceipt) => {
    setReceipts((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.waybill_receipts LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.waybill_receipts SET
              job_id = $1, waybill_number = $2, client_name = $3, amount_paid = $4, payment_method = $5, payment_status = $6, timestamp = $7
            WHERE id = $8`
          : `UPDATE waybill_receipts SET
              job_id = ?, waybill_number = ?, client_name = ?, amount_paid = ?, payment_method = ?, payment_status = ?, timestamp = ?
            WHERE id = ?`;

        const binds = [
          updated.jobId,
          updated.waybillNumber,
          updated.clientName,
          updated.amountPaid || 0,
          updated.paymentMethod || "Cash",
          updated.paymentStatus || "Paid",
          updated.timestamp,
          updated.id,
        ];
        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated waybill receipt ${updated.id} in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update waybill receipt:", err);
        showAlert(`Failed to update receipt in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    setReceipts((prev) => prev.filter((r) => r.id !== id));

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.waybill_receipts LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.waybill_receipts WHERE id = $1"
          : "DELETE FROM waybill_receipts WHERE id = ?";

        await db.execute(sql, [id]);
        console.log(`[DB SUCCESS]: Deleted waybill receipt ${id} from database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete waybill receipt:", err);
      }
    }
  };

  const handleAddMaintenance = async (log: MaintenanceLog) => {
    setMaintenanceLogs((prev) => [log, ...prev]);
    setVehicles((prev) =>
      prev.map((v) => (v.id === log.truckId ? { ...v, status: "Maintenance" as const } : v))
    );
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.maintenance_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.maintenance_logs (
              id, truck_id, plate_number, service_date, service_type, cost, odometer_km, notes
            ) VALUES (
              $1, $2, $3, $4, $5, $6, ${log.odometerKm !== undefined && log.odometerKm !== null ? "$7" : "NULL"}, ${log.odometerKm !== undefined && log.odometerKm !== null ? "$8" : "$7"}
            ) ON CONFLICT (id) DO NOTHING`
          : `INSERT INTO maintenance_logs (
              id, truck_id, plate_number, service_date, service_type, cost, odometer_km, notes
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?
            ) ON CONFLICT (id) DO NOTHING`;

        const binds = log.odometerKm !== undefined && log.odometerKm !== null
          ? [log.id, log.truckId, log.plateNumber, log.serviceDate, log.serviceType, log.cost || 0, log.odometerKm, log.notes || null]
          : [log.id, log.truckId, log.plateNumber, log.serviceDate, log.serviceType, log.cost || 0, log.notes || null];

        await db.execute(sql, binds);

        // Update truck status in database to Maintenance
        const updateVehSql = isPg
          ? "UPDATE neutruck.truck_vehicles SET status = 'Maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = $1"
          : "UPDATE truck_vehicles SET status = 'Maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        await db.execute(updateVehSql, [log.truckId]);
        console.log(`[DB SUCCESS]: Saved maintenance log ${log.id} to database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save maintenance log:", err);
        showAlert(`Failed to save maintenance record to DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleUpdateMaintenance = async (updated: MaintenanceLog) => {
    setMaintenanceLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.maintenance_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `UPDATE neutruck.maintenance_logs SET
              truck_id = $1, plate_number = $2, service_date = $3, service_type = $4, cost = $5, odometer_km = ${updated.odometerKm !== undefined && updated.odometerKm !== null ? "$6" : "NULL"}, notes = ${updated.odometerKm !== undefined && updated.odometerKm !== null ? "$7" : "$6"}
            WHERE id = ${updated.odometerKm !== undefined && updated.odometerKm !== null ? "$8" : "$7"}`
          : `UPDATE maintenance_logs SET
              truck_id = ?, plate_number = ?, service_date = ?, service_type = ?, cost = ?, odometer_km = ?, notes = ?
            WHERE id = ?`;

        const binds = updated.odometerKm !== undefined && updated.odometerKm !== null
          ? [updated.truckId, updated.plateNumber, updated.serviceDate, updated.serviceType, updated.cost || 0, updated.odometerKm, updated.notes || null, updated.id]
          : [updated.truckId, updated.plateNumber, updated.serviceDate, updated.serviceType, updated.cost || 0, null, updated.notes || null, updated.id];

        await db.execute(sql, binds);
        console.log(`[DB SUCCESS]: Updated maintenance log ${updated.id} in database.`);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to update maintenance log:", err);
        showAlert(`Failed to update maintenance record in DB: ${err.message || String(err)}`, "Database Error", "danger");
      }
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    setMaintenanceLogs((prev) => prev.filter((l) => l.id !== id));
    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.maintenance_logs LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? "DELETE FROM neutruck.maintenance_logs WHERE id = $1"
          : "DELETE FROM maintenance_logs WHERE id = ?";

        await db.execute(sql, [id]);
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to delete maintenance log:", err);
      }
    }
  };

  const handleSaveProfile = async (
    name: string,
    tag: string,
    logo: string,
    address: string,
    phone: string,
    preparedBy: string,
    checkedBy: string,
    approvedBy: string,
    preparedByImg?: string,
    checkedByImg?: string,
    approvedByImg?: string
  ) => {
    setCompanyName(name);
    setCompanyTag(tag);
    setCompanyLogo(logo);
    setCompanyAddress(address);
    setCompanyPhone(phone);
    setSigPreparedBy(preparedBy);
    setSigCheckedBy(checkedBy);
    setSigApprovedBy(approvedBy);
    if (preparedByImg !== undefined) setSigPreparedByImg(preparedByImg);
    if (checkedByImg !== undefined) setSigCheckedByImg(checkedByImg);
    if (approvedByImg !== undefined) setSigApprovedByImg(approvedByImg);

    localStorage.setItem("neutruck_company_name", name);
    localStorage.setItem("neutruck_company_tagline", tag);
    localStorage.setItem("neutruck_company_logo", logo);
    localStorage.setItem("neutruck_company_address", address);
    localStorage.setItem("neutruck_company_phone", phone);
    localStorage.setItem("neutruck_sig_prepared_by", preparedBy);
    localStorage.setItem("neutruck_sig_checked_by", checkedBy);
    localStorage.setItem("neutruck_sig_approved_by", approvedBy);
    if (preparedByImg !== undefined) localStorage.setItem("neutruck_sig_prepared_by_img", preparedByImg);
    if (checkedByImg !== undefined) localStorage.setItem("neutruck_sig_checked_by_img", checkedByImg);
    if (approvedByImg !== undefined) localStorage.setItem("neutruck_sig_approved_by_img", approvedByImg);

    if (db) {
      try {
        const dbPath = String((db as any).path || (db as any).connection?.url || "");
        let isPg = dbPath.includes("postgres");
        if (!isPg) {
          try {
            await db.select("SELECT 1 FROM neutruck.company_profile LIMIT 1");
            isPg = true;
          } catch (_) {
            isPg = false;
          }
        }

        const sql = isPg
          ? `INSERT INTO neutruck.company_profile (
              id, company_name, company_tagline, company_logo, company_address, company_phone,
              sig_prepared_by, sig_checked_by, sig_approved_by,
              sig_prepared_by_img, sig_checked_by_img, sig_approved_by_img, updated_at
            ) VALUES (
              1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
            ) ON CONFLICT (id) DO UPDATE SET
              company_name = EXCLUDED.company_name,
              company_tagline = EXCLUDED.company_tagline,
              company_logo = EXCLUDED.company_logo,
              company_address = EXCLUDED.company_address,
              company_phone = EXCLUDED.company_phone,
              sig_prepared_by = EXCLUDED.sig_prepared_by,
              sig_checked_by = EXCLUDED.sig_checked_by,
              sig_approved_by = EXCLUDED.sig_approved_by,
              sig_prepared_by_img = EXCLUDED.sig_prepared_by_img,
              sig_checked_by_img = EXCLUDED.sig_checked_by_img,
              sig_approved_by_img = EXCLUDED.sig_approved_by_img,
              updated_at = CURRENT_TIMESTAMP`
          : `INSERT INTO company_profile (
              id, company_name, company_tagline, company_logo, company_address, company_phone,
              sig_prepared_by, sig_checked_by, sig_approved_by,
              sig_prepared_by_img, sig_checked_by_img, sig_approved_by_img, updated_at
            ) VALUES (
              1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
            ) ON CONFLICT (id) DO UPDATE SET
              company_name = excluded.company_name,
              company_tagline = excluded.company_tagline,
              company_logo = excluded.company_logo,
              company_address = excluded.address,
              company_phone = excluded.company_phone,
              sig_prepared_by = excluded.sig_prepared_by,
              sig_checked_by = excluded.sig_checked_by,
              sig_approved_by = excluded.sig_approved_by,
              sig_prepared_by_img = excluded.sig_prepared_by_img,
              sig_checked_by_img = excluded.sig_checked_by_img,
              sig_approved_by_img = excluded.sig_approved_by_img,
              updated_at = CURRENT_TIMESTAMP`;

        const binds = [
          name || "",
          tag || "",
          logo || "",
          address || "",
          phone || "",
          preparedBy || "",
          checkedBy || "",
          approvedBy || "",
          preparedByImg || "",
          checkedByImg || "",
          approvedByImg || "",
        ];

        await db.execute(sql, binds);
        console.log("[DB SUCCESS]: Saved company profile and signatures to database.");
      } catch (err: any) {
        console.error("[DB ERROR]: Failed to save company profile to DB:", err);
      }
    }
  };

  if (checkingLicense || loading) {
    const startupName = (companyName && companyName.trim()) || localStorage.getItem("neutruck_company_name") || "NeuTruck";
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e1a", color: "#00d4ff", fontFamily: "sans-serif" }}>
        <h2>🚛 Starting {startupName} Engine...</h2>
      </div>
    );
  }

  if (!isLicenseValid) {
    return <ActivationScreen onActivated={() => setIsLicenseValid(true)} />;
  }

  return (
    <AuthProvider>
      <AppContent
        db={db}
        companyName={companyName}
        companyTag={companyTag}
        companyLogo={companyLogo}
        companyAddress={companyAddress}
        companyPhone={companyPhone}
        sigPreparedBy={sigPreparedBy}
        sigCheckedBy={sigCheckedBy}
        sigApprovedBy={sigApprovedBy}
        sigPreparedByImg={sigPreparedByImg}
        sigCheckedByImg={sigCheckedByImg}
        sigApprovedByImg={sigApprovedByImg}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showLogin={showLogin}
        setShowLogin={setShowLogin}
        showChangePassword={showChangePassword}
        setShowChangePassword={setShowChangePassword}
        jobs={jobs}
        vehicles={vehicles}
        drivers={drivers}
        helpers={helpers}
        clients={clients}
        routes={routes}
        destinations={destinations}
        receipts={receipts}
        maintenanceLogs={maintenanceLogs}
        fuelTopupLogs={fuelTopupLogs}
        unitInspectionLogs={unitInspectionLogs}
        smsLogs={smsLogs}
        isLicenseValid={isLicenseValid}
        mapPrintableJob={mapPrintableJob}
        setMapPrintableJob={setMapPrintableJob}
        handleAddJob={handleAddJob}
        handleUpdateJob={handleUpdateJob}
        handleUpdateJobStatus={handleUpdateJobStatus}
        handleUpdateJobLocation={handleUpdateJobLocation}
        handleToggleArchiveJob={handleToggleArchiveJob}
        handleDeleteJob={handleDeleteJob}
        handleDeleteSmsLog={handleDeleteSmsLog}
        handleClearAllSmsLogs={handleClearAllSmsLogs}
        handleSyncData={handleSyncData}
        handleAddFuelTopupLog={handleAddFuelTopupLog}
        handleUpdateFuelTopupLog={handleUpdateFuelTopupLog}
        handleDeleteFuelTopupLog={handleDeleteFuelTopupLog}
        handleAddInspectionLog={handleAddInspectionLog}
        handleUpdateInspectionLog={handleUpdateInspectionLog}
        handleDeleteInspectionLog={handleDeleteInspectionLog}
        handleAddVehicle={handleAddVehicle}
        handleUpdateVehicle={handleUpdateVehicle}
        handleUpdateVehicleStatus={handleUpdateVehicleStatus}
        handleDecommissionVehicle={handleDecommissionVehicle}
        handleRestoreVehicle={handleRestoreVehicle}
        handleDeleteVehicle={handleDeleteVehicle}
        handleAddDriver={handleAddDriver}
        handleUpdateDriver={handleUpdateDriver}
        handleDeleteDriver={handleDeleteDriver}
        handleAddHelper={handleAddHelper}
        handleUpdateHelper={handleUpdateHelper}
        handleDeleteHelper={handleDeleteHelper}
        handleAddClient={handleAddClient}
        handleUpdateClient={handleUpdateClient}
        handleDeleteClient={handleDeleteClient}
        handleAddPort={handleAddPort}
        handleUpdatePort={handleUpdatePort}
        handleDeletePort={handleDeletePort}
        handleAddRoute={handleAddRoute}
        handleUpdateRoute={handleUpdateRoute}
        handleDeleteRoute={handleDeleteRoute}
        handleAddDestination={handleAddDestination}
        handleUpdateDestination={handleUpdateDestination}
        handleDeleteDestination={handleDeleteDestination}
        handleAddReceipt={handleAddReceipt}
        handleUpdateReceipt={handleUpdateReceipt}
        handleDeleteReceipt={handleDeleteReceipt}
        handleAddMaintenance={handleAddMaintenance}
        handleUpdateMaintenance={handleUpdateMaintenance}
        handleDeleteMaintenance={handleDeleteMaintenance}
        handleSaveProfile={handleSaveProfile}
        ports={ports}
        allowAddRecord={allowAddRecord}
        truckModels={truckModels}
        handleAddTruckModel={handleAddTruckModel}
        handleUpdateTruckModel={handleUpdateTruckModel}
        handleDeleteTruckModel={handleDeleteTruckModel}
      />
    </AuthProvider>
  );
}

function AppContent({
  db,
  companyName,
  companyTag,
  companyLogo,
  companyAddress,
  companyPhone,
  sigPreparedBy,
  sigCheckedBy,
  sigApprovedBy,
  sigPreparedByImg,
  sigCheckedByImg,
  sigApprovedByImg,
  activeTab,
  setActiveTab,
  showLogin,
  setShowLogin,
  showChangePassword,
  setShowChangePassword,
  jobs,
  vehicles,
  drivers,
  helpers,
  clients,
  routes,
  destinations,
  receipts,
  maintenanceLogs,
  fuelTopupLogs,
  unitInspectionLogs,
  smsLogs,
  isLicenseValid,
  mapPrintableJob,
  setMapPrintableJob,
  handleAddJob,
  handleUpdateJob,
  handleUpdateJobStatus,
  handleUpdateJobLocation,
  handleToggleArchiveJob,
  handleDeleteJob,
  handleDeleteSmsLog,
  handleClearAllSmsLogs,
  handleSyncData,
  handleAddFuelTopupLog,
  handleUpdateFuelTopupLog,
  handleDeleteFuelTopupLog,
  handleAddInspectionLog,
  handleUpdateInspectionLog,
  handleDeleteInspectionLog,
  handleAddVehicle,
  handleUpdateVehicle,
  handleUpdateVehicleStatus,
  handleDecommissionVehicle,
  handleRestoreVehicle,
  handleDeleteVehicle,
  handleAddDriver,
  handleUpdateDriver,
  handleDeleteDriver,
  handleAddHelper,
  handleUpdateHelper,
  handleDeleteHelper,
  handleAddClient,
  handleUpdateClient,
  handleDeleteClient,
  handleAddPort,
  handleUpdatePort,
  handleDeletePort,
  handleAddRoute,
  handleUpdateRoute,
  handleDeleteRoute,
  handleAddDestination,
  handleUpdateDestination,
  handleDeleteDestination,
  handleAddReceipt,
  handleUpdateReceipt,
  handleDeleteReceipt,
  handleAddMaintenance,
  handleUpdateMaintenance,
  handleDeleteMaintenance,
  handleSaveProfile,
  ports,
  allowAddRecord = true,
  truckModels,
  handleAddTruckModel,
  handleUpdateTruckModel,
  handleDeleteTruckModel,
}: any) {
  const { user } = useAuth();

  return (
    <div className="app-container">
      {showLogin && <UserLogin db={db} onClose={() => setShowLogin(false)} />}
      {showChangePassword && (
        <ChangePasswordModal
          db={db}
          onSuccess={() => setShowChangePassword(false)}
          onCancel={() => setShowChangePassword(false)}
        />
      )}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={companyName}
        companyTagline={companyTag}
        companyLogo={companyLogo}
        onOpenLogin={() => setShowLogin(true)}
        onOpenChangePassword={() => setShowChangePassword(true)}
      />

      <div className="main-content">
        {!user ? (
          activeTab === "settings" ? (
            <SettingsPage
              companyName={companyName}
              companyTag={companyTag}
              companyLogo={companyLogo}
              companyAddress={companyAddress}
              companyPhone={companyPhone}
              sigPreparedBy={sigPreparedBy}
              sigCheckedBy={sigCheckedBy}
              sigApprovedBy={sigApprovedBy}
              sigPreparedByImg={sigPreparedByImg}
              sigCheckedByImg={sigCheckedByImg}
              sigApprovedByImg={sigApprovedByImg}
              onSaveProfile={handleSaveProfile}
              db={db}
            />
          ) : (
            <GuestLandingPage />
          )
        ) : (
          <>
            {activeTab === "dispatch" && (
              <DispatchBoardPage
                jobs={jobs}
                vehicles={vehicles}
                drivers={drivers}
                helpers={helpers}
                clients={clients}
                roroRoutes={routes}
                destinations={destinations}
                companyName={companyName}
                companyLogo={companyLogo}
                allowAddRecord={allowAddRecord}
                onAddJob={handleAddJob}
                onUpdateJob={handleUpdateJob}
                onUpdateJobStatus={handleUpdateJobStatus}
                onUpdateJobLocation={handleUpdateJobLocation}
                onToggleArchiveJob={handleToggleArchiveJob}
                onDeleteJob={handleDeleteJob}
                onReloadData={handleSyncData}
                onOpenClientsPage={() => setActiveTab("clients")}
                onOpenRoroPage={() => setActiveTab("roro")}
                onOpenDestinationsPage={() => setActiveTab("destinations")}
              />
            )}
            {activeTab === "map" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>🗺️ Fleet Location Map &amp; Tracking</span>
                    </h2>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                      Fleet vehicle positions mapped based on inputted dispatch log locations via OpenStreetMap
                    </div>
                  </div>
                </div>
                <TrucksMapView
                  jobs={jobs.filter((j: any) => !j.isArchived)}
                  vehicles={vehicles}
                  onSyncGpsLocation={handleUpdateJobLocation}
                  onOpenLocationModal={(job: any) => {
                    const loc = prompt(`Log Checkpoint Position for ${job.waybillNumber} (${job.truckPlate}):`, job.currentLocation || "");
                    if (loc !== null) {
                      handleUpdateJobLocation(job.id, loc);
                    }
                  }}
                  onPrintJob={(job: any) => setMapPrintableJob(job)}
                />
              </div>
            )}
            {activeTab === "fleet" && (
              <FleetVehiclesPage
                vehicles={vehicles}
                drivers={drivers}
                helpers={helpers}
                jobs={jobs}
                maintenanceLogs={maintenanceLogs}
                isLicensedAndPaid={isLicenseValid}
                truckModels={truckModels}
                onAddVehicle={handleAddVehicle}
                onUpdateVehicle={handleUpdateVehicle}
                onUpdateStatus={handleUpdateVehicleStatus}
                onDecommission={handleDecommissionVehicle}
                onRestore={handleRestoreVehicle}
                onDeleteVehicle={handleDeleteVehicle}
                onAddTruckModel={handleAddTruckModel}
                onUpdateTruckModel={handleUpdateTruckModel}
                onDeleteTruckModel={handleDeleteTruckModel}
                onOpenFuelPage={() => setActiveTab("fuel")}
              />
            )}
            {activeTab === "fuel" && (
              <FuelManagementPage
                vehicles={vehicles}
                topupLogs={fuelTopupLogs}
                onAddTopupLog={handleAddFuelTopupLog}
                onUpdateTopupLog={handleUpdateFuelTopupLog}
                onDeleteTopupLog={handleDeleteFuelTopupLog}
              />
            )}
            {activeTab === "inspection" && (
              <UnitInspectionPage
                vehicles={vehicles}
                inspectionLogs={unitInspectionLogs}
                onAddInspectionLog={handleAddInspectionLog}
                onUpdateInspectionLog={handleUpdateInspectionLog}
                onDeleteInspectionLog={handleDeleteInspectionLog}
              />
            )}
            {activeTab === "drivers" && (
              <DriversPage
                drivers={drivers}
                onAddDriver={handleAddDriver}
                onUpdateDriver={handleUpdateDriver}
                onDeleteDriver={handleDeleteDriver}
              />
            )}
            {activeTab === "helpers" && (
              <HelpersPage
                helpers={helpers}
                onAddHelper={handleAddHelper}
                onUpdateHelper={handleUpdateHelper}
                onDeleteHelper={handleDeleteHelper}
              />
            )}

            {activeTab === "clients" && (
              <ClientShippersPage
                clients={clients}
                jobs={jobs}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
              />
            )}
            {activeTab === "roro" && (
              <RoroManagementPage
                ports={ports}
                routes={routes}
                onAddPort={handleAddPort}
                onUpdatePort={handleUpdatePort}
                onDeletePort={handleDeletePort}
                onAddRoute={handleAddRoute}
                onUpdateRoute={handleUpdateRoute}
                onDeleteRoute={handleDeleteRoute}
              />
            )}
            {activeTab === "destinations" && (
              <DropoffDestinationsPage
                destinations={destinations}
                jobs={jobs}
                onAddDestination={handleAddDestination}
                onUpdateDestination={handleUpdateDestination}
                onDeleteDestination={handleDeleteDestination}
              />
            )}
            {activeTab === "waybills" && (
              <WaybillsPage
                receipts={receipts}
                jobs={jobs}
                clients={clients}
                companyName={companyName}
                companyLogo={companyLogo}
                onAddReceipt={handleAddReceipt}
                onUpdateReceipt={handleUpdateReceipt}
                onDeleteReceipt={handleDeleteReceipt}
                onNavigateToStatement={() => setActiveTab("report-billing-statement")}
              />
            )}
            {activeTab === "maintenance" && (
              <MaintenancePage
                logs={maintenanceLogs}
                vehicles={vehicles}
                onAddLog={handleAddMaintenance}
                onUpdateLog={handleUpdateMaintenance}
                onDeleteLog={handleDeleteMaintenance}
              />
            )}
            {["reports", "report-daily-trip", "report-wingvan-trip", "report-billing-statement", "report-overdue-statement", "report-container", "report-financial", "report-utilization", "report-collectibles", "report-roro", "report-maintenance", "report-performance", "report-fuel-expense", "report-birada-payroll", "report-overall-expenses"].includes(activeTab) && (
              <ReportsPage
                jobs={jobs}
                vehicles={vehicles}
                receipts={receipts}
                maintenanceLogs={maintenanceLogs}
                topupLogs={fuelTopupLogs}
                inspectionLogs={unitInspectionLogs}
                clients={clients}
                companyName={companyName}
                companyLogo={companyLogo}
                companyAddress={companyAddress}
                companyPhone={companyPhone}
                sigPreparedBy={sigPreparedBy}
                sigCheckedBy={sigCheckedBy}
                sigApprovedBy={sigApprovedBy}
                sigPreparedByImg={sigPreparedByImg}
                sigCheckedByImg={sigCheckedByImg}
                sigApprovedByImg={sigApprovedByImg}
                onUpdateClient={handleUpdateClient}
                activeReport={
                  activeTab === "report-daily-trip"
                    ? "daily-trip"
                    : activeTab === "report-wingvan-trip"
                      ? "wingvan-trip"
                      : activeTab === "report-billing-statement"
                        ? "billing-statement"
                        : activeTab === "report-overdue-statement"
                          ? "overdue-statement"
                          : activeTab === "report-financial"
                            ? "financial"
                            : activeTab === "report-utilization"
                              ? "utilization"
                              : activeTab === "report-collectibles"
                                ? "collectibles"
                                : activeTab === "report-roro"
                                  ? "roro"
                                  : activeTab === "report-maintenance"
                                    ? "maintenance"
                                    : activeTab === "report-performance"
                                      ? "performance"
                                      : activeTab === "report-fuel-expense"
                                        ? "fuel-expense"
                                        : activeTab === "report-birada-payroll"
                                          ? "birada-payroll"
                                          : activeTab === "report-overall-expenses"
                                            ? "overall-expenses"
                                            : "container"
                }
                onNavigateToBillingStatement={() => setActiveTab("report-billing-statement")}
              />
            )}
            {activeTab === "report-tv-kiosk" && (
              <TVSlideshowKiosk
                jobs={jobs}
                vehicles={vehicles}
                receipts={receipts}
                maintenanceLogs={maintenanceLogs}
                topupLogs={fuelTopupLogs}
                inspectionLogs={unitInspectionLogs}
                companyName={companyName}
                companyLogo={companyLogo}
                onExitKiosk={() => setActiveTab("dispatch")}
              />
            )}
            {activeTab === "sms" && (
              <SMSConsole smsLogs={smsLogs} onDelete={handleDeleteSmsLog} onClearAll={handleClearAllSmsLogs} />
            )}
            {activeTab === "settings" && (
              <SettingsPage
                companyName={companyName}
                companyTag={companyTag}
                companyLogo={companyLogo}
                companyAddress={companyAddress}
                companyPhone={companyPhone}
                sigPreparedBy={sigPreparedBy}
                sigCheckedBy={sigCheckedBy}
                sigApprovedBy={sigApprovedBy}
                sigPreparedByImg={sigPreparedByImg}
                sigCheckedByImg={sigCheckedByImg}
                sigApprovedByImg={sigApprovedByImg}
                onSaveProfile={handleSaveProfile}
                db={db}
              />
            )}
          </>
        )}
      </div>

      {mapPrintableJob && (
        <PrintableWaybillModal
          job={mapPrintableJob}
          vehicle={vehicles.find((v: any) => v.id === mapPrintableJob.truckId || v.plateNumber === mapPrintableJob.truckPlate)}
          companyName={companyName}
          companyLogo={companyLogo}
          onClose={() => setMapPrintableJob(null)}
        />
      )}
    </div>
  );
}
