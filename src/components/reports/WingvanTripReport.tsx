import React, { useState } from "react";
import { DispatchJob, TruckVehicle } from "../../types";
import { ReportHeader, isDateInRange } from "./reportUtils";

interface WingvanTripReportProps {
  jobs: DispatchJob[];
  vehicles: TruckVehicle[];
  companyName: string;
  companyLogo?: string;
  sigPreparedBy?: string;
  sigCheckedBy?: string;
  sigApprovedBy?: string;
  sigPreparedByImg?: string;
  sigCheckedByImg?: string;
  sigApprovedByImg?: string;
}

export const WingvanTripReport: React.FC<WingvanTripReportProps> = ({
  jobs,
  vehicles,
  companyName,
  companyLogo,
  sigPreparedBy = "Operations Staff",
  sigCheckedBy = "Fleet Supervisor",
  sigApprovedBy = "General Manager",
  sigPreparedByImg = "",
  sigCheckedByImg = "",
  sigApprovedByImg = "",
}) => {
  const [dateRange, setDateRange] = useState("180_days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([]);
  const [isTruckDropdownOpen, setIsTruckDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Unique lists for filtering
  const driverList = Array.from(new Set(jobs.map((j) => j.driverName).filter(Boolean))).sort();
  const clientList = Array.from(new Set(jobs.map((j) => j.clientName).filter(Boolean))).sort();
  const truckPlatesList = Array.from(
    new Set([
      ...vehicles.map((v) => v.plateNumber),
      ...jobs.map((j) => j.truckPlate),
    ].filter(Boolean))
  ).sort();

  const modelTypeList = Array.from(
    new Set([
      ...vehicles.map((v) => v.modelType),
      ...jobs.map((j) => {
        const matchingVeh = vehicles.find((v) => v.plateNumber === j.truckPlate || v.id === j.truckId);
        return matchingVeh?.modelType || "";
      }),
    ].filter(Boolean))
  ).sort();

  const handleToggleTruck = (plate: string) => {
    setSelectedTrucks((prev) => {
      if (prev.length === 0) {
        // Was "All Vehicles", unchecking this plate means select all others
        return truckPlatesList.filter((p) => p !== plate);
      }
      if (prev.includes(plate)) {
        const next = prev.filter((p) => p !== plate);
        return next;
      } else {
        const next = [...prev, plate];
        if (next.length === truckPlatesList.length) return [];
        return next;
      }
    });
  };

  const handleSelectAllTrucks = () => setSelectedTrucks([]);
  const handleClearAllTrucks = () => setSelectedTrucks(["__NONE__"]);

  // Exclude Draft and Cancelled jobs, and apply date, truck, model, driver & client filters
  const filteredJobs = jobs.filter((j) => {
    if (j.deliveryStatus === "Draft" || j.deliveryStatus === "Cancelled") return false;
    if (!isDateInRange(j.dispatchDate, dateRange, customStartDate, customEndDate)) return false;
    if (selectedTrucks.length > 0 && !selectedTrucks.includes(j.truckPlate) && !selectedTrucks.includes(j.truckId)) return false;
    if (selectedModel !== "all") {
      const matchedVeh = vehicles.find((v) => v.plateNumber === j.truckPlate || v.id === j.truckId);
      if (!matchedVeh || matchedVeh.modelType !== selectedModel) return false;
    }
    if (selectedDriver !== "all" && j.driverName !== selectedDriver) return false;
    if (selectedClient !== "all" && j.clientName !== selectedClient) return false;
    return true;
  });

  // Sort by dispatch date descending
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.dispatchDate || "";
    const dateB = b.dispatchDate || "";
    return dateB.localeCompare(dateA);
  });

  // Calculate Aggregates
  const totalTrips = sortedJobs.length;
  const totalFreightFee = sortedJobs.reduce((sum, j) => sum + (j.freightFee || 0), 0);
  const totalFuelAllowance = sortedJobs.reduce((sum, j) => sum + (j.fuelAllowance || 0), 0);
  const totalDriverPay = sortedJobs.reduce((sum, j) => sum + (j.driverRate || 0), 0);
  const totalHelperPay = sortedJobs.reduce((sum, j) => sum + (j.helperCommission || 0), 0);
  const totalPayroll = totalDriverPay + totalHelperPay;

  // Calculate total liters & KM
  const totalLiters = sortedJobs.reduce((sum, j) => {
    const liters = j.fuelManagement?.initialLiters || (j.fuelAllowance && j.fuelManagement?.pricePerLiter ? j.fuelAllowance / j.fuelManagement.pricePerLiter : 0);
    return sum + liters;
  }, 0);

  const totalKm = sortedJobs.reduce((sum, j) => sum + (j.fuelManagement?.distanceKm || 0), 0);

  const formatCurrency = (val: number) =>
    `₱${val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <ReportHeader
        title="🚛 Wingvan Haulage Trip & Payroll Manifest"
        subtitle={`Detailed haulage trip summary, fuel consumption analysis, driver/helper payroll birada, and waybill records (${companyName}).`}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        printElementId="wingvan-trip-paper-sheet"
        pdfFilenamePrefix="Wingvan_Trip_Payroll_Manifest"
      />

      {/* Filter Controls Bar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          background: "var(--bg-card)",
          padding: "0.85rem 1rem",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Multi-Select Truck Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", position: "relative" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>🚚 Truck Plate:</label>
          <button
            type="button"
            className="form-select"
            onClick={() => setIsTruckDropdownOpen((prev) => !prev)}
            style={{
              width: "210px",
              fontSize: "0.85rem",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              background: "var(--bg-main)",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedTrucks.length === 0
                ? `All Vehicles (${truckPlatesList.length})`
                : selectedTrucks.length === 1 && selectedTrucks[0] !== "__NONE__"
                ? selectedTrucks[0]
                : selectedTrucks.includes("__NONE__")
                ? "No Vehicles Selected"
                : `${selectedTrucks.length} Vehicles Selected`}
            </span>
            <span style={{ fontSize: "0.65rem", opacity: 0.7, marginLeft: "0.4rem" }}>▼</span>
          </button>

          {isTruckDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "0.35rem",
                zIndex: 999,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                padding: "0.65rem",
                width: "270px",
                maxHeight: "300px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "0.4rem",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                <span style={{ color: "var(--primary)" }}>Select Vehicles</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.72rem", cursor: "pointer", padding: 0, fontWeight: 700 }}
                    onClick={handleSelectAllTrucks}
                  >
                    Select All
                  </button>
                  <span style={{ color: "var(--text-dim)" }}>|</span>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.72rem", cursor: "pointer", padding: 0 }}
                    onClick={handleClearAllTrucks}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {truckPlatesList.map((plate) => {
                const matchingVeh = vehicles.find((v) => v.plateNumber === plate);
                const isChecked = selectedTrucks.length === 0 || selectedTrucks.includes(plate);

                return (
                  <label
                    key={plate}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.8rem",
                      padding: "0.3rem 0.4rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: isChecked ? "rgba(var(--primary-rgb, 59, 130, 246), 0.12)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleTruck(plate)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <strong>{plate}</strong> {matchingVeh?.modelType ? `(${matchingVeh.modelType})` : ""}
                    </span>
                  </label>
                );
              })}

              <button
                type="button"
                className="btn btn-sm btn-primary"
                style={{ marginTop: "0.4rem", fontSize: "0.75rem", width: "100%", padding: "0.3rem" }}
                onClick={() => setIsTruckDropdownOpen(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Truck Model Filter Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>🏷️ Truck Model:</label>
          <select
            className="form-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{ width: "190px", fontSize: "0.85rem" }}
          >
            <option value="all">All Truck Models</option>
            {modelTypeList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>👨‍✈️ Driver:</label>
          <select
            className="form-select"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            style={{ width: "160px", fontSize: "0.85rem" }}
          >
            <option value="all">All Drivers</option>
            {driverList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>🏢 Client / Customer / Shipper:</label>
          <select
            className="form-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            style={{ width: "190px", fontSize: "0.85rem" }}
          >
            <option value="all">All Clients</option>
            {clientList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Showing <strong>{sortedJobs.length}</strong> trip record{sortedJobs.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Printable Paper Sheet Container */}
      <div
        id="wingvan-trip-paper-sheet"
        style={{
          background: "var(--bg-card)",
          border: "2px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header Block */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid var(--border)",
            paddingBottom: "1rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company Logo"
                style={{ maxHeight: "60px", maxWidth: "130px", objectFit: "contain", borderRadius: "4px" }}
              />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)" }}>
                {companyName}
              </h2>
              <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700, marginTop: "0.15rem" }}>
                WINGVAN HAULAGE TRIP &amp; PAYROLL MANIFEST
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            <div><strong>Report Date:</strong> {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</div>
            <div><strong>Filter Scope:</strong> {dateRange === "all" ? "All-Time Records" : dateRange.replace("_", " ").toUpperCase()}</div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Total Dispatched Trips
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.2rem" }}>
              {totalTrips} <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>trips</span>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Gross Freight Income
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--success)", marginTop: "0.2rem" }}>
              {formatCurrency(totalFreightFee)}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Total Fuel Expense
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#e11d48", marginTop: "0.2rem" }}>
              {formatCurrency(totalFuelAllowance)}
            </div>
            {totalLiters > 0 && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                ~{totalLiters.toFixed(1)} Liters Total
              </div>
            )}
          </div>

          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Driver Payroll Pay
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#3b82f6", marginTop: "0.2rem" }}>
              {formatCurrency(totalDriverPay)}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Helper Payroll Pay
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#8b5cf6", marginTop: "0.2rem" }}>
              {formatCurrency(totalHelperPay)}
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-main)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
              Total Crew Payroll
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#059669", marginTop: "0.2rem" }}>
              {formatCurrency(totalPayroll)}
            </div>
          </div>
        </div>

        {/* Detailed Table Manifest Grid */}
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
          <table className="table" style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-main)", borderBottom: "2px solid var(--border)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.4px" }}>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Date</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Client / Customer / Shipper</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Waybill No</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Origin</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Destination</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Driver</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "left" }}>Helper</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>Plate No</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>KM</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Liters</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Pesos (₱/L)</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Amount (₱)</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>Trips</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Driver Pay</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Helper Pay</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                    No wingvan haulage dispatches found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                sortedJobs.map((j) => {
                  const liters =
                    j.fuelManagement?.initialLiters ||
                    (j.fuelAllowance && j.fuelManagement?.pricePerLiter
                      ? j.fuelAllowance / j.fuelManagement.pricePerLiter
                      : 0);

                  const pricePerLiter =
                    j.fuelManagement?.pricePerLiter ||
                    (liters > 0 ? j.fuelAllowance / liters : 0);

                  const km = j.fuelManagement?.distanceKm || 0;
                  const driverPay = j.driverRate || 0;
                  const helperPay = j.helperCommission || 0;
                  const netPay = driverPay + helperPay;

                  return (
                    <tr key={j.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.55rem 0.5rem", whiteSpace: "nowrap" }}>
                        {j.dispatchDate ? j.dispatchDate.substring(0, 10) : "—"}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", fontWeight: 600 }}>{j.clientName}</td>
                      <td style={{ padding: "0.55rem 0.5rem", fontWeight: 700, color: "var(--primary)" }}>
                        {j.waybillNumber}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem" }}>{j.pickupLocation}</td>
                      <td style={{ padding: "0.55rem 0.5rem" }}>{j.dropoffLocation}</td>
                      <td style={{ padding: "0.55rem 0.5rem", fontWeight: 600 }}>{j.driverName}</td>
                      <td style={{ padding: "0.55rem 0.5rem", color: j.helperName ? "var(--text-main)" : "var(--text-dim)" }}>
                        {j.helperName || "—"}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "center", fontWeight: 700 }}>
                        {j.truckPlate}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right" }}>
                        {km > 0 ? km.toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right" }}>
                        {liters > 0 ? liters.toFixed(1) : "—"}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right" }}>
                        {pricePerLiter > 0 ? `₱${pricePerLiter.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right", fontWeight: 600 }}>
                        {j.fuelAllowance ? formatCurrency(j.fuelAllowance) : "₱0.00"}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "center" }}>1</td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right", color: "#2563eb", fontWeight: 600 }}>
                        {formatCurrency(driverPay)}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>
                        {formatCurrency(helperPay)}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem", textAlign: "right", color: "#059669", fontWeight: 700 }}>
                        {formatCurrency(netPay)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedJobs.length > 0 && (
              <tfoot>
                <tr style={{ background: "var(--bg-main)", borderTop: "2px solid var(--border)", fontWeight: 800 }}>
                  <td colSpan={8} style={{ padding: "0.65rem 0.5rem", textAlign: "right" }}>
                    MANIFEST TOTALS ({sortedJobs.length} TRIPS):
                  </td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right" }}>
                    {totalKm > 0 ? `${totalKm.toLocaleString()} KM` : "—"}
                  </td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right" }}>
                    {totalLiters > 0 ? `${totalLiters.toFixed(1)} L` : "—"}
                  </td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right" }}>—</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#e11d48" }}>
                    {formatCurrency(totalFuelAllowance)}
                  </td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "center" }}>{totalTrips}</td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#2563eb" }}>
                    {formatCurrency(totalDriverPay)}
                  </td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#7c3aed" }}>
                    {formatCurrency(totalHelperPay)}
                  </td>
                  <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#059669" }}>
                    {formatCurrency(totalPayroll)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Signatures Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px dashed var(--border)",
          }}
        >
          {/* Prepared By */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textTransform: "uppercase" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700, marginBottom: "0.25rem" }}>
              Prepared By:
            </span>
            <div style={{ height: "45px", display: "flex", alignItems: "flex-end" }}>
              {sigPreparedByImg && (
                <img src={sigPreparedByImg} alt="Signature Prepared By" style={{ maxHeight: "40px", objectFit: "contain" }} />
              )}
            </div>
            <div style={{ width: "80%", borderBottom: "1px solid var(--text-main)", margin: "0.25rem 0" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
              {sigPreparedBy || "Operations Staff"}
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Manifest Controller</span>
          </div>

          {/* Checked By */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textTransform: "uppercase" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700, marginBottom: "0.25rem" }}>
              Checked &amp; Audited By:
            </span>
            <div style={{ height: "45px", display: "flex", alignItems: "flex-end" }}>
              {sigCheckedByImg && (
                <img src={sigCheckedByImg} alt="Signature Checked By" style={{ maxHeight: "40px", objectFit: "contain" }} />
              )}
            </div>
            <div style={{ width: "80%", borderBottom: "1px solid var(--text-main)", margin: "0.25rem 0" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
              {sigCheckedBy || "Fleet Supervisor"}
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Fleet Auditor</span>
          </div>

          {/* Approved By */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textTransform: "uppercase" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700, marginBottom: "0.25rem" }}>
              Approved By:
            </span>
            <div style={{ height: "45px", display: "flex", alignItems: "flex-end" }}>
              {sigApprovedByImg && (
                <img src={sigApprovedByImg} alt="Signature Approved By" style={{ maxHeight: "40px", objectFit: "contain" }} />
              )}
            </div>
            <div style={{ width: "80%", borderBottom: "1px solid var(--text-main)", margin: "0.25rem 0" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
              {sigApprovedBy || "General Manager"}
            </span>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Authorized Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
};
