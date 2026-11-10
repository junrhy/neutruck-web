import { DispatchJob, TruckVehicle, WaybillReceipt, MaintenanceLog, ClientShipper, FuelTopupLog, UnitInspectionLog } from "../types";
import { DailyTripReport } from "./reports/DailyTripReport";
import { WingvanTripReport } from "./reports/WingvanTripReport";
import { BillingStatementReport } from "./reports/BillingStatementReport";
import { ContainerLifecycleReport } from "./reports/ContainerLifecycleReport";
import { FinancialReport } from "./reports/FinancialReport";
import { FleetUtilizationReport } from "./reports/FleetUtilizationReport";
import { AccountsReceivableReport } from "./reports/AccountsReceivableReport";
import { RoroPassageReport } from "./reports/RoroPassageReport";
import { MaintenanceReport } from "./reports/MaintenanceReport";
import { OverdueStatementsReport } from "./reports/OverdueStatementsReport";
import { TimePerformanceReport } from "./reports/TimePerformanceReport";
import { FuelExpenseReport } from "./reports/FuelExpenseReport";
import { BiradaPayrollReport } from "./reports/BiradaPayrollReport";
import { OverallExpensesReport } from "./reports/OverallExpensesReport";

export type ReportType = "daily-trip" | "wingvan-trip" | "billing-statement" | "overdue-statement" | "financial" | "utilization" | "collectibles" | "container" | "maintenance" | "roro" | "performance" | "fuel-expense" | "birada-payroll" | "overall-expenses";

interface ReportsPageProps {
  jobs: DispatchJob[];
  vehicles: TruckVehicle[];
  receipts: WaybillReceipt[];
  maintenanceLogs: MaintenanceLog[];
  topupLogs?: FuelTopupLog[];
  inspectionLogs?: UnitInspectionLog[];
  clients?: ClientShipper[];
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  sigPreparedBy?: string;
  sigCheckedBy?: string;
  sigApprovedBy?: string;
  sigPreparedByImg?: string;
  sigCheckedByImg?: string;
  sigApprovedByImg?: string;
  activeReport?: ReportType;
  onUpdateClient?: (client: ClientShipper) => void;
  onNavigateToBillingStatement?: () => void;
}

export default function ReportsPage({
  jobs,
  vehicles,
  receipts,
  maintenanceLogs,
  topupLogs = [],
  inspectionLogs = [],
  clients = [],
  companyName,
  companyLogo = "",
  companyAddress = "",
  companyPhone = "",
  sigPreparedBy = "",
  sigCheckedBy = "",
  sigApprovedBy = "",
  sigPreparedByImg = "",
  sigCheckedByImg = "",
  sigApprovedByImg = "",
  activeReport = "daily-trip",
  onUpdateClient,
  onNavigateToBillingStatement,
}: ReportsPageProps) {
  // Filter non-cancelled non-draft valid dispatches
  const validJobs = jobs.filter((j) => j.deliveryStatus !== "Cancelled" && j.deliveryStatus !== "Draft");

  return (
    <div id="printable-reports-area" style={{ paddingBottom: "3rem" }}>
      {activeReport === "daily-trip" && (
        <DailyTripReport jobs={validJobs} vehicles={vehicles} topupLogs={topupLogs} inspectionLogs={inspectionLogs} companyName={companyName} companyLogo={companyLogo} />
      )}

      {activeReport === "wingvan-trip" && (
        <WingvanTripReport
          jobs={validJobs}
          vehicles={vehicles}
          companyName={companyName}
          companyLogo={companyLogo}
          sigPreparedBy={sigPreparedBy}
          sigCheckedBy={sigCheckedBy}
          sigApprovedBy={sigApprovedBy}
          sigPreparedByImg={sigPreparedByImg}
          sigCheckedByImg={sigCheckedByImg}
          sigApprovedByImg={sigApprovedByImg}
        />
      )}

      {activeReport === "billing-statement" && (
        <BillingStatementReport
          jobs={validJobs}
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
          onUpdateClient={onUpdateClient}
        />
      )}

      {activeReport === "overdue-statement" && (
        <OverdueStatementsReport
          clients={clients}
          companyName={companyName}
          onOpenStatement={() => {
            if (onNavigateToBillingStatement) onNavigateToBillingStatement();
          }}
        />
      )}

      {activeReport === "container" && <ContainerLifecycleReport jobs={validJobs} />}

      {activeReport === "financial" && (
        <FinancialReport
          jobs={validJobs}
          maintenanceLogs={maintenanceLogs}
          companyName={companyName}
        />
      )}

      {activeReport === "utilization" && (
        <FleetUtilizationReport vehicles={vehicles} jobs={validJobs} maintenanceLogs={maintenanceLogs} />
      )}

      {activeReport === "collectibles" && <AccountsReceivableReport jobs={validJobs} receipts={receipts} />}

      {activeReport === "roro" && <RoroPassageReport jobs={validJobs} />}

      {activeReport === "maintenance" && <MaintenanceReport maintenanceLogs={maintenanceLogs} />}

      {activeReport === "performance" && (
        <TimePerformanceReport jobs={validJobs} receipts={receipts} companyName={companyName} companyLogo={companyLogo} />
      )}

      {activeReport === "fuel-expense" && (
        <FuelExpenseReport topupLogs={topupLogs} vehicles={vehicles} jobs={validJobs} inspectionLogs={inspectionLogs} companyName={companyName} companyLogo={companyLogo} />
      )}

      {activeReport === "birada-payroll" && (
        <BiradaPayrollReport jobs={validJobs} companyName={companyName} companyLogo={companyLogo} />
      )}

      {activeReport === "overall-expenses" && (
        <OverallExpensesReport jobs={validJobs} maintenanceLogs={maintenanceLogs} topupLogs={topupLogs} vehicles={vehicles} companyName={companyName} companyLogo={companyLogo} />
      )}
    </div>
  );
}
