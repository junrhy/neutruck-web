import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../hooks/useAuth";

export type Tab =
  | "dispatch"
  | "map"
  | "fleet"
  | "fuel"
  | "inspection"
  | "drivers"
  | "helpers"
  | "clients"
  | "roro"
  | "destinations"
  | "waybills"
  | "maintenance"
  | "reports"
  | "report-daily-trip"
  | "report-wingvan-trip"
  | "report-billing-statement"
  | "report-overdue-statement"
  | "report-container"
  | "report-financial"
  | "report-utilization"
  | "report-collectibles"
  | "report-roro"
  | "report-maintenance"
  | "report-performance"
  | "report-fuel-expense"
  | "report-birada-payroll"
  | "report-overall-expenses"
  | "report-tv-kiosk"
  | "sms"
  | "settings";

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  companyName: string;
  companyTagline: string;
  companyLogo: string;
  onOpenLogin: () => void;
  onOpenChangePassword: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  companyName,
  companyTagline,
  companyLogo,
  onOpenLogin,
  onOpenChangePassword,
}: HeaderProps) {
  const { user, logout, hasPermission } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

  const isOperationsActive = ["dispatch", "map", "fleet", "fuel", "inspection", "drivers", "helpers", "clients", "roro", "destinations"].includes(activeTab);
  const isBillingActive = ["waybills", "maintenance"].includes(activeTab);
  const isAnalyticsActive = [
    "reports",
    "report-daily-trip",
    "report-wingvan-trip",
    "report-billing-statement",
    "report-overdue-statement",
    "report-container",
    "report-financial",
    "report-utilization",
    "report-collectibles",
    "report-roro",
    "report-maintenance",
    "report-performance",
    "sms",
  ].includes(activeTab);



  const handleSelectTab = (tab: Tab) => {
    setActiveTab(tab);
    setOpenDropdown(null);
  };

  return (
    <header className="header">
      <div className="brand-section">
        <div className="brand-logo">
          {companyLogo ? (
            <img src={companyLogo} alt="App Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "1.4rem" }}>🚛</span>
          )}
        </div>
        <div>
          <div className="brand-name">{companyName}</div>
          <div className="brand-tag">{companyTagline}</div>
        </div>
      </div>

      {user && (
        <div className="nav-tabs" style={{ gap: "0.5rem" }}>
          {/* GROUP 1: OPERATIONS */}
          {(hasPermission("dispatch") || hasPermission("fleet")) && (
            <div
              className="nav-dropdown-wrapper"
              style={{ position: "relative" }}
              onMouseEnter={() => setOpenDropdown("operations")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`tab-btn ${isOperationsActive ? "active" : ""}`}
                onClick={() => handleSelectTab("dispatch")}
              >
                <span className="menu-icon">🚚</span> <span>Operations</span> <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>▼</span>
              </button>
              {openDropdown === "operations" && (
                <div className="nav-dropdown-menu" style={{ display: "flex" }}>
                  <div className="nav-dropdown-content">
                    {hasPermission("dispatch") && (
                      <button className={`dropdown-item ${activeTab === "dispatch" ? "active" : ""}`} onClick={() => handleSelectTab("dispatch")}>
                        <span className="menu-icon">📦</span> Dispatch Board
                      </button>
                    )}
                    {hasPermission("dispatch") && (
                      <button className={`dropdown-item ${activeTab === "map" ? "active" : ""}`} onClick={() => handleSelectTab("map")}>
                        <span className="menu-icon">🗺️</span> Map Tracking
                      </button>
                    )}
                    {hasPermission("fleet") && (
                      <button className={`dropdown-item ${activeTab === "fleet" ? "active" : ""}`} onClick={() => handleSelectTab("fleet")}>
                        <span className="menu-icon">🚚</span> Fleet Vehicles
                      </button>
                    )}
                    {hasPermission("fleet") && (
                      <button className={`dropdown-item ${activeTab === "fuel" ? "active" : ""}`} onClick={() => handleSelectTab("fuel")}>
                        <span className="menu-icon">🛢️</span> Fuel Monitoring
                      </button>
                    )}
                    {hasPermission("fleet") && (
                      <button className={`dropdown-item ${activeTab === "inspection" ? "active" : ""}`} onClick={() => handleSelectTab("inspection")}>
                        <span className="menu-icon">📋</span> Unit Inspection
                      </button>
                    )}
                    {hasPermission("fleet") && (
                      <button className={`dropdown-item ${activeTab === "drivers" ? "active" : ""}`} onClick={() => handleSelectTab("drivers")}>
                        <span className="menu-icon">👨‍✈️</span> Drivers Roster
                      </button>
                    )}
                    {hasPermission("fleet") && (
                      <button className={`dropdown-item ${activeTab === "helpers" ? "active" : ""}`} onClick={() => handleSelectTab("helpers")}>
                        <span className="menu-icon">🧑‍🔧</span> Helpers Roster
                      </button>
                    )}
                    {hasPermission("dispatch") && (
                      <button className={`dropdown-item ${activeTab === "clients" ? "active" : ""}`} onClick={() => handleSelectTab("clients")}>
                        <span className="menu-icon">👥</span> Client Shippers
                      </button>
                    )}
                    {hasPermission("dispatch") && (
                      <button className={`dropdown-item ${activeTab === "roro" ? "active" : ""}`} onClick={() => handleSelectTab("roro")}>
                        <span className="menu-icon">⛴️</span> RoRo Ports &amp; Ferries
                      </button>
                    )}
                    {hasPermission("dispatch") && (
                      <button className={`dropdown-item ${activeTab === "destinations" ? "active" : ""}`} onClick={() => handleSelectTab("destinations")}>
                        <span className="menu-icon">🏭</span> Dropoff Destinations
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GROUP 2: BILLING & RECORDS */}
          {(hasPermission("waybills") || hasPermission("maintenance")) && (
            <div
              className="nav-dropdown-wrapper"
              style={{ position: "relative" }}
              onMouseEnter={() => setOpenDropdown("billing")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`tab-btn ${isBillingActive ? "active" : ""}`}
                onClick={() => handleSelectTab("waybills")}
              >
                <span className="menu-icon">📑</span> <span>Billing &amp; Records</span> <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>▼</span>
              </button>
              {openDropdown === "billing" && (
                <div className="nav-dropdown-menu" style={{ display: "flex" }}>
                  <div className="nav-dropdown-content">
                    {hasPermission("waybills") && (
                      <button className={`dropdown-item ${activeTab === "waybills" ? "active" : ""}`} onClick={() => handleSelectTab("waybills")}>
                        <span className="menu-icon">📑</span> Waybills &amp; Receipts
                      </button>
                    )}
                    {hasPermission("maintenance") && (
                      <button className={`dropdown-item ${activeTab === "maintenance" ? "active" : ""}`} onClick={() => handleSelectTab("maintenance")}>
                        <span className="menu-icon">🔧</span> Repairs &amp; Maintenance
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GROUP 3: INTELLIGENCE & COMMS */}
          {(hasPermission("reports") ||
            hasPermission("report_daily_trip") ||
            hasPermission("report_billing_statement") ||
            hasPermission("report_container") ||
            hasPermission("report_financial") ||
            hasPermission("report_utilization") ||
            hasPermission("report_collectibles") ||
            hasPermission("report_roro") ||
            hasPermission("report_maintenance") ||
            hasPermission("sms")) && (
              <div
                className="nav-dropdown-wrapper"
                style={{ position: "relative" }}
                onMouseEnter={() => setOpenDropdown("intelligence")}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className={`tab-btn ${isAnalyticsActive ? "active" : ""}`}
                  onClick={() => handleSelectTab("reports")}
                >
                  <span className="menu-icon">📊</span> <span>Intelligence</span> <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>▼</span>
                </button>
                {openDropdown === "intelligence" && (
                  <div className="nav-dropdown-menu" style={{ display: "flex" }}>
                    <div className="nav-dropdown-content">
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", padding: "0.35rem 0.6rem 0.15rem 0.6rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                        📊 Analytics &amp; Reports
                      </div>

                      {(hasPermission("reports") || hasPermission("report_daily_trip")) && (
                        <button className={`dropdown-item ${activeTab === "report-daily-trip" ? "active" : ""}`} onClick={() => handleSelectTab("report-daily-trip")}>
                          <span className="menu-icon">📝</span> Daily Trip Report
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_wingvan_trip")) && (
                        <button className={`dropdown-item ${activeTab === "report-wingvan-trip" ? "active" : ""}`} onClick={() => handleSelectTab("report-wingvan-trip")}>
                          <span className="menu-icon">🚛</span> Wingvan Trip &amp; Payroll Report
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_billing_statement")) && (
                        <button className={`dropdown-item ${activeTab === "report-billing-statement" ? "active" : ""}`} onClick={() => handleSelectTab("report-billing-statement")}>
                          <span className="menu-icon">🧾</span> Client Billing Statement
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_billing_statement")) && (
                        <button className={`dropdown-item ${activeTab === "report-overdue-statement" ? "active" : ""}`} onClick={() => handleSelectTab("report-overdue-statement")}>
                          <span className="menu-icon">🚨</span> Overdue Statements Report
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_container")) && (
                        <button className={`dropdown-item ${activeTab === "report-container" ? "active" : ""}`} onClick={() => handleSelectTab("report-container")}>
                          <span className="menu-icon">📦</span> Per Trip Delivery Report
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_financial")) && (
                        <button className={`dropdown-item ${activeTab === "report-financial" ? "active" : ""}`} onClick={() => handleSelectTab("report-financial")}>
                          <span className="menu-icon">💰</span> Revenue &amp; Profitability P&amp;L
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_utilization")) && (
                        <button className={`dropdown-item ${activeTab === "report-utilization" ? "active" : ""}`} onClick={() => handleSelectTab("report-utilization")}>
                          <span className="menu-icon">🚚</span> Fleet Performance &amp; Utilization
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_collectibles")) && (
                        <button className={`dropdown-item ${activeTab === "report-collectibles" ? "active" : ""}`} onClick={() => handleSelectTab("report-collectibles")}>
                          <span className="menu-icon">💳</span> Accounts Receivable (Collectibles)
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_roro")) && (
                        <button className={`dropdown-item ${activeTab === "report-roro" ? "active" : ""}`} onClick={() => handleSelectTab("report-roro")}>
                          <span className="menu-icon">⛴️</span> Inter-Island RoRo Passage
                        </button>
                      )}
                      {(hasPermission("reports") || hasPermission("report_maintenance")) && (
                        <button className={`dropdown-item ${activeTab === "report-maintenance" ? "active" : ""}`} onClick={() => handleSelectTab("report-maintenance")}>
                          <span className="menu-icon">🔧</span> Repair &amp; Service Expenses
                        </button>
                      )}
                      {hasPermission("reports") && (
                        <button className={`dropdown-item ${activeTab === "report-performance" ? "active" : ""}`} onClick={() => handleSelectTab("report-performance")}>
                          <span className="menu-icon">📈</span> KPI &amp; Time Performance
                        </button>
                      )}
                      {hasPermission("reports") && (
                        <button className={`dropdown-item ${activeTab === "report-fuel-expense" ? "active" : ""}`} onClick={() => handleSelectTab("report-fuel-expense")}>
                          <span className="menu-icon">🛢️</span> Fuel Expenses
                        </button>
                      )}
                      {hasPermission("reports") && (
                        <button className={`dropdown-item ${activeTab === "report-birada-payroll" ? "active" : ""}`} onClick={() => handleSelectTab("report-birada-payroll")}>
                          <span className="menu-icon">💵</span> Driver &amp; Helper Birada Report
                        </button>
                      )}
                      {hasPermission("reports") && (
                        <button className={`dropdown-item ${activeTab === "report-overall-expenses" ? "active" : ""}`} onClick={() => handleSelectTab("report-overall-expenses")}>
                          <span className="menu-icon">📊</span> Master Overall Expenses
                        </button>
                      )}

                      {hasPermission("sms") && (
                        <>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", padding: "0.5rem 0.6rem 0.15rem 0.6rem", textTransform: "uppercase", fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: "0.25rem", letterSpacing: "0.5px" }}>
                            💬 Communications
                          </div>
                          <button className={`dropdown-item ${activeTab === "sms" ? "active" : ""}`} onClick={() => handleSelectTab("sms")}>
                            <span className="menu-icon">💬</span> SMS Console
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* GROUP 4: DISPLAY / KIOSK */}
          {hasPermission("reports") && (
            <div
              className="nav-dropdown-wrapper"
              style={{ position: "relative" }}
              onMouseEnter={() => setOpenDropdown("display")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                className={`tab-btn ${activeTab === "report-tv-kiosk" ? "active" : ""}`}
                onClick={() => handleSelectTab("report-tv-kiosk")}
              >
                <span className="menu-icon">📺</span> <span>Display</span> <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>▼</span>
              </button>
              {openDropdown === "display" && (
                <div className="nav-dropdown-menu" style={{ display: "flex" }}>
                  <div className="nav-dropdown-content">
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", padding: "0.35rem 0.6rem 0.15rem 0.6rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                      📺 Wall TV &amp; Kiosk Displays
                    </div>
                    <button
                      className={`dropdown-item ${activeTab === "report-tv-kiosk" ? "active" : ""}`}
                      onClick={async () => {
                        try {
                          await invoke("open_tv_kiosk_window");
                          setOpenDropdown(null);
                        } catch (e) {
                          // Fallback to internal view if window creation fails
                          handleSelectTab("report-tv-kiosk");
                        }
                      }}
                    >
                      <span className="menu-icon">📡</span> Reports Slideshow
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GROUP 5: SETTINGS */}
          {hasPermission("settings") && (
            <button className={`tab-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => handleSelectTab("settings")}>
              <span className="menu-icon">⚙️</span> <span>Settings</span>
            </button>
          )}
        </div>
      )}

      <div className="header-controls" style={{ gap: "0.85rem" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{dateStr}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 700 }}>
            {user ? user.name : "Guest Session"}
          </div>
        </div>

        {user ? (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              onClick={onOpenChangePassword}
              className="btn btn-sm btn-outline"
              style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
              title="Change Account Password"
            >
              🔑 Password
            </button>
            <button
              onClick={() => {
                logout();
                setActiveTab("dispatch");
              }}
              className="btn btn-sm btn-outline"
              style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
              title="Logout Session"
            >
              🚪 Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="btn btn-sm btn-primary"
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
          >
            🔑 Login
          </button>
        )}

        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)", flexShrink: 0 }} />
      </div>
    </header>
  );
}
