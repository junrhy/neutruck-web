export interface DriverProfile {
  id: string; // e.g. "DRV-101"
  name: string; // e.g. "Mario Santos"
  phone: string; // e.g. "09171234567"
  licenseNumber?: string; // e.g. "N01-12-345678"
  licenseRestriction?: string; // e.g. "Code 8 / Heavy Vehicle"
  spouseName?: string; // Wife / Spouse Name
  emergencyContactName?: string; // Emergency Contact Name
  emergencyContactPhone?: string; // Emergency Contact Phone Number
  emergencyContactRelationship?: string; // e.g. "Wife", "Mother", "Father", "Brother", "Sister", "Siblings", "Friend", "Family", "Other"
  address?: string; // Home Address
  status?: "Available" | "On Duty" | "On Leave";
  notes?: string;
}

export interface HelperProfile {
  id: string; // e.g. "HLP-101"
  name: string; // Helper Full Name
  phone: string; // Contact Number
  licenseNumber?: string; // License / ID Number
  licenseRestriction?: string; // Restriction / Skill Code
  spouseName?: string; // Wife / Spouse Name
  emergencyContactName?: string; // Emergency Contact Name
  emergencyContactPhone?: string; // Emergency Contact Phone Number
  emergencyContactRelationship?: string; // e.g. "Wife", "Mother", "Father", "Brother", "Sister", "Siblings", "Friend", "Family", "Other"
  address?: string; // Home Address
  status?: "Available" | "On Duty" | "On Leave";
  notes?: string;
}

export interface TruckVehicle {
  id: string; // e.g. "TRK-101"
  plateNumber: string; // e.g. "ABC-1234"
  modelType: string; // e.g. "10-Wheeler Wingvan", "Prime Mover 40ft", "6-Wheeler Closed"
  capacityTons: number; // e.g. 25
  defaultDriverId?: string; // Optional default assigned driver ID
  driverName?: string; // Legacy or default driver name fallback
  driverPhone?: string; // Legacy or default driver phone fallback
  helperName?: string; // Optional Driver Assistant / Helper
  helperPhone?: string;
  gpsTrackingUrl?: string; // Optional GET Request URL for External Telematics / GPS Tracker API
  gpsAuthToken?: string; // Optional API Bearer Token / Key
  gpsAutoSync?: boolean; // Enable background auto-poll (every 60s)
  status: "Available" | "In Transit" | "Maintenance" | "Reserved" | "Decommissioned";
  isArchived?: boolean;
  decommissionReason?: string;
  // Per-Truck Fuel & Tank Monitoring
  fuelCapacityLiters?: number; // e.g. 300 (L) Tank Capacity
  currentFuelLevelPercent?: number; // e.g. 75 (%)
  currentFuelLiters?: number; // e.g. 150 (L)
  fuelCardNumber?: string; // e.g. "PETRON-FLEET-9921"
}

export interface DropoffStop {
  id: string;
  locationName: string; // e.g. "SM City Consolacion Distribution Center"
  cargoNotes?: string; // e.g. "50 Cases Beverages / Gate 4"
  isDelivered?: boolean;
  roroLeg?: RoroLegPassage; // Optional ferry passage required before reaching this drop-off stop
}

export interface RoroLegPassage {
  id: string;
  originPortName: string; // e.g. "Batangas Port"
  destinationPortName: string; // e.g. "Calapan Pier"
  shippingLine?: string; // e.g. "FastCat Lines"
  ticketFee?: number; // e.g. 7500
}

export interface DispatchJob {
  id: string; // e.g. "JOB-2026-001"
  waybillNumber: string; // e.g. "WB-98214"
  clientName: string;
  clientPhone?: string; // e.g. "09171234567"
  pickupLocation: string;
  dropoffLocation: string;
  dropoffStops?: DropoffStop[]; // Dynamic multi-stop drop-off locations
  cargoDescription: string;
  weightTons?: number;
  vanSize?: string; // e.g. "10ft", "20ft", "40ft", "45ft", "6-Wheeler", "10-Wheeler", "12-Wheeler"
  truckId: string;
  truckPlate: string;
  driverName: string;
  driverPhone?: string; // e.g. "09171234567"
  helperName?: string; // Driver Assistant / Truck Helper
  helperPhone?: string;
  helperCommission?: number; // Helper commission amount
  dispatchDate: string;
  deliveryStatus: "Draft" | "Pending" | "Dispatched" | "Port Queueing" | "Onboard RoRo" | "In Transit" | "Delivered" | "Returning / En Route Garage" | "Cancelled";
  freightFee: number;
  freightBillingTerms?: "Per Metric Ton (W.MT)" | "Revenue Ton (W/M.MT)" | "Liner Terms / Discharge (L.D)" | "Free In / Liner Out (FLT)" | "Free In and Out (FIO)" | "FIOST" | "Per Trip Flat Rate";
  loadStatus?: "Loaded" | "Empty"; // Loaded cargo haulage vs Empty haul / repositioning
  fuelAllowance: number;
  driverRate: number;

  // Equipment & Container Details
  containerNumber?: string; // e.g. "MSCU-882910-4"
  trailerNumber?: string; // e.g. "TRL-409"
  sealNumber?: string; // e.g. "SEAL-998123"

  // Container Movement Lifecycle Tracking (Withdrawal -> Offload -> Pull Out -> Gate In)
  containerMovement?: {
    withdrawalDate?: string;
    withdrawalWaybill?: string;
    withdrawalDriver?: string;
    withdrawalHelper?: string;
    pullOutDate?: string;
    pullOutWaybill?: string;
    pullOutDriver?: string;
    pullOutHelper?: string;
    gateInDate?: string;
    gateInWaybill?: string;
    gateInDriver?: string;
    gateInHelper?: string;
  };

  // Pre-Trip Unit Safety Checklist Status (BLOWBAGETS)
  truckUnitChecklist?: {
    battery: "OK" | "Needs Attention" | "Not Checked";
    lights: "OK" | "Needs Attention" | "Not Checked";
    oil: "OK" | "Needs Attention" | "Not Checked";
    water: "OK" | "Needs Attention" | "Not Checked";
    brakes: "OK" | "Needs Attention" | "Not Checked";
    airPressure: "OK" | "Needs Attention" | "Not Checked";
    gasFuel: "OK" | "Needs Attention" | "Not Checked";
    electrical: "OK" | "Needs Attention" | "Not Checked";
    tires: "OK" | "Needs Attention" | "Not Checked";
    selfDriverStatus: "OK" | "Needs Attention" | "Not Checked";
    checklistNotes?: string;
  };

  // Fuel Management Details
  fuelManagement?: {
    initialFuelLevelPercent?: number; // e.g. 75 (%)
    initialLiters?: number; // e.g. 150 (L)
    fuelGaugePhotoUrl?: string;
    fuelCardNumber?: string;
    pricePerLiter?: number; // e.g. 68.50 (₱/L)
    distanceKm?: number; // e.g. 450 (KM)
  };

  isInterIsland?: boolean;
  roroRoute?: string; // Legacy / Primary route summary
  roroTicketFee?: number; // Legacy / Total RoRo ticket fee sum
  shippingLine?: string; // Legacy / Primary shipping line
  roroLegs?: RoroLegPassage[]; // Dynamic multi-leg ferry passage itinerary
  
  // Return Trip & Backhaul Tracking
  hasReturnTrip?: boolean;
  returnDestination?: string; // e.g. "Tagbilaran Depot / Home Garage"
  returnCargoType?: "Empty Haul / Deadhead" | "Backhaul Cargo" | "Return Empty Pallets/Containers";
  returnPayer?: "Shipper Paid Round-Trip" | "Backhaul Client Paid" | "Company Expense";
  returnFreightFee?: number; // Additional freight revenue if backhaul cargo
  returnFuelAllowance?: number;
  returnRoroTicketFee?: number;
  returnRoroLegs?: RoroLegPassage[];

  currentLocation?: string; // Freeform location input (e.g. "Batangas Port Pier 3", "En route SLEX Km 42")
  lastLocationUpdate?: string; // Timestamp of location update
  isArchived?: boolean;
}

export interface WaybillReceipt {
  id: string;
  jobId: string;
  waybillNumber: string;
  clientName: string;
  amountPaid: number;
  paymentMethod: "Cash" | "Bank Transfer" | "Check" | "GCash" | "Terms 30 Days";
  paymentStatus: "Paid" | "Pending" | "Partial";
  timestamp: string;
}

export interface BillingColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface BillingAdditionPreset {
  id: string;
  label: string;
  amount: number;
  isPercentage?: boolean;
  itemType?: "addition" | "deduction";
}

export interface SavedBillingRecord {
  id: string;
  statementNo: string; // e.g. "NEUTRUCK2-STMT-2026-1001-8054"
  billingNumber?: string; // Dedicated Billing No. e.g. "Test 14124" or "7400"
  clientName: string;
  dateRange: string; // e.g. "this_month" or "custom"
  customStartDate?: string;
  customEndDate?: string;
  billingDate: string; // e.g. "SEPTEMBER 13, 2026"
  dueDate?: string; // e.g. "OCTOBER 13, 2026" or "2026-10-13"
  status: "Draft" | "Prepared" | "Checked" | "Approved";
  jobIds: string[]; // List of included dispatch job IDs
  subtotal: number;
  grandTotal: number;
  createdAt: string; // ISO date string
  remarks?: string;
  customAdditions?: BillingAdditionPreset[];
  defaultWeighingFee?: number;
}

export interface ClientShipper {
  id: string; // e.g. "CLI-101"
  companyName: string; // e.g. "Bohol Trading Co."
  contactPerson: string; // e.g. "Juan Reyes"
  contactPhone: string; // e.g. "09171234567"
  address?: string; // e.g. "A.C. Cortes Avenue, Mandaue City"
  tinNumber?: string; // Taxpayer Identification Number e.g. "000-123-456-000"
  billingNumber?: string; // Dedicated Billing No. e.g. "7400 (NRB)"
  defaultPickupLocation?: string; // e.g. "Pier 4 North Harbor, Manila"
  notes?: string;
  statementStatus?: "Draft" | "Prepared" | "Checked" | "Approved";
  billingStatementStatuses?: Record<string, "Draft" | "Prepared" | "Checked" | "Approved">;
  billingColumns?: BillingColumnConfig[];
  billingAdditions?: BillingAdditionPreset[];
  billingHistory?: SavedBillingRecord[];
  defaultWeighingFee?: number;
}

export interface RoroPort {
  id: string; // e.g. "PORT-101"
  portName: string; // e.g. "Batangas International Port Pier 3"
  province: string; // e.g. "Batangas"
  islandGroup: "Luzon" | "Visayas" | "Mindanao";
}

export interface RoroRoute {
  id: string; // e.g. "ROUTE-501"
  originPortName: string; // e.g. "Batangas Port Pier 3"
  destinationPortName: string; // e.g. "Calapan Port Pier 1"
  shippingLine: string; // e.g. "FastCat", "Montenegro Lines", "2GO Freight"
  defaultTicketFee: number; // e.g. 7500
}

export interface DropoffDestination {
  id: string; // e.g. "DEST-101"
  hubName: string; // e.g. "Tubigon Commercial Warehouse Hub"
  cityProvince: string; // e.g. "Tubigon, Bohol"
  receiverName?: string; // e.g. "Mark Fernandez"
  receiverPhone?: string; // e.g. "09191234567"
  defaultFreightFee?: number; // e.g. 28000
}

export interface MaintenanceLog {
  id: string;
  truckId: string;
  plateNumber: string;
  serviceType: string; // e.g. "Tire Replacement", "Engine Overhaul", "Oil Change"
  cost: number;
  serviceDate: string;
  odometerKm: number;
  notes: string;
}

export interface FuelTopupLog {
  id: string;
  truckId: string; // e.g. "TRK-101"
  plateNumber: string; // e.g. "CAG-8891"
  topupDate: string; // e.g. "2026-09-29 14:30"
  liters: number; // e.g. 120.5
  costPerLiter: number; // e.g. 68.50
  totalCost: number; // e.g. 8254.25
  location: string; // e.g. "Petron Pier 3 Terminal", "Caltex Tagbilaran Main", "Depot Yard Tank A"
  containerSource: string; // e.g. "On-Site Tanker Container A", "Petron Fleet Card", "Mobile Fuel Lorry", "Cash Purchase Shell"
  odometerKm?: number; // e.g. 142500
  driverName?: string; // e.g. "Mario Santos"
  waybillNumber?: string; // e.g. "WB-98214"
  notes?: string;
}

export interface UnitInspectionLog {
  id: string;
  truckId: string;
  plateNumber: string;
  inspectionDate: string; // ISO date string e.g. "2026-09-29 16:45"
  inspectorName?: string;
  odometerKm?: number;
  fuelLevelPercent?: number; // e.g. 75 (%)
  fuelLiters?: number; // e.g. 225 (L)
  overallStatus: "PASS" | "NEEDS ATTENTION" | "CRITICAL DEFECT";
  checklist: {
    battery: "OK" | "Needs Attention" | "Not Checked";
    lights: "OK" | "Needs Attention" | "Not Checked";
    oil: "OK" | "Needs Attention" | "Not Checked";
    water: "OK" | "Needs Attention" | "Not Checked";
    brakes: "OK" | "Needs Attention" | "Not Checked";
    airPressure: "OK" | "Needs Attention" | "Not Checked";
    gasFuel: "OK" | "Needs Attention" | "Not Checked";
    electrical: "OK" | "Needs Attention" | "Not Checked";
    tires: "OK" | "Needs Attention" | "Not Checked";
    selfDriverStatus: "OK" | "Needs Attention" | "Not Checked";
  };
  notes?: string;
}

export interface SMSRecipientTarget {
  id: string;
  name: string; // e.g. "Operations Manager", "Business Owner", "Port Coordinator"
  phone: string; // e.g. "09171234567"
  enabled: boolean;
}

export interface SMSLog {
  id: string;
  recipientName: string;
  recipientPhone: string;
  waybillNumber: string;
  message: string;
  status: string;
  timestamp: string;
}

export interface AppSettings {
  companyName: string;
  companyTagline: string;
  companyLogo: string;
  smsGateway: "webhook" | "semaphore" | "unisms" | "philsms" | "mobile_gateway";
  smsWebhookUrl: string;
  semaphoreApiKey: string;
  semaphoreSenderName: string;
  unismsApiKey: string;
  unismsSenderName: string;
  philsmsToken: string;
  philsmsSenderName: string;
  mobileGatewayIp: string;
  mobileGatewayPort: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role_id: string;
  is_active: boolean;
  force_password_change?: boolean;
  permissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface Permission {
  id: string;
  module_name: string;
  action_name: string;
}

export interface TruckModel {
  id?: number;
  name: string;
}

export interface AllowedIp {
  id: string;
  ip_address: string;
  label: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IpSecurityStatus {
  clientIp: string;
  whitelistEnabled: boolean;
  isAllowed: boolean;
  allowedIps: AllowedIp[];
}

