import { useState } from "react";
import { DispatchJob, TruckVehicle, ClientShipper, RoroRoute, DropoffDestination, DropoffStop, DriverProfile, HelperProfile } from "../types";

import { StepClient } from "./wizard/StepClient";
import { StepTruck } from "./wizard/StepTruck";
import { StepInspection } from "./wizard/StepInspection";
import { StepFuel } from "./wizard/StepFuel";
import { StepContainer } from "./wizard/StepContainer";
import { StepOrigin } from "./wizard/StepOrigin";
import { StepDropoff } from "./wizard/StepDropoff";
import { StepCargo } from "./wizard/StepCargo";
import { StepRoro } from "./wizard/StepRoro";
import { StepReturnTrip } from "./wizard/StepReturnTrip";
import { StepReview } from "./wizard/StepReview";
import { getAppNowString } from "../utils/dateUtils";

interface CreateDispatchWizardModalProps {
  initialJob?: DispatchJob;
  vehicles: TruckVehicle[];
  drivers?: DriverProfile[];
  helpers?: HelperProfile[];
  clients: ClientShipper[];
  roroRoutes?: RoroRoute[];
  destinations?: DropoffDestination[];
  onSubmit: (job: Omit<DispatchJob, "id"> & { id: string }) => Promise<void>;
  onSaveDraft?: (job: Omit<DispatchJob, "id"> & { id: string }) => Promise<void>;
  onClose: () => void;
  onOpenClientsPage?: () => void;
  onOpenRoroPage?: () => void;
  onOpenDestinationsPage?: () => void;
}

export default function CreateDispatchWizardModal({
  initialJob,
  vehicles,
  drivers = [],
  helpers = [],
  clients,
  roroRoutes = [],
  destinations = [],
  onSubmit,
  onSaveDraft,
  onClose,
  onOpenClientsPage: _onOpenClientsPage,
  onOpenRoroPage,
  onOpenDestinationsPage: _onOpenDestinationsPage,
}: CreateDispatchWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);

  const isEditing = !!initialJob;

  // Form State initialized with initialJob values if present
  const [clientName, setClientName] = useState(initialJob?.clientName || "");
  const [clientPhone, setClientPhone] = useState(initialJob?.clientPhone || "");
  const [waybillNumber, setWaybillNumber] = useState(initialJob?.waybillNumber || `WB-${Math.floor(10000 + Math.random() * 90000)}`);
  const [pickupLocation, setPickupLocation] = useState(initialJob?.pickupLocation || "");
  const [dropoffLocation, setDropoffLocation] = useState(initialJob?.dropoffLocation || "");
  const [dropoffStops, setDropoffStops] = useState<DropoffStop[]>(initialJob?.dropoffStops || []);
  const [cargoDescription, setCargoDescription] = useState(initialJob?.cargoDescription || "General Cargo");
  const [weightTons, setWeightTons] = useState<number | string>(initialJob?.weightTons ?? "");
  const [vanSize, setVanSize] = useState<string>(initialJob?.vanSize || "");
  const [loadStatus, setLoadStatus] = useState<"Loaded" | "Empty">(initialJob?.loadStatus || "Loaded");
  const [selectedTruckId, setSelectedTruckId] = useState(initialJob?.truckId || "");
  const [selectedDriverName, setSelectedDriverName] = useState(initialJob?.driverName || "");
  const [selectedDriverPhone, setSelectedDriverPhone] = useState(initialJob?.driverPhone || "");
  const [helperName, setHelperName] = useState(initialJob?.helperName || "");
  const [helperPhone, setHelperPhone] = useState(initialJob?.helperPhone || "");
  const [helperCommission, setHelperCommission] = useState<number | string>(initialJob?.helperCommission ?? 0);
  const [freightFee, setFreightFee] = useState<number | string>(initialJob?.freightFee ?? 0);
  const [freightBillingTerms, setFreightBillingTerms] = useState<"Per Metric Ton (W.MT)" | "Revenue Ton (W/M.MT)" | "Liner Terms / Discharge (L.D)" | "Free In / Liner Out (FLT)" | "Free In and Out (FIO)" | "FIOST" | "Per Trip Flat Rate" | "">(
    initialJob?.freightBillingTerms || ""
  );
  const [dispatchDate, setDispatchDate] = useState(() => {
    if (initialJob?.dispatchDate) {
      return initialJob.dispatchDate.replace("T", " ").substring(0, 16);
    }
    return getAppNowString();
  });
  const [fuelAllowance, setFuelAllowance] = useState<number | string>(initialJob?.fuelAllowance ?? 0);
  const [driverRate, setDriverRate] = useState<number | string>(initialJob?.driverRate ?? 0);

  // Equipment & Container Details
  const [containerNumber, setContainerNumber] = useState(initialJob?.containerNumber || "");
  const [trailerNumber, setTrailerNumber] = useState(initialJob?.trailerNumber || "");
  const [sealNumber, setSealNumber] = useState(initialJob?.sealNumber || "");

  // Pre-Trip Unit Safety Checklist Status
  const [enablePreTripInspection, setEnablePreTripInspection] = useState<boolean>(() => {
    if (initialJob?.truckUnitChecklist) {
      const c = initialJob.truckUnitChecklist;
      return c.battery === "OK" || c.lights === "OK" || c.oil === "OK" || c.water === "OK" || c.brakes === "OK" || c.airPressure === "OK" || c.gasFuel === "OK" || c.electrical === "OK" || c.tires === "OK" || c.selfDriverStatus === "OK";
    }
    return false;
  });
  const [checklistBattery, setChecklistBattery] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.battery || "Not Checked");
  const [checklistLights, setChecklistLights] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.lights || "Not Checked");
  const [checklistOil, setChecklistOil] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.oil || "Not Checked");
  const [checklistWater, setChecklistWater] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.water || "Not Checked");
  const [checklistBrakes, setChecklistBrakes] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.brakes || "Not Checked");
  const [checklistAirPressure, setChecklistAirPressure] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.airPressure || "Not Checked");
  const [checklistGasFuel, setChecklistGasFuel] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.gasFuel || "Not Checked");
  const [checklistElectrical, setChecklistElectrical] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.electrical || "Not Checked");
  const [checklistTires, setChecklistTires] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.tires || "Not Checked");
  const [checklistSelfDriver, setChecklistSelfDriver] = useState<"OK" | "Needs Attention" | "Not Checked">(initialJob?.truckUnitChecklist?.selfDriverStatus || "Not Checked");
  const [checklistNotes, setChecklistNotes] = useState(initialJob?.truckUnitChecklist?.checklistNotes || "");

  // Fuel Management Details
  const [trackTripFuel, setTrackTripFuel] = useState<boolean>(() => {
    if (initialJob?.fuelAllowance && initialJob.fuelAllowance > 0) return true;
    if (initialJob?.fuelManagement?.pricePerLiter || initialJob?.fuelManagement?.distanceKm) return true;
    return false;
  });
  const [initialFuelLevelPercent, setInitialFuelLevelPercent] = useState<number | string>(initialJob?.fuelManagement?.initialFuelLevelPercent ?? 0);
  const [initialLiters, setInitialLiters] = useState<number | string>(initialJob?.fuelManagement?.initialLiters ?? 0);
  const [addedFuelLiters, setAddedFuelLiters] = useState<number | string>("");
  const [fuelSource, setFuelSource] = useState<"Garage Dispenser" | "External Gas Station" | "Fuel Card / Voucher">("Garage Dispenser");
  const [fuelCardNumber, setFuelCardNumber] = useState(initialJob?.fuelManagement?.fuelCardNumber || "");
  const [pricePerLiter, setPricePerLiter] = useState<number | string>(initialJob?.fuelManagement?.pricePerLiter ?? "");
  const [distanceKm, setDistanceKm] = useState<number | string>(initialJob?.fuelManagement?.distanceKm ?? "");

  // RoRo Inter-Island States
  const [isInterIsland, setIsInterIsland] = useState<boolean>(initialJob?.isInterIsland ?? false);
  const [roroRoute, setRoroRoute] = useState<string>(() => {
    if (!initialJob?.roroRoute) return "";
    if (initialJob.roroRoute.includes("Ferry Legs")) {
      const match = initialJob.roroRoute.match(/\(([^)]+)\)/);
      if (match) return match[1].split("|")[0].trim();
    }
    return initialJob.roroRoute;
  });
  const [shippingLine, setShippingLine] = useState<string>(initialJob?.shippingLine || "");
  const [roroTicketFee, setRoroTicketFee] = useState<number>(initialJob?.roroTicketFee || 0);

  // Return Trip & Backhaul States
  const [hasReturnTrip, setHasReturnTrip] = useState<boolean>(initialJob?.hasReturnTrip ?? false);
  const [returnDestination, setReturnDestination] = useState<string>(initialJob?.returnDestination || "");
  const [returnCargoType, setReturnCargoType] = useState<"Empty Haul / Deadhead" | "Backhaul Cargo" | "Return Empty Pallets/Containers">(initialJob?.returnCargoType || "Empty Haul / Deadhead");
  const [returnPayer, setReturnPayer] = useState<"Shipper Paid Round-Trip" | "Backhaul Client Paid" | "Company Expense">(initialJob?.returnPayer || "Shipper Paid Round-Trip");
  const [returnFreightFee, setReturnFreightFee] = useState<number | string>(initialJob?.returnFreightFee ?? 0);
  const [returnFuelAllowance, setReturnFuelAllowance] = useState<number | string>(initialJob?.returnFuelAllowance ?? 0);
  const [returnRoroTicketFee, setReturnRoroTicketFee] = useState<number | string>(initialJob?.returnRoroTicketFee ?? 0);

  // Search filter states for Auto-Fill selectors
  const [clientSearch, setClientSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [roroSearch, setRoroSearch] = useState("");

  const validateCurrentStep = (stepToValidate: number): boolean => {
    setFormValidationError(null);

    if (stepToValidate === 1) {
      if (!clientName.trim()) {
        setFormValidationError("⚠️ Please enter or select a Client / Shipper / Consignee Name.");
        return false;
      }
      if (!waybillNumber.trim()) {
        setFormValidationError("⚠️ Waybill Ticket Number cannot be empty.");
        return false;
      }
    }

    if (stepToValidate === 2) {
      if (!selectedTruckId) {
        setFormValidationError("⚠️ Please select an available Fleet Truck Unit.");
        return false;
      }
      if (!selectedDriverName.trim()) {
        setFormValidationError("⚠️ Please enter or select an assigned Driver Name.");
        return false;
      }
    }

    if (stepToValidate === 3 && enablePreTripInspection) {
      const uncheckedItems = [
        checklistBattery === "Not Checked" && "Battery",
        checklistLights === "Not Checked" && "Lights",
        checklistOil === "Not Checked" && "Oil",
        checklistWater === "Not Checked" && "Water",
        checklistBrakes === "Not Checked" && "Brakes",
        checklistAirPressure === "Not Checked" && "Air Pressure",
        checklistGasFuel === "Not Checked" && "Gas / Fuel",
        checklistElectrical === "Not Checked" && "Electrical",
        checklistTires === "Not Checked" && "Tires",
        checklistSelfDriver === "Not Checked" && "Self / Driver",
      ].filter(Boolean);

      if (uncheckedItems.length > 0) {
        setFormValidationError(`⚠️ Pre-trip safety inspection incomplete: Please inspect all items (${uncheckedItems.length} remaining). Use "Mark All OK" if verified.`);
        return false;
      }
    }

    if (stepToValidate === 6) {
      if (!pickupLocation.trim()) {
        setFormValidationError("⚠️ Please specify the Pickup Origin Location.");
        return false;
      }
    }

    if (stepToValidate === 7) {
      if (dropoffStops.length > 0) {
        const emptyStops = dropoffStops.filter((s) => !s.locationName.trim());
        if (emptyStops.length > 0) {
          setFormValidationError("⚠️ All multi-stop waypoints must have a location name.");
          return false;
        }
        if (dropoffStops.length < 2) {
          setFormValidationError("⚠️ Multi-stop routing requires at least 2 delivery stops.");
          return false;
        }
      } else if (!dropoffLocation.trim()) {
        setFormValidationError("⚠️ Please specify the Primary Dropoff Destination.");
        return false;
      }
    }

    if (stepToValidate === 8) {
      if (Number(freightFee) <= 0 || isNaN(Number(freightFee))) {
        setFormValidationError("⚠️ Gross Freight Charge must be greater than ₱0.");
        return false;
      }
    }

    return true;
  };

  const enableInspectionStep = localStorage.getItem("neutruck_enable_inspection_step") !== "false";
  const enableFuelStep = localStorage.getItem("neutruck_enable_fuel_step") !== "false";
  const enableReturnTripStep = localStorage.getItem("neutruck_enable_return_trip_step") !== "false";

  const allSteps = [
    { num: 1, title: "Client & Waybill", badge: "Shipper / Consignee" },
    { num: 2, title: "Truck & Crew", badge: "Fleet" },
    ...(enableInspectionStep ? [{ num: 3, title: "Pre-Trip Inspection", badge: "Safety" }] : []),
    ...(enableFuelStep ? [{ num: 4, title: "Fuel & Tank", badge: "Energy" }] : []),
    { num: 5, title: "Container & Trailer", badge: "Equipment" },
    { num: 6, title: "Origin Pickup", badge: "Loading" },
    { num: 7, title: "Destination Dropoff", badge: "Routing" },
    { num: 8, title: "Cargo & Rates", badge: "Freight" },
    { num: 9, title: "RoRo Inter-Island", badge: "Ferry" },
    ...(enableReturnTripStep ? [{ num: 10, title: "Return Trip", badge: "Backhaul" }] : []),
    { num: 11, title: "Review & Issue", badge: "Confirm" },
  ];

  const handleNextStep = () => {
    if (validateCurrentStep(currentStep)) {
      const currentIndex = allSteps.findIndex((s) => s.num === currentStep);
      if (currentIndex >= 0 && currentIndex < allSteps.length - 1) {
        setCurrentStep(allSteps[currentIndex + 1].num);
      }
    }
  };

  const handlePrevStep = () => {
    setFormValidationError(null);
    const currentIndex = allSteps.findIndex((s) => s.num === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(allSteps[currentIndex - 1].num);
    }
  };

  const handleStepClick = (stepNum: number) => {
    if (stepNum < currentStep || validateCurrentStep(currentStep)) {
      setCurrentStep(stepNum);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep(currentStep)) return;

    const truckUnit = vehicles.find((v) => v.id === selectedTruckId);
    const resolvedTruckPlate = truckUnit?.plateNumber || "T-PENDING";

    const formattedRoroRouteStr = isInterIsland && roroRoute ? `${roroRoute}${shippingLine ? ` (${shippingLine})` : ""}` : undefined;

    const jobData: Omit<DispatchJob, "id"> & { id: string } = {
      id: initialJob?.id || `JOB-${Date.now()}`,
      waybillNumber,
      clientName,
      clientPhone,
      pickupLocation,
      dropoffLocation: dropoffStops.length > 0 ? dropoffStops.map((s) => s.locationName).join(" ➔ ") : dropoffLocation,
      dropoffStops: dropoffStops.length > 0 ? dropoffStops : undefined,
      cargoDescription,
      weightTons: weightTons !== "" ? Number(weightTons) : undefined,
      vanSize: vanSize || undefined,
      loadStatus,
      truckId: selectedTruckId,
      truckPlate: resolvedTruckPlate,
      driverName: selectedDriverName,
      driverPhone: selectedDriverPhone,
      helperName: helperName || undefined,
      helperPhone: helperPhone || undefined,
      helperCommission: Number(helperCommission) || 0,
      dispatchDate: dispatchDate || getAppNowString(),
      deliveryStatus: initialJob?.deliveryStatus || "Pending",
      freightFee: Number(freightFee) || 0,
      freightBillingTerms: freightBillingTerms || undefined,
      fuelAllowance: trackTripFuel ? Number(fuelAllowance) || 0 : 0,
      driverRate: Number(driverRate) || 0,
      containerNumber: containerNumber || undefined,
      trailerNumber: trailerNumber || undefined,
      sealNumber: sealNumber || undefined,
      truckUnitChecklist: {
        battery: checklistBattery,
        lights: checklistLights,
        oil: checklistOil,
        water: checklistWater,
        brakes: checklistBrakes,
        airPressure: checklistAirPressure,
        gasFuel: checklistGasFuel,
        electrical: checklistElectrical,
        tires: checklistTires,
        selfDriverStatus: checklistSelfDriver,
        checklistNotes: checklistNotes || undefined,
      },
      fuelManagement: trackTripFuel ? {
        initialFuelLevelPercent: Number(initialFuelLevelPercent) || 100,
        initialLiters: Number(initialLiters) || 200,
        fuelCardNumber: fuelCardNumber || undefined,
        pricePerLiter: pricePerLiter !== "" ? Number(pricePerLiter) : undefined,
        distanceKm: distanceKm !== "" ? Number(distanceKm) : undefined,
      } : undefined,
      isInterIsland,
      roroRoute: formattedRoroRouteStr,
      shippingLine: shippingLine || undefined,
      roroTicketFee: Number(roroTicketFee) || 0,
      hasReturnTrip,
      returnDestination: hasReturnTrip ? returnDestination : undefined,
      returnCargoType: hasReturnTrip ? returnCargoType : undefined,
      returnPayer: hasReturnTrip ? returnPayer : undefined,
      returnFreightFee: hasReturnTrip ? Number(returnFreightFee) : 0,
      returnFuelAllowance: hasReturnTrip ? Number(returnFuelAllowance) : 0,
      returnRoroTicketFee: hasReturnTrip ? Number(returnRoroTicketFee) : 0,
    };

    await onSubmit(jobData);
  };

  const handleSaveDraft = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const truckUnit = vehicles.find((v) => v.id === selectedTruckId);
    const resolvedTruckPlate = truckUnit?.plateNumber || (selectedTruckId ? "T-PENDING" : "UNASSIGNED");

    const formattedRoroRouteStr = isInterIsland && roroRoute ? `${roroRoute}${shippingLine ? ` (${shippingLine})` : ""}` : undefined;

    const draftJobData: Omit<DispatchJob, "id"> & { id: string } = {
      id: initialJob?.id || `JOB-${Date.now()}`,
      waybillNumber: waybillNumber || `WB-DRAFT-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: clientName.trim() || "Draft Client",
      clientPhone,
      pickupLocation: pickupLocation.trim() || "Pending Origin Location",
      dropoffLocation: dropoffStops.length > 0 ? dropoffStops.map((s) => s.locationName || "Stop").join(" ➔ ") : (dropoffLocation.trim() || "Pending Destination"),
      dropoffStops: dropoffStops.length > 0 ? dropoffStops : undefined,
      cargoDescription: cargoDescription || "General Cargo",
      weightTons: Number(weightTons) || 0,
      truckId: selectedTruckId || "",
      truckPlate: resolvedTruckPlate,
      driverName: selectedDriverName || "Unassigned Driver",
      driverPhone: selectedDriverPhone,
      helperName: helperName || undefined,
      helperPhone: helperPhone || undefined,
      helperCommission: Number(helperCommission) || 0,
      dispatchDate: dispatchDate || getAppNowString(),
      deliveryStatus: "Draft",
      freightFee: Number(freightFee) || 0,
      freightBillingTerms: freightBillingTerms || undefined,
      loadStatus: loadStatus,
      fuelAllowance: Number(fuelAllowance) || 0,
      driverRate: Number(driverRate) || 0,
      containerNumber: containerNumber || undefined,
      trailerNumber: trailerNumber || undefined,
      sealNumber: sealNumber || undefined,
      truckUnitChecklist: {
        battery: checklistBattery,
        lights: checklistLights,
        oil: checklistOil,
        water: checklistWater,
        brakes: checklistBrakes,
        airPressure: checklistAirPressure,
        gasFuel: checklistGasFuel,
        electrical: checklistElectrical,
        tires: checklistTires,
        selfDriverStatus: checklistSelfDriver,
        checklistNotes: checklistNotes || undefined,
      },
      fuelManagement: {
        initialFuelLevelPercent: Number(initialFuelLevelPercent) || 0,
        initialLiters: Number(initialLiters) || 0,
        fuelCardNumber: fuelCardNumber || undefined,
        pricePerLiter: pricePerLiter !== "" ? Number(pricePerLiter) : undefined,
        distanceKm: distanceKm !== "" ? Number(distanceKm) : undefined,
      },
      isInterIsland,
      roroRoute: formattedRoroRouteStr,
      shippingLine: shippingLine || undefined,
      roroTicketFee: Number(roroTicketFee) || 0,
      hasReturnTrip,
      returnDestination: hasReturnTrip ? returnDestination : undefined,
      returnCargoType: hasReturnTrip ? returnCargoType : undefined,
      returnPayer: hasReturnTrip ? returnPayer : undefined,
      returnFreightFee: hasReturnTrip ? Number(returnFreightFee) : 0,
      returnFuelAllowance: hasReturnTrip ? Number(returnFuelAllowance) : 0,
      returnRoroTicketFee: hasReturnTrip ? Number(returnRoroTicketFee) : 0,
    };

    if (onSaveDraft) {
      await onSaveDraft(draftJobData);
    } else {
      await onSubmit(draftJobData);
    }

    setDraftSavedMessage(`✅ Saved as Draft! (Waybill: ${draftJobData.waybillNumber})`);
    setTimeout(() => {
      setDraftSavedMessage(null);
    }, 4000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", background: "var(--bg-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ padding: "0.4rem 0.6rem", background: "var(--primary-alpha)", color: "var(--primary)", borderRadius: "10px", fontSize: "1.1rem", border: "1px solid var(--primary-border)" }}>🚛</span>
              {isEditing ? `Edit Dispatch Order ${initialJob.waybillNumber}` : "New Dispatch & Waybill Order Wizard"}
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.78rem", color: "var(--text-dim)" }}>Configure haulage route, container tracking, pre-trip safety checklist &amp; backhaul economics.</p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
          >
            ✕ Close
          </button>
        </div>

        {/* Modal Body with Left Sidebar Stepper & Right Main Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left Vertical Stepper Sidebar */}
          <div
            style={{
              width: "250px",
              minWidth: "250px",
              borderRight: "1px solid var(--border)",
              background: "var(--bg-main)",
              overflowY: "auto",
              padding: "1rem 0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            <div style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", padding: "0 0.5rem 0.5rem 0.5rem", borderBottom: "1px solid var(--border)", marginBottom: "0.25rem" }}>
              📋 Wizard Steps ({allSteps.findIndex((s) => s.num === currentStep) + 1}/{allSteps.length})
            </div>

            {allSteps.map((step, idx) => {
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => handleStepClick(step.num)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    width: "100%",
                    border: isActive ? "1px solid var(--primary-border)" : isDone ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid transparent",
                    borderLeft: isActive ? "3px solid var(--primary)" : isDone ? "3px solid var(--success)" : "1px solid transparent",
                    background: isActive ? "var(--primary-alpha)" : isDone ? "rgba(16, 185, 129, 0.08)" : "transparent",
                    color: isActive ? "var(--primary)" : isDone ? "var(--success)" : "var(--text-main)",
                  }}
                >
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      flexShrink: 0,
                      background: isActive ? "var(--primary)" : isDone ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      color: isActive ? "#000000" : isDone ? "var(--success)" : "var(--text-dim)",
                    }}
                  >
                    {isDone ? "✓" : idx + 1}
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "0.1rem" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{step.title}</span>
                    <span style={{ fontSize: "0.66rem", color: isActive ? "var(--primary)" : isDone ? "var(--success)" : "var(--text-dim)", fontWeight: 500 }}>
                      {step.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Main Content Panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", background: "var(--bg-card)" }}>
            {/* Draft Saved Success Notification Alert */}
            {draftSavedMessage && (
              <div style={{ padding: "0.75rem 1rem", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "10px", color: "#34d399", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{draftSavedMessage}</span>
                <button onClick={() => setDraftSavedMessage(null)} style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", fontWeight: "bold", marginLeft: "auto" }}>
                  ✕
                </button>
              </div>
            )}

            {/* Validation Warning Alert */}
            {formValidationError && (
              <div style={{ padding: "0.75rem 1rem", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "10px", color: "#fbbf24", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{formValidationError}</span>
                <button onClick={() => setFormValidationError(null)} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontWeight: "bold", marginLeft: "auto" }}>
                  ✕
                </button>
              </div>
            )}

            {/* Step Contents */}
            {currentStep === 1 && (
              <StepClient
                clientName={clientName}
                setClientName={setClientName}
                clientPhone={clientPhone}
                setClientPhone={setClientPhone}
                waybillNumber={waybillNumber}
                setWaybillNumber={setWaybillNumber}
                dispatchDate={dispatchDate}
                setDispatchDate={setDispatchDate}
                clientSearch={clientSearch}
                setClientSearch={setClientSearch}
                clients={clients}
              />
            )}

            {currentStep === 2 && (
              <StepTruck
                selectedTruckId={selectedTruckId}
                setSelectedTruckId={setSelectedTruckId}
                selectedDriverName={selectedDriverName}
                setSelectedDriverName={setSelectedDriverName}
                selectedDriverPhone={selectedDriverPhone}
                setSelectedDriverPhone={setSelectedDriverPhone}
                driverRate={driverRate}
                setDriverRate={setDriverRate}
                helperName={helperName}
                setHelperName={setHelperName}
                helperPhone={helperPhone}
                setHelperPhone={setHelperPhone}
                helperCommission={helperCommission}
                setHelperCommission={setHelperCommission}
                vehicles={vehicles}
                drivers={drivers}
                helpers={helpers}
              />
            )}

            {currentStep === 3 && (
              <StepInspection
                enablePreTripInspection={enablePreTripInspection}
                setEnablePreTripInspection={setEnablePreTripInspection}
                checklistBattery={checklistBattery}
                setChecklistBattery={setChecklistBattery}
                checklistLights={checklistLights}
                setChecklistLights={setChecklistLights}
                checklistOil={checklistOil}
                setChecklistOil={setChecklistOil}
                checklistWater={checklistWater}
                setChecklistWater={setChecklistWater}
                checklistBrakes={checklistBrakes}
                setChecklistBrakes={setChecklistBrakes}
                checklistAirPressure={checklistAirPressure}
                setChecklistAirPressure={setChecklistAirPressure}
                checklistGasFuel={checklistGasFuel}
                setChecklistGasFuel={setChecklistGasFuel}
                checklistElectrical={checklistElectrical}
                setChecklistElectrical={setChecklistElectrical}
                checklistTires={checklistTires}
                setChecklistTires={setChecklistTires}
                checklistSelfDriver={checklistSelfDriver}
                setChecklistSelfDriver={setChecklistSelfDriver}
                checklistNotes={checklistNotes}
                setChecklistNotes={setChecklistNotes}
              />
            )}

            {currentStep === 4 && (
              <StepFuel
                trackTripFuel={trackTripFuel}
                setTrackTripFuel={setTrackTripFuel}
                fuelAllowance={fuelAllowance}
                setFuelAllowance={setFuelAllowance}
                pricePerLiter={pricePerLiter}
                setPricePerLiter={setPricePerLiter}
                distanceKm={distanceKm}
                setDistanceKm={setDistanceKm}
                initialFuelLevelPercent={initialFuelLevelPercent}
                setInitialFuelLevelPercent={setInitialFuelLevelPercent}
                initialLiters={initialLiters}
                setInitialLiters={setInitialLiters}
                addedFuelLiters={addedFuelLiters}
                setAddedFuelLiters={setAddedFuelLiters}
                fuelSource={fuelSource}
                setFuelSource={setFuelSource}
                fuelCardNumber={fuelCardNumber}
                setFuelCardNumber={setFuelCardNumber}
              />
            )}

            {currentStep === 5 && (
              <StepContainer
                containerNumber={containerNumber}
                setContainerNumber={setContainerNumber}
                trailerNumber={trailerNumber}
                setTrailerNumber={setTrailerNumber}
                sealNumber={sealNumber}
                setSealNumber={setSealNumber}
              />
            )}

            {currentStep === 6 && (
              <StepOrigin
                pickupLocation={pickupLocation}
                setPickupLocation={setPickupLocation}
                destinations={destinations}
                destinationSearch={destinationSearch}
                setDestinationSearch={setDestinationSearch}
              />
            )}

            {currentStep === 7 && (
              <StepDropoff
                dropoffLocation={dropoffLocation}
                setDropoffLocation={setDropoffLocation}
                dropoffStops={dropoffStops}
                setDropoffStops={setDropoffStops}
                destinationSearch={destinationSearch}
                setDestinationSearch={setDestinationSearch}
                destinations={destinations}
              />
            )}

            {currentStep === 8 && (
              <StepCargo
                cargoDescription={cargoDescription}
                setCargoDescription={setCargoDescription}
                weightTons={weightTons}
                setWeightTons={setWeightTons}
                vanSize={vanSize}
                setVanSize={setVanSize}
                loadStatus={loadStatus}
                setLoadStatus={setLoadStatus}
                freightFee={freightFee}
                setFreightFee={setFreightFee}
                freightBillingTerms={freightBillingTerms}
                setFreightBillingTerms={setFreightBillingTerms}
              />
            )}

            {currentStep === 9 && (
              <StepRoro
                isInterIsland={isInterIsland}
                setIsInterIsland={setIsInterIsland}
                roroRoute={roroRoute}
                setRoroRoute={setRoroRoute}
                shippingLine={shippingLine}
                setShippingLine={setShippingLine}
                roroTicketFee={roroTicketFee}
                setRoroTicketFee={setRoroTicketFee}
                roroSearch={roroSearch}
                setRoroSearch={setRoroSearch}
                roroRoutes={roroRoutes}
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                dropoffStops={dropoffStops}
                onOpenRoroPage={onOpenRoroPage}
              />
            )}

            {currentStep === 10 && (
              <StepReturnTrip
                hasReturnTrip={hasReturnTrip}
                setHasReturnTrip={setHasReturnTrip}
                returnDestination={returnDestination}
                setReturnDestination={setReturnDestination}
                returnCargoType={returnCargoType}
                setReturnCargoType={setReturnCargoType}
                returnPayer={returnPayer}
                setReturnPayer={setReturnPayer}
                returnFreightFee={returnFreightFee}
                setReturnFreightFee={setReturnFreightFee}
                returnFuelAllowance={returnFuelAllowance}
                setReturnFuelAllowance={setReturnFuelAllowance}
                returnRoroTicketFee={returnRoroTicketFee}
                setReturnRoroTicketFee={setReturnRoroTicketFee}
              />
            )}

            {currentStep === 11 && (
              <StepReview
                waybillNumber={waybillNumber}
                dispatchDate={dispatchDate}
                clientName={clientName}
                clientPhone={clientPhone}
                selectedTruckId={selectedTruckId}
                vehicles={vehicles}
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                dropoffStops={dropoffStops}
                weightTons={weightTons}
                freightFee={freightFee}
                freightBillingTerms={freightBillingTerms}
                loadStatus={loadStatus}
                fuelAllowance={fuelAllowance}
                driverRate={driverRate}
                helperCommission={helperCommission}
                containerNumber={containerNumber}
                trailerNumber={trailerNumber}
                sealNumber={sealNumber}
                checklistTires={checklistTires}
                checklistLights={checklistLights}
                checklistOil={checklistOil}
                checklistBrakes={checklistBrakes}
                checklistBattery={checklistBattery}
                checklistWater={checklistWater}
                checklistNotes={checklistNotes}
                initialFuelLevelPercent={initialFuelLevelPercent}
                initialLiters={initialLiters}
                fuelCardNumber={fuelCardNumber}
                isInterIsland={isInterIsland}
                roroRoute={roroRoute}
                shippingLine={shippingLine}
                roroTicketFee={roroTicketFee}
                hasReturnTrip={hasReturnTrip}
                returnDestination={returnDestination}
                returnCargoType={returnCargoType}
                returnFreightFee={returnFreightFee}
                returnFuelAllowance={returnFuelAllowance}
                returnRoroTicketFee={returnRoroTicketFee}
              />
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div style={{ padding: "1rem 1.5rem", background: "var(--bg-main)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="btn btn-outline btn-sm"
            style={{
              opacity: currentStep === 1 ? 0.4 : 1,
              cursor: currentStep === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Previous Step
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {(!initialJob || initialJob.deliveryStatus === "Draft") && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn btn-outline btn-sm"
                title="Save current inputs as Draft dispatch record"
              >
                Save Draft
              </button>
            )}

            <button
              onClick={onClose}
              className="btn btn-outline btn-sm"
            >
              Cancel
            </button>

            {currentStep < 11 ? (
              <button
                onClick={handleNextStep}
                className="btn btn-primary btn-sm"
                style={{ padding: "0.55rem 1.25rem" }}
              >
                <span>
                  Continue {(() => {
                    const currentIndex = allSteps.findIndex((s) => s.num === currentStep);
                    const nextStep = currentIndex >= 0 && currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : null;
                    return nextStep ? `to ${nextStep.title}` : "";
                  })()}
                </span>
                <span>→</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="btn btn-primary btn-sm"
                style={{ background: "var(--success)", color: "#ffffff", padding: "0.55rem 1.25rem" }}
              >
                <span>✓ {isEditing ? "Save & Update Waybill" : "Issue & Dispatch Order"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

