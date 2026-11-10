import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import AutoUpdater from "./AutoUpdater";
import Database from "@tauri-apps/plugin-sql";
import UserManagement from "./admin/UserManagement";
import RoleManagement from "./admin/RoleManagement";
import { useAuth } from "../hooks/useAuth";
import { SMSRecipientTarget } from "../types";
import { SUPPORTED_TIMEZONES, getAppTimezone, setAppTimezone } from "../utils/dateUtils";

interface SettingsPageProps {
  companyName: string;
  companyTag: string;
  companyLogo: string;
  companyAddress: string;
  companyPhone: string;
  sigPreparedBy: string;
  sigCheckedBy: string;
  sigApprovedBy: string;
  sigPreparedByImg?: string;
  sigCheckedByImg?: string;
  sigApprovedByImg?: string;
  onSaveProfile: (
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
  ) => void;
  db: Database | null;
}

export type SettingsTab = "profile" | "appearance" | "sms" | "users" | "database" | "storage" | "license" | "developer";

const SETTINGS_TABS: { id: SettingsTab; icon: string; label: string; desc: string; adminOnly?: boolean; requireAuth?: boolean }[] = [
  { id: "profile", icon: "🚚", label: "Company Profile", desc: "Logo, receipt & billing details", adminOnly: true },
  { id: "appearance", icon: "🎨", label: "Appearance", desc: "Themes, colors & wallpaper", requireAuth: true },
  { id: "sms", icon: "💬", label: "SMS Gateway", desc: "Text message notifications", adminOnly: true },
  { id: "users", icon: "👥", label: "Users & Roles", desc: "Staff accounts & access levels", adminOnly: true },
  { id: "database", icon: "🌐", label: "DB Connection", desc: "Local & cloud database setup", adminOnly: true },
  { id: "storage", icon: "📁", label: "File Storage", desc: "Document & photo attachments", adminOnly: true },
  { id: "license", icon: "🔑", label: "License & Payment", desc: "App key & plan status" },
  { id: "developer", icon: "🛠️", label: "Dev Settings", desc: "Advanced integrations & webhooks", adminOnly: true },
];

export default function SettingsPage({
  companyName,
  companyTag,
  companyLogo,
  companyAddress,
  companyPhone,
  sigPreparedBy,
  sigCheckedBy,
  sigApprovedBy,
  sigPreparedByImg = "",
  sigCheckedByImg = "",
  sigApprovedByImg = "",
  onSaveProfile,
  db,
}: SettingsPageProps) {
  const { user } = useAuth();
  const isAdmin = Boolean(
    user && (
      user.username?.toLowerCase() === "admin" ||
      String(user.role_id) === "1" ||
      user.role_id === "admin" ||
      user.permissions?.includes("*") ||
      user.permissions?.includes("settings") ||
      user.permissions?.some((p) => p.startsWith("settings"))
    )
  );
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [tempName, setTempName] = useState(companyName);
  const [tempTag, setTempTag] = useState(companyTag);
  const [tempLogo, setTempLogo] = useState(companyLogo);
  const [tempAddress, setTempAddress] = useState(companyAddress);
  const [tempPhone, setTempPhone] = useState(companyPhone);
  const [tempPreparedBy, setTempPreparedBy] = useState(sigPreparedBy);
  const [tempCheckedBy, setTempCheckedBy] = useState(sigCheckedBy);
  const [tempApprovedBy, setTempApprovedBy] = useState(sigApprovedBy);
  const [tempPreparedByImg, setTempPreparedByImg] = useState(sigPreparedByImg);
  const [tempCheckedByImg, setTempCheckedByImg] = useState(sigCheckedByImg);
  const [tempApprovedByImg, setTempApprovedByImg] = useState(sigApprovedByImg);
  const [appTimezoneState, setAppTimezoneState] = useState(() => getAppTimezone());

  useEffect(() => {
    setTempPreparedBy(sigPreparedBy);
    setTempCheckedBy(sigCheckedBy);
    setTempApprovedBy(sigApprovedBy);
    setTempPreparedByImg(sigPreparedByImg);
    setTempCheckedByImg(sigCheckedByImg);
    setTempApprovedByImg(sigApprovedByImg);
  }, [sigPreparedBy, sigCheckedBy, sigApprovedBy, sigPreparedByImg, sigCheckedByImg, sigApprovedByImg]);
  const [activeSignatoryPad, setActiveSignatoryPad] = useState<{
    role: "Prepared" | "Checked" | "Approved";
    title: string;
    currentImg: string;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [_isLicensedAndPaid, setIsLicensedAndPaid] = useState<boolean>(true);
  const [serverLicenseData, setServerLicenseData] = useState<{
    allow_db_settings?: boolean;
    allow_storage_settings?: boolean;
    allow_developer_settings?: boolean;
    allow_sms_settings?: boolean;
  } | null>({
    allow_db_settings: true,
    allow_storage_settings: true,
    allow_developer_settings: true,
    allow_sms_settings: true,
  });

  const checkLicenseStatus = async () => {
    try {
      setIsLicensedAndPaid(true);
      const savedKey = localStorage.getItem("neutruck_license_key") || "";
      if (!savedKey) {
        setIsLicensedAndPaid(true);
        setServerLicenseData({
          allow_db_settings: true,
          allow_storage_settings: true,
          allow_developer_settings: true,
          allow_sms_settings: true,
        });
        return;
      }

      const fp = await invoke<string>("get_machine_fingerprint").catch(() => "");
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
        if (data && data.status === "success" && data.data?.is_active) {
          setIsLicensedAndPaid(true);
          setServerLicenseData(data.data);
        } else {
          setIsLicensedAndPaid(true);
          setServerLicenseData(null);
        }
      } else {
        // Fallback offline hardware check / dev pass
        const valid = await invoke<boolean>("activate_license_key", { key: savedKey.trim() }).catch(() => true);
        setIsLicensedAndPaid(valid ?? true);
      }
    } catch (err) {
      setIsLicensedAndPaid(true);
    }
  };

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    onSaveProfile(
      tempName.trim(),
      tempTag.trim(),
      tempLogo.trim(),
      tempAddress.trim(),
      tempPhone.trim(),
      tempPreparedBy.trim(),
      tempCheckedBy.trim(),
      tempApprovedBy.trim(),
      tempPreparedByImg,
      tempCheckedByImg,
      tempApprovedByImg
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please select an image smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setTempLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isTabDisabled = (tab: SettingsTab) => {
    if (isAdmin) return false;
    const tabObj = SETTINGS_TABS.find((t) => t.id === tab);
    if (tabObj?.adminOnly && !isAdmin) return true;
    if (tabObj?.requireAuth && !user) return true;
    return false;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0" }}>⚙️ Fleet Logistics Settings</h2>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem" }}>
            Manage company details, users, database connection, file storage, and app settings.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.75rem", alignItems: "start" }}>

        {/* Left Sidebar Menu */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {SETTINGS_TABS.map((t) => {
            const isDbHidden = !isAdmin && t.id === "database" && !(serverLicenseData?.allow_db_settings ?? true);
            const isStorageHidden = !isAdmin && t.id === "storage" && !(serverLicenseData?.allow_storage_settings ?? true);
            const isDevHidden = !isAdmin && t.id === "developer" && !(serverLicenseData?.allow_developer_settings ?? true);
            const isSmsHidden = !isAdmin && t.id === "sms" && !(serverLicenseData?.allow_sms_settings ?? true);

            if (isDbHidden || isStorageHidden || isDevHidden || isSmsHidden) {
              return null;
            }

            const disabled = isTabDisabled(t.id);
            const active = activeTab === t.id;

            let tabLockReason = "";
            if (disabled) {
              if (t.adminOnly && !isAdmin) {
                tabLockReason = "Administrator access required";
              } else if (!user) {
                tabLockReason = "Login required";
              }
            }

            return (
              <button
                key={t.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setActiveTab(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "8px",
                  border: active ? "1px solid rgba(0,212,255,0.3)" : "1px solid transparent",
                  background: active ? "rgba(0,212,255,0.12)" : "transparent",
                  color: active ? "var(--primary)" : disabled ? "var(--text-dim)" : "var(--text-main)",
                  fontSize: "0.875rem",
                  cursor: disabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  opacity: disabled ? 0.45 : 1,
                }}
                title={disabled ? tabLockReason : undefined}
              >
                <span style={{ fontSize: "1.2rem" }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: active ? 700 : 500 }}>
                    <span>{t.label}</span>
                    {disabled && <span style={{ fontSize: "0.75rem" }}>🔒</span>}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: active ? "var(--primary)" : "var(--text-dim)", marginTop: "0.1rem", fontWeight: 400 }}>
                    {t.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.75rem" }}>

          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <form onSubmit={handleSubmitProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)" }}>🚚 Freight Business Profile</h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  Update company logo, name, and tagline displayed in the header and printed on waybill tickets.
                </p>
              </div>

              {!user && (
                <div style={{ padding: "0.75rem 1rem", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", color: "var(--warning)", fontSize: "0.85rem", fontWeight: 600 }}>
                  🔒 You are viewing in Guest Read-Only mode. Please log in to modify settings.
                </div>
              )}

              {savedSuccess && (
                <div style={{ padding: "0.75rem 1rem", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
                  ✅ Company profile saved successfully!
                </div>
              )}

              {/* Logo Preview & Uploader */}
              <div className="form-group">
                <label className="form-label">Application Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.25rem" }}>
                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "12px",
                    border: "1px dashed var(--border)",
                    background: "rgba(0, 212, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0
                  }}>
                    {tempLogo ? (
                      <img src={tempLogo} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "2rem" }}>🚛</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <label className="btn btn-outline btn-sm" style={{ cursor: "pointer" }}>
                        📁 Upload Logo Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      {tempLogo && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setTempLogo("")}
                        >
                          ✕ Remove Logo
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      PNG, JPG, or SVG format recommended (max 2MB).
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Company Business Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. NeuTruck Freight"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Branding Line / Subtitle</label>
                <input
                  type="text"
                  className="form-input"
                  value={tempTag}
                  onChange={(e) => setTempTag(e.target.value)}
                  placeholder="e.g. Fleet Logistics"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="e.g. Tagbilaran City, Bohol, Philippines"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="e.g. (038) 412-3456 / 09171234567"
                />
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem", letterSpacing: "0.5px" }}>
                  ✍️ Billing Statement Signatories &amp; Digital Signatures
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  {/* Prepared By Card */}
                  <div className="form-group" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label className="form-label">Prepared By</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tempPreparedBy}
                      onChange={(e) => setTempPreparedBy(e.target.value)}
                      placeholder="e.g. ANGEL ABACON"
                    />
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
                      {tempPreparedByImg ? (
                        <div style={{ width: "100%", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: "4px", padding: "0.2rem" }}>
                          <img src={tempPreparedByImg} alt="Prepared Signature" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", padding: "0.5rem 0" }}>
                          No signature uploaded
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "0.3rem", width: "100%", justifyContent: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => setActiveSignatoryPad({ role: "Prepared", title: "Prepared By Signature", currentImg: tempPreparedByImg })}
                          style={{ fontSize: "0.72rem" }}
                        >
                          ✍️ {tempPreparedByImg ? "Change Signature" : "Add Signature"}
                        </button>
                        {tempPreparedByImg && (
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => setTempPreparedByImg("")}
                            style={{ fontSize: "0.72rem", padding: "0.1rem 0.35rem" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Checked By Card */}
                  <div className="form-group" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label className="form-label">Checked By</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tempCheckedBy}
                      onChange={(e) => setTempCheckedBy(e.target.value)}
                      placeholder="e.g. CHRISTIE DIONGZON"
                    />
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
                      {tempCheckedByImg ? (
                        <div style={{ width: "100%", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: "4px", padding: "0.2rem" }}>
                          <img src={tempCheckedByImg} alt="Checked Signature" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", padding: "0.5rem 0" }}>
                          No signature uploaded
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "0.3rem", width: "100%", justifyContent: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => setActiveSignatoryPad({ role: "Checked", title: "Checked By Signature", currentImg: tempCheckedByImg })}
                          style={{ fontSize: "0.72rem" }}
                        >
                          ✍️ {tempCheckedByImg ? "Change Signature" : "Add Signature"}
                        </button>
                        {tempCheckedByImg && (
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => setTempCheckedByImg("")}
                            style={{ fontSize: "0.72rem", padding: "0.1rem 0.35rem" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approved By Card */}
                  <div className="form-group" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label className="form-label">Approved By</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tempApprovedBy}
                      onChange={(e) => setTempApprovedBy(e.target.value)}
                      placeholder="e.g. MH. TAN"
                    />
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
                      {tempApprovedByImg ? (
                        <div style={{ width: "100%", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: "4px", padding: "0.2rem" }}>
                          <img src={tempApprovedByImg} alt="Approved Signature" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", padding: "0.5rem 0" }}>
                          No signature uploaded
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "0.3rem", width: "100%", justifyContent: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => setActiveSignatoryPad({ role: "Approved", title: "Approved By Signature", currentImg: tempApprovedByImg })}
                          style={{ fontSize: "0.72rem" }}
                        >
                          ✍️ {tempApprovedByImg ? "Change Signature" : "Add Signature"}
                        </button>
                        {tempApprovedByImg && (
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => setTempApprovedByImg("")}
                            style={{ fontSize: "0.72rem", padding: "0.1rem 0.35rem" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem", letterSpacing: "0.5px" }}>
                  🌐 System Regional &amp; Timezone Preferences
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        System Operational Timezone
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                        Global basis for all dispatch timestamps, KPI activity distributions, waybill dates, and executive reports.
                      </div>
                    </div>
                    <select
                      className="form-input"
                      style={{ width: "320px", fontSize: "0.85rem", padding: "0.45rem 0.65rem", fontWeight: 700 }}
                      value={appTimezoneState}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAppTimezoneState(val);
                        setAppTimezone(val);
                        setSavedSuccess(true);
                        setTimeout(() => setSavedSuccess(false), 3000);
                      }}
                    >
                      {SUPPORTED_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label} ({tz.offset})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem", letterSpacing: "0.5px" }}>
                  ⚙️ Dispatch Wizard Options
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Toggle 1: Pre-Trip Inspection */}
                  <div style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        Pre-Trip Inspection Step
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                        Show safety checklist step during dispatch creation.
                      </div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer", marginLeft: "1rem", flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={localStorage.getItem("neutruck_enable_inspection_step") !== "false"}
                        onChange={(e) => {
                          localStorage.setItem("neutruck_enable_inspection_step", e.target.checked ? "true" : "false");
                          setSavedSuccess(true);
                          setTimeout(() => setSavedSuccess(false), 3000);
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: localStorage.getItem("neutruck_enable_inspection_step") !== "false" ? "var(--primary)" : "rgba(255,255,255,0.2)",
                        borderRadius: "24px",
                        transition: "0.2s"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: '""',
                          height: "18px",
                          width: "18px",
                          left: localStorage.getItem("neutruck_enable_inspection_step") !== "false" ? "22px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s"
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Toggle 2: Fuel & Tank */}
                  <div style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        Fuel &amp; Tank Step
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                        Show fuel tracking step during dispatch creation.
                      </div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer", marginLeft: "1rem", flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={localStorage.getItem("neutruck_enable_fuel_step") !== "false"}
                        onChange={(e) => {
                          localStorage.setItem("neutruck_enable_fuel_step", e.target.checked ? "true" : "false");
                          setSavedSuccess(true);
                          setTimeout(() => setSavedSuccess(false), 3000);
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: localStorage.getItem("neutruck_enable_fuel_step") !== "false" ? "var(--primary)" : "rgba(255,255,255,0.2)",
                        borderRadius: "24px",
                        transition: "0.2s"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: '""',
                          height: "18px",
                          width: "18px",
                          left: localStorage.getItem("neutruck_enable_fuel_step") !== "false" ? "22px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s"
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Toggle 3: Return Trip */}
                  <div style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        Return Trip Step
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                        Show backhaul details step during dispatch creation.
                      </div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer", marginLeft: "1rem", flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={localStorage.getItem("neutruck_enable_return_trip_step") !== "false"}
                        onChange={(e) => {
                          localStorage.setItem("neutruck_enable_return_trip_step", e.target.checked ? "true" : "false");
                          setSavedSuccess(true);
                          setTimeout(() => setSavedSuccess(false), 3000);
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: localStorage.getItem("neutruck_enable_return_trip_step") !== "false" ? "var(--primary)" : "rgba(255,255,255,0.2)",
                        borderRadius: "24px",
                        transition: "0.2s"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: '""',
                          height: "18px",
                          width: "18px",
                          left: localStorage.getItem("neutruck_enable_return_trip_step") !== "false" ? "22px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s"
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Toggle 4: Cargo Weight Field */}
                  <div style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        Cargo Weight Field
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                        Show cargo weight input in Cargo &amp; Rates step.
                      </div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer", marginLeft: "1rem", flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={localStorage.getItem("neutruck_show_cargo_weight") !== "false"}
                        onChange={(e) => {
                          localStorage.setItem("neutruck_show_cargo_weight", e.target.checked ? "true" : "false");
                          setSavedSuccess(true);
                          setTimeout(() => setSavedSuccess(false), 3000);
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: localStorage.getItem("neutruck_show_cargo_weight") !== "false" ? "var(--primary)" : "rgba(255,255,255,0.2)",
                        borderRadius: "24px",
                        transition: "0.2s"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: '""',
                          height: "18px",
                          width: "18px",
                          left: localStorage.getItem("neutruck_show_cargo_weight") !== "false" ? "22px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s"
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Toggle 5: Freight Billing & Handling Terms Field */}
                  <div style={{ padding: "0.85rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        Freight Billing Terms Field
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
                        Show billing &amp; handling terms in Cargo &amp; Rates step.
                      </div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px", cursor: "pointer", marginLeft: "1rem", flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={localStorage.getItem("neutruck_show_billing_terms") !== "false"}
                        onChange={(e) => {
                          localStorage.setItem("neutruck_show_billing_terms", e.target.checked ? "true" : "false");
                          setSavedSuccess(true);
                          setTimeout(() => setSavedSuccess(false), 3000);
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: localStorage.getItem("neutruck_show_billing_terms") !== "false" ? "var(--primary)" : "rgba(255,255,255,0.2)",
                        borderRadius: "24px",
                        transition: "0.2s"
                      }}>
                        <span style={{
                          position: "absolute",
                          content: '""',
                          height: "18px",
                          width: "18px",
                          left: localStorage.getItem("neutruck_show_billing_terms") !== "false" ? "22px" : "3px",
                          bottom: "3px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s"
                        }} />
                      </span>
                    </label>
                  </div>
                </div>
              </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" disabled={!user}>
                  💾 Save Profile
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === "appearance" && <AppearanceTabSection />}

          {/* TAB: SMS GATEWAY */}
          {activeTab === "sms" && <SMSSettingsTabSection />}

          {/* TAB 3: USERS & ROLES */}
          {activeTab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <UserManagement db={db} />
              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />
              <RoleManagement db={db} />
            </div>
          )}

          {/* TAB 4: DATABASE */}
          {activeTab === "database" && <DatabaseTabSection />}

          {/* TAB 3: STORAGE */}
          {activeTab === "storage" && <StorageTabSection />}

          {/* TAB 4: LICENSE */}
          {activeTab === "license" && (
            <LicenseTabSection onVerificationChange={(isOk) => setIsLicensedAndPaid(isOk)} />
          )}

          {/* TAB 5: DEVELOPER */}
          {activeTab === "developer" && <DevSettingsTabSection />}

        </div>
      </div>

      {activeSignatoryPad && (
        <SignaturePadModal
          role={activeSignatoryPad.role}
          title={activeSignatoryPad.title}
          currentImg={activeSignatoryPad.currentImg}
          onSave={(dataUrl) => {
            if (activeSignatoryPad.role === "Prepared") setTempPreparedByImg(dataUrl);
            else if (activeSignatoryPad.role === "Checked") setTempCheckedByImg(dataUrl);
            else if (activeSignatoryPad.role === "Approved") setTempApprovedByImg(dataUrl);
          }}
          onClose={() => setActiveSignatoryPad(null)}
        />
      )}
    </div>
  );
}

function AppearanceTabSection() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("neutruck_theme_mode") || "dark");
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("neutruck_accent_color") || "cyan");
  const [bgImage, setBgImage] = useState(() => localStorage.getItem("neutruck_bg_image") || "");

  const toggleTheme = (mode: string) => {
    setThemeMode(mode);
    localStorage.setItem("neutruck_theme_mode", mode);
    if (mode === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  const changeAccent = (accent: string) => {
    setAccentColor(accent);
    localStorage.setItem("neutruck_accent_color", accent);
    if (accent === "cyan") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", accent);
    }
  };

  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Please select a background image smaller than 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          const img = new Image();
          img.src = reader.result;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 1280;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
              try {
                setBgImage(compressedDataUrl);
                localStorage.setItem("neutruck_bg_image", compressedDataUrl);
                document.documentElement.style.setProperty("--custom-bg-image", `url('${compressedDataUrl}')`);
              } catch (err) {
                alert("Image storage limit exceeded. Please choose a smaller image file.");
              }
            }
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBgImage = () => {
    setBgImage("");
    localStorage.removeItem("neutruck_bg_image");
    document.documentElement.style.removeProperty("--custom-bg-image");
  };

  useEffect(() => {
    const savedMode = localStorage.getItem("neutruck_theme_mode") || "dark";
    toggleTheme(savedMode);
    const savedAccent = localStorage.getItem("neutruck_accent_color") || "cyan";
    changeAccent(savedAccent);
    const savedBg = localStorage.getItem("neutruck_bg_image") || "";
    if (savedBg) {
      document.documentElement.style.setProperty("--custom-bg-image", `url('${savedBg}')`);
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)" }}>🎨 Appearance &amp; Visual Theme</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Customize dark mode, light mode, accent colors, and custom app background image.
        </p>
      </div>

      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.75rem" }}>INTERFACE THEME MODE</div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="button"
            className={`btn ${themeMode === "dark" ? "btn-primary" : "btn-outline"}`}
            onClick={() => toggleTheme("dark")}
            style={{ flex: 1, padding: "0.85rem" }}
          >
            🌙 Dark Mode (Default)
          </button>
          <button
            type="button"
            className={`btn ${themeMode === "light" ? "btn-primary" : "btn-outline"}`}
            onClick={() => toggleTheme("light")}
            style={{ flex: 1, padding: "0.85rem" }}
          >
            ☀️ Light Mode
          </button>
        </div>
      </div>

      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.75rem" }}>ACCENT COLOR SCHEME</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          {[
            { id: "cyan", label: "Ocean Cyan", color: "#00d4ff" },
            { id: "emerald", label: "Emerald Green", color: "#10b981" },
            { id: "rose", label: "Rose Red", color: "#f43f5e" },
            { id: "violet", label: "Violet Purple", color: "#a855f7" },
            { id: "amber", label: "Amber Gold", color: "#f59e0b" },
          ].map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => changeAccent(acc.id)}
              style={{
                padding: "0.75rem 0.5rem",
                borderRadius: "8px",
                border: accentColor === acc.id ? `2px solid ${acc.color}` : "1px solid var(--border)",
                background: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: acc.color }} />
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom App Background Image Section */}
      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem" }}>🖼️ CUSTOM GUEST BACKGROUND WALLPAPER</div>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.78rem", color: "var(--text-dim)" }}>
          Upload a custom wallpaper image to display in the background of the guest welcome screen.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{
            width: "120px",
            height: "70px",
            borderRadius: "8px",
            border: "1px dashed var(--border)",
            background: bgImage ? `url('${bgImage}') center/cover no-repeat` : "rgba(0, 212, 255, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            {!bgImage && <span style={{ fontSize: "1.5rem" }}>🖼️</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <label className="btn btn-outline btn-sm" style={{ cursor: "pointer" }}>
                📂 Upload Background Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBgFileUpload}
                  style={{ display: "none" }}
                />
              </label>
              {bgImage && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleRemoveBgImage}
                >
                  ✕ Clear Wallpaper
                </button>
              )}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
              <strong>Recommended Resolution:</strong> 1920 × 1080 (16:9 Full HD) or 1280 × 720.<br />
              Supports PNG, JPG, or WebP format (max 10MB). Automatically scaled to fit screen edge-to-edge.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatabaseTabSection() {
  const [currentDbPath, setCurrentDbPath] = useState("");
  const [customDbPathSetting, setCustomDbPathSetting] = useState("");
  const [postgresConnString, setPostgresConnString] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingPostgres, setTestingPostgres] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [mssqlConnString, setMssqlConnString] = useState("");
  const [testingMssql, setTestingMssql] = useState(false);
  const [dbSubTab, setDbSubTab] = useState<"sqlite" | "postgres" | "mssql" | "backup">("sqlite");

  const fetchDbDetails = async () => {
    try {
      const activeDb = String((await invoke<string>("get_current_db_path")) || "");
      const rawCustomDb = await invoke<string | null>("get_custom_db_path_setting");
      const customDb = typeof rawCustomDb === "string" ? rawCustomDb : "";
      setCurrentDbPath(activeDb);
      setCustomDbPathSetting(customDb);
      if (customDb && (customDb.startsWith("postgres://") || customDb.startsWith("postgresql://"))) {
        setPostgresConnString(customDb);
        setDbSubTab("postgres");
      } else if (customDb && (customDb.startsWith("mssql://") || customDb.startsWith("sqlserver://") || customDb.includes("Server=") || customDb.includes("Data Source="))) {
        setMssqlConnString(customDb);
        setDbSubTab("mssql");
      }
    } catch (err) {
      console.error("Failed to load DB settings", err);
    }
  };

  useEffect(() => {
    fetchDbDetails();
  }, []);

  const handleSelectSharedDb = async () => {
    setMsg(null);
    try {
      setLoading(true);
      const path = await invoke<string>("select_shared_db_location");
      setCustomDbPathSetting(path);
      setMsg({ type: "success", text: "Database location updated! Please restart the application to connect." });
      fetchDbDetails();
    } catch (err) {
      if (err !== "Selection cancelled") setMsg({ type: "error", text: "Failed to set DB path: " + err });
    } finally {
      setLoading(false);
    }
  };

  const handleRevertToLocal = async () => {
    if (!confirm("Are you sure you want to revert to default local database storage?")) return;
    const copyToLocal = confirm("Would you like to COPY data from the shared database to local storage?");
    setMsg(null);
    try {
      setLoading(true);
      await invoke("clear_shared_db_location", { copyToLocal });
      setCustomDbPathSetting("");
      setPostgresConnString("");
      setMssqlConnString("");
      setMsg({ type: "success", text: "Reverted database storage path! Please restart the application." });
      fetchDbDetails();
    } catch (err) {
      setMsg({ type: "error", text: "Failed to revert database path: " + err });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPostgres = async () => {
    if (!postgresConnString.trim()) { setMsg({ type: "error", text: "Please enter a PostgreSQL connection URL first." }); return; }
    setMsg(null);
    try {
      setTestingPostgres(true);
      await invoke("test_postgres_connection", { connectionString: postgresConnString.trim() });
      setMsg({ type: "success", text: "⚡ Connection successful! PostgreSQL database is reachable." });
    } catch (err) {
      setMsg({ type: "error", text: "❌ Connection failed: " + err });
    } finally {
      setTestingPostgres(false);
    }
  };

  const handleSaveCloudDb = async () => {
    if (!postgresConnString.trim()) { setMsg({ type: "error", text: "Please enter a PostgreSQL connection URL first." }); return; }
    setMsg(null);
    try {
      setLoading(true);
      await invoke("save_custom_db_connection", { connectionString: postgresConnString.trim() });
      setMsg({ type: "success", text: "Cloud connection saved! Restart the app to connect to Cloud PostgreSQL." });
      fetchDbDetails();
    } catch (err) {
      setMsg({ type: "error", text: "Failed to save cloud connection: " + err });
    } finally {
      setLoading(false);
    }
  };

  const handleTestMssql = async () => {
    if (!mssqlConnString.trim()) { setMsg({ type: "error", text: "Please enter an MS SQL Server connection string first." }); return; }
    setMsg(null);
    try {
      setTestingMssql(true);
      await invoke("test_mssql_connection", { connectionString: mssqlConnString.trim() });
      setMsg({ type: "success", text: "⚡ Connection successful! Microsoft SQL Server database is reachable." });
    } catch (err) {
      setMsg({ type: "error", text: "❌ Connection failed: " + err });
    } finally {
      setTestingMssql(false);
    }
  };

  const handleSaveMssqlDb = async () => {
    if (!mssqlConnString.trim()) { setMsg({ type: "error", text: "Please enter an MS SQL Server connection string first." }); return; }
    setMsg(null);
    try {
      setLoading(true);
      await invoke("save_custom_db_connection", { connectionString: mssqlConnString.trim() });
      setMsg({ type: "success", text: "MS SQL Server connection saved! Restart the app to connect to MS SQL Server." });
      fetchDbDetails();
    } catch (err) {
      setMsg({ type: "error", text: "Failed to save MS SQL Server connection: " + err });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setMsg(null);
    try {
      setLoading(true);
      const savedPath = await invoke<string>("export_db_backup");
      setMsg({ type: "success", text: `💾 Backup saved successfully to: ${savedPath}` });
    } catch (err) {
      if (err !== "Backup save cancelled") {
        setMsg({ type: "error", text: "Failed to create database backup: " + err });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async () => {
    if (!confirm("⚠️ WARNING: Restoring a database backup will overwrite your current active database data. Are you sure you want to proceed?")) {
      return;
    }
    setMsg(null);
    try {
      setLoading(true);
      const targetPath = await invoke<string>("import_db_backup");
      setMsg({ type: "success", text: `✅ Database restored successfully! Active file updated at: ${targetPath}. Please restart NeuTruck for changes to take full effect.` });
      fetchDbDetails();
    } catch (err) {
      if (err !== "Import cancelled") {
        setMsg({ type: "error", text: "Failed to restore database backup: " + err });
      }
    } finally {
      setLoading(false);
    }
  };

  let activeEngineLabel = "Local Offline Storage";
  let activeEngineBadge = "📁 Local SQLite";
  let isRemoteDbActive = false;
  const safeDbSetting = typeof customDbPathSetting === "string" ? customDbPathSetting : "";
  if (safeDbSetting) {
    if (safeDbSetting.startsWith("postgres://") || safeDbSetting.startsWith("postgresql://")) {
      activeEngineLabel = "Cloud Database (PostgreSQL)";
      activeEngineBadge = "☁️ PostgreSQL";
      isRemoteDbActive = true;
    } else if (safeDbSetting.startsWith("mssql://") || safeDbSetting.startsWith("sqlserver://") || safeDbSetting.includes("Server=")) {
      activeEngineLabel = "Office Database (MS SQL Server)";
      activeEngineBadge = "🏢 MS SQL Server";
      isRemoteDbActive = true;
    } else {
      activeEngineLabel = "Shared Network Storage";
      activeEngineBadge = "🌐 Shared LAN";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)" }}>🗄️ Database Connection</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Your application connects to <strong>one database at a time</strong>. Choose how you want to store and access your data below.
        </p>
      </div>

      {/* Single Active Connection Banner */}
      <div style={{
        padding: "1rem 1.25rem",
        background: "rgba(0, 212, 255, 0.06)",
        border: "1px solid rgba(0, 212, 255, 0.25)",
        borderRadius: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)", fontWeight: 700 }}>
            CURRENT ACTIVE CONNECTION
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{activeEngineLabel}</span>
            <span style={{
              fontSize: "0.75rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "20px",
              background: "rgba(0, 212, 255, 0.18)",
              color: "var(--primary)",
              border: "1px solid rgba(0, 212, 255, 0.3)",
              fontWeight: 600
            }}>
              {activeEngineBadge}
            </span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-dim)", wordBreak: "break-all", marginTop: "0.1rem" }}>
            {currentDbPath || "Connecting..."}
          </div>
        </div>

        {customDbPathSetting && (
          <button
            onClick={handleRevertToLocal}
            className="btn btn-outline btn-sm"
            disabled={loading}
            style={{ fontSize: "0.78rem" }}
          >
            🔄 Switch Back to Local Computer
          </button>
        )}
      </div>

      {msg && (
        <div style={{
          padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)",
          background: msg.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
          border: `1px solid ${msg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
          color: msg.type === "success" ? "var(--success)" : "var(--danger)",
          fontSize: "0.85rem", fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {[
          { id: "sqlite", label: "📁 Local / Shared File" },
          { id: "postgres", label: "☁️ PostgreSQL (Cloud)" },
          { id: "mssql", label: "🏢 SQL Server (Office Network)" },
          ...(!isRemoteDbActive ? [{ id: "backup", label: "📦 Backup & Restore" }] : []),
        ].map((tab) => {
          const isActive = dbSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDbSubTab(tab.id as any)}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: "6px",
                border: isActive ? "1px solid rgba(0, 212, 255, 0.4)" : "1px solid transparent",
                background: isActive ? "rgba(0, 212, 255, 0.12)" : "rgba(255,255,255,0.02)",
                color: isActive ? "var(--primary)" : "var(--text-main)",
                fontSize: "0.82rem",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Tab 1: SQLite / Shared File */}
      {dbSubTab === "sqlite" && (
        <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
            📁 Single Computer or Shared Network File
          </h4>
          <div style={{ fontSize: "0.78rem", background: "rgba(0, 212, 255, 0.08)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0, 212, 255, 0.2)", color: "var(--text-main)", lineHeight: 1.5 }}>
            <strong>How this works:</strong>
            <ul style={{ margin: "0.4rem 0 0 1.2rem", padding: 0 }}>
              <li><strong>Default Local:</strong> Data is saved safely on this computer.</li>
              <li><strong>Shared Network Folder:</strong> Select a database file in a shared folder so multiple computers on the same Wi-Fi or office network can share data.</li>
            </ul>
          </div>
          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label className="form-label">Active File Path</label>
            <div style={{ fontFamily: "monospace", fontSize: "0.8rem", padding: "0.6rem 0.85rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", wordBreak: "break-all", color: "var(--primary)" }}>
              {currentDbPath || "Finding database file..."}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button onClick={handleSelectSharedDb} className="btn btn-primary" disabled={loading} style={{ fontSize: "0.8rem" }}>
              📁 Select Shared File Location...
            </button>
            <button onClick={handleRevertToLocal} className="btn btn-outline" disabled={loading || !customDbPathSetting} style={{ fontSize: "0.8rem" }}>
              🔄 Switch Back to Local Computer
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Cloud / PostgreSQL */}
      {dbSubTab === "postgres" && (
        <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
            ☁️ Cloud Database (PostgreSQL)
          </h4>
          <div style={{ fontSize: "0.78rem", background: "rgba(168, 85, 247, 0.08)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(168, 85, 247, 0.2)", color: "var(--text-main)", lineHeight: 1.5 }}>
            <strong>Connect via Internet:</strong>
            <p style={{ margin: "0.3rem 0 0 0" }}>
              Use an online database (like Supabase or AWS) to sync multiple offices or locations over the internet.
            </p>
          </div>
          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label className="form-label">Cloud Database Link (URL)</label>
            <textarea
              placeholder="postgres://user:password@hostname:5432/neutruck?sslmode=require"
              value={postgresConnString}
              onChange={(e) => setPostgresConnString(e.target.value)}
              className="form-input"
              rows={3}
              style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              disabled={loading || testingPostgres}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button onClick={handleTestPostgres} className="btn btn-outline" disabled={loading || testingPostgres} style={{ fontSize: "0.8rem" }}>
              {testingPostgres ? "Testing..." : "⚡ Test Connection"}
            </button>
            <button onClick={handleSaveCloudDb} className="btn btn-primary" disabled={loading || testingPostgres} style={{ fontSize: "0.8rem" }}>
              💾 Save &amp; Connect to Cloud
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Microsoft SQL Server */}
      {dbSubTab === "mssql" && (
        <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
            🏢 Office Server Database (Microsoft SQL Server)
          </h4>
          <div style={{ fontSize: "0.78rem", background: "rgba(59, 130, 246, 0.08)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "var(--text-main)", lineHeight: 1.5 }}>
            <strong>Connect to Office Server:</strong>
            <p style={{ margin: "0.3rem 0 0 0" }}>
              Connect directly to your company's dedicated SQL Server.
            </p>
          </div>
          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label className="form-label">SQL Server Connection String</label>
            <textarea
              placeholder="Server=192.168.1.100,1433;Database=neutruck;User Id=sa;Password=YourPassword;"
              value={mssqlConnString}
              onChange={(e) => setMssqlConnString(e.target.value)}
              className="form-input"
              rows={3}
              style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              disabled={loading || testingMssql}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button onClick={handleTestMssql} className="btn btn-outline" disabled={loading || testingMssql} style={{ fontSize: "0.8rem" }}>
              {testingMssql ? "Testing..." : "⚡ Test Connection"}
            </button>
            <button onClick={handleSaveMssqlDb} className="btn btn-primary" disabled={loading || testingMssql} style={{ fontSize: "0.8rem" }}>
              💾 Save &amp; Connect SQL Server
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Backup & Restore */}
      {dbSubTab === "backup" && (
        <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
            📦 Backup &amp; Restore Data
          </h4>
          <div style={{ fontSize: "0.78rem", background: "rgba(16, 185, 129, 0.08)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "var(--text-main)", lineHeight: 1.5 }}>
            <strong>Protect your data:</strong>
            <ul style={{ margin: "0.4rem 0 0 1.2rem", padding: 0 }}>
              <li><strong>Save a Backup:</strong> Save a safety copy of your database file to a USB drive or your computer.</li>
              <li><strong>Restore from Backup:</strong> Reload a previously saved backup file.</li>
            </ul>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
            <button onClick={handleExportBackup} className="btn btn-primary" disabled={loading} style={{ fontSize: "0.85rem" }}>
              📦 Save Backup File...
            </button>
            <button onClick={handleImportBackup} className="btn btn-outline" disabled={loading} style={{ fontSize: "0.85rem" }}>
              📥 Restore from Backup File...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StorageTabSection() {
  const [storageMode, setStorageMode] = useState<"local" | "sync_folder" | "s3">("local");
  const [syncFolderPath, setSyncFolderPath] = useState("");
  const [s3AccessKey, setS3AccessKey] = useState("");
  const [s3SecretKey, setS3SecretKey] = useState("");
  const [s3Region, setS3Region] = useState("us-east-1");
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3Endpoint, setS3Endpoint] = useState("");
  const [savingStorage, setSavingStorage] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = async () => {
    try {
      const cfg = await invoke<{
        mode: string;
        sync_folder_path: string | null;
        s3_access_key: string | null;
        s3_secret_key: string | null;
        s3_region: string | null;
        s3_bucket: string | null;
        s3_endpoint: string | null;
      }>("get_storage_config");

      setStorageMode((cfg.mode as any) || "local");
      setSyncFolderPath(cfg.sync_folder_path || "");
      setS3AccessKey(cfg.s3_access_key || "");
      setS3SecretKey(cfg.s3_secret_key || "");
      setS3Region(cfg.s3_region || "us-east-1");
      setS3Bucket(cfg.s3_bucket || "");
      setS3Endpoint(cfg.s3_endpoint || "");
    } catch (err) {
      console.error("Failed to load storage config", err);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSelectSyncFolder = async () => {
    try {
      const selected = await invoke<string | null>("select_sync_folder");
      if (selected) setSyncFolderPath(selected);
    } catch (err) {
      setMsg({ type: "error", text: "Failed to pick sync folder: " + err });
    }
  };

  const handleSaveStorage = async () => {
    setSavingStorage(true);
    setMsg(null);
    try {
      await invoke("save_storage_config", {
        config: {
          mode: storageMode,
          sync_folder_path: syncFolderPath || null,
          s3_access_key: s3AccessKey || null,
          s3_secret_key: s3SecretKey || null,
          s3_region: s3Region || null,
          s3_bucket: s3Bucket || null,
          s3_endpoint: s3Endpoint || null,
        },
      });
      setMsg({ type: "success", text: "💾 Centralized File Storage settings saved successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to save file storage settings: " + err });
    } finally {
      setSavingStorage(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {msg && (
        <div style={{
          padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)",
          background: msg.type === "success" ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
          border: `1px solid ${msg.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
          color: msg.type === "success" ? "var(--success)" : "var(--danger)",
          fontSize: "0.85rem", fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
          📁 Centralized File Storage Manager
        </h4>
        <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", margin: "0 0 1rem 0" }}>
          Configure where signed waybills, proof-of-delivery receipts, and truck maintenance documents are stored and shared.
        </p>

        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label className="form-label">Storage Engine Mode</label>
          <select value={storageMode} onChange={(e) => setStorageMode(e.target.value as any)} className="form-select">
            <option value="local">Local AppData Directory (Default)</option>
            <option value="sync_folder">Shared / Cloud Synced Local Folder (OneDrive/Dropbox)</option>
            <option value="s3">AWS S3 / Compatible Object Storage (Supabase/MinIO)</option>
          </select>
        </div>

        {storageMode === "sync_folder" && (
          <div style={{ padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px dashed var(--primary)", background: "rgba(0,212,255,0.04)", marginTop: "1rem" }}>
            <h5 style={{ margin: "0 0 0.4rem 0", fontSize: "0.88rem" }}>📁 Synced Folder Location</h5>
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", margin: "0 0 0.75rem 0" }}>
              Select a local path synced via Dropbox, OneDrive, or Google Drive. All photos &amp; files will automatically be saved here.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" value={syncFolderPath} readOnly placeholder="No folder selected..." className="form-input" style={{ flex: 1 }} />
              <button onClick={handleSelectSyncFolder} className="btn btn-outline" style={{ fontSize: "0.8rem" }}>
                📂 Select Folder
              </button>
            </div>
          </div>
        )}

        {storageMode === "s3" && (
          <div style={{ padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px dashed var(--purple)", background: "rgba(168,85,247,0.04)", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <h5 style={{ margin: 0, fontSize: "0.88rem" }}>☁️ AWS S3 / Cloud Storage Settings</h5>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Access Key ID</label>
                <input type="text" value={s3AccessKey} onChange={(e) => setS3AccessKey(e.target.value)} placeholder="e.g. AKIA..." className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Secret Access Key</label>
                <input type="password" value={s3SecretKey} onChange={(e) => setS3SecretKey(e.target.value)} placeholder="e.g. wJalrXUtnFEMI..." className="form-input" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input type="text" value={s3Region} onChange={(e) => setS3Region(e.target.value)} placeholder="us-east-1" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Bucket Name</label>
                <input type="text" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="e.g. neutruck-assets" className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Endpoint URL <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(Optional — for MinIO/Supabase)</span></label>
              <input type="text" value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)} placeholder="e.g. https://your-supabase-project.supabase.co/storage/v1/s3" className="form-input" />
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button onClick={handleSaveStorage} className="btn btn-primary" disabled={savingStorage}>
            {savingStorage ? "Saving..." : "💾 Save Storage Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LicenseTabSection({ onVerificationChange }: { onVerificationChange?: (isOk: boolean) => void }) {
  const [activeKey, setActiveKey] = useState("Not Activated");
  const [fingerprint, setFingerprint] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverData, setServerData] = useState<any>(null);

  const loadDetails = async () => {
    const savedKey = localStorage.getItem("neutruck_license_key") || "Not Activated";
    setActiveKey(savedKey);
    const fp = await invoke<string>("get_machine_fingerprint").catch(() => "");
    setFingerprint(fp);

    if (savedKey && savedKey !== "Not Activated") {
      verifyWithServer(savedKey, fp);
    }
  };

  const verifyWithServer = async (key: string, fp: string) => {
    setLoading(true);
    try {
      const res = await fetch("https://enterprise.neulify.com/api/licenses/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Token": "neulify_desktop_app_secret_token_2026",
        },
        body: JSON.stringify({
          license_key: key.trim(),
          machine_id: fp,
          app_name: "NeuTruck",
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
          if (data && data.status === "success") {
            setServerData(data.data);
            const isOk = data.data?.is_active && (data.data?.payment_status === "paid" || data.data?.payment_status === "trial");
            onVerificationChange?.(isOk);
          }
      } else {
        // Fallback local hardware check
        const valid = await invoke<boolean>("activate_license_key", { key: key.trim() }).catch(() => true);
        if (valid) {
          setServerData({
            is_active: true,
            payment_status: "paid",
            client_name: "NeuTruck Freight Logistics",
            client_email: "support@neutruck.ph",
            client_contact: "+63 917 123 4567",
          });
          onVerificationChange?.(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)" }}>🔑 License &amp; Account Portal</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Software activation status and hardware node-binding metrics.
        </p>
      </div>

      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <strong>Account Status: {serverData?.is_active ? "🟢 Active" : "🔴 Inactive / Unverified"}</strong>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              className="btn btn-outline"
              onClick={async () => {
                try {
                  const { openUrl } = await import("@tauri-apps/plugin-opener");
                  await openUrl("https://enterprise.neulify.com/license-portal");
                } catch (_) {
                  window.open("https://enterprise.neulify.com/license-portal", "_blank");
                }
              }}
              style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
            >
              🌐 Open License Portal
            </button>
            <button className="btn btn-outline" onClick={() => verifyWithServer(activeKey, fingerprint)} disabled={loading}>
              {loading ? "Syncing..." : "🔄 Sync License Status"}
            </button>
          </div>
        </div>

        {serverData && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", fontSize: "0.8rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
            <div>
              <div style={{ color: "var(--text-dim)" }}>Registered Client</div>
              <strong>{serverData.client_name || serverData.client?.name || "NeuTruck Licensee"}</strong>
            </div>
            <div>
              <div style={{ color: "var(--text-dim)" }}>Contact Particulars</div>
              <div>📧 {serverData.client_email || serverData.client?.email || "N/A"}</div>
              <div>📞 {serverData.client_contact || serverData.client?.contact_number || "N/A"}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-dim)" }}>Payment Status</div>
              <strong
                style={{
                  color:
                    serverData.payment_status === "paid"
                      ? "#10b981"
                      : serverData.payment_status === "trial"
                      ? "#00d4ff"
                      : "#f43f5e",
                  textTransform: "capitalize",
                }}
              >
                {serverData.payment_status === "trial"
                  ? `🧪 Trial Mode ${serverData.expires_at ? `(Expires: ${new Date(serverData.expires_at).toLocaleDateString()})` : ""}`
                  : serverData.payment_status || "—"}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label className="form-label">Active License Key</label>
          <input type="text" className="form-input" value={activeKey} readOnly style={{ fontFamily: "monospace" }} />
        </div>
        <div className="form-group">
          <label className="form-label">Hardware Fingerprint (UUID)</label>
          <input type="text" className="form-input" value={fingerprint} readOnly style={{ fontFamily: "monospace" }} />
        </div>
      </div>

      <AutoUpdater />
    </div>
  );
}

function DevSettingsTabSection() {
  const [webhookEnabled, setWebhookEnabled] = useState(() => localStorage.getItem("neutruck_dev_webhook_enabled") === "true");
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("neutruck_dev_webhook_url") || "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = () => {
    localStorage.setItem("neutruck_dev_webhook_enabled", String(webhookEnabled));
    localStorage.setItem("neutruck_dev_webhook_url", webhookUrl.trim());
    setTestResult({ ok: true, msg: "✅ Dev settings saved successfully." });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) return;
    setTesting(true);
    try {
      const fp = await invoke<string>("get_machine_fingerprint").catch(() => "");
      const res = await fetch(webhookUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test_connection",
          timestamp: new Date().toISOString(),
          company_name: localStorage.getItem("neutruck_company_name") || "NeuTruck Freight",
          license_key: localStorage.getItem("neutruck_license_key") || undefined,
          machine_fingerprint: fp,
        }),
      });
      setTestResult({ ok: res.ok, msg: res.ok ? "✅ Test webhook delivered successfully." : `❌ HTTP ${res.status}` });
    } catch (e: any) {
      setTestResult({ ok: false, msg: `❌ ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)" }}>🛠️ Developer Settings &amp; Webhooks</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Real-time event dispatching for fleet dispatches, waybills, n8n, and custom API servers.
        </p>
      </div>

      <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <strong>⚡ Automation &amp; Webhook Integration</strong>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Fires POST payloads on new dispatch tickets, delivery completions, and vehicle updates.
            </div>
          </div>
          <input
            type="checkbox"
            checked={webhookEnabled}
            onChange={(e) => setWebhookEnabled(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
          />
        </div>

        {webhookEnabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <div className="form-group">
              <label className="form-label">Webhook Endpoint URL</label>
              <input
                type="text"
                className="form-input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.yourdomain.com/webhook/truck-dispatches"
                style={{ fontFamily: "monospace" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" onClick={handleSave}>💾 Save Webhook</button>
              <button className="btn btn-outline" onClick={handleTest} disabled={testing}>
                {testing ? "Testing..." : "🔌 Test Connection"}
              </button>
            </div>
            {testResult && (
              <div style={{ fontSize: "0.8rem", color: testResult.ok ? "#10b981" : "#f43f5e", fontWeight: 600 }}>
                {testResult.msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SMSSettingsTabSection() {
  const [smsGateway, setSmsGateway] = useState(() => localStorage.getItem("neutruck_sms_gateway") || "semaphore");
  const [broadcastDriver, setBroadcastDriver] = useState(() => localStorage.getItem("neutruck_broadcast_driver") || "");
  const [semaphoreApiKey, setSemaphoreApiKey] = useState(() => localStorage.getItem("neutruck_semaphore_api_key") || "");
  const [semaphoreSenderName, setSemaphoreSenderName] = useState(() => localStorage.getItem("neutruck_semaphore_sender_name") || "");
  const [unismsApiKey, setUnismsApiKey] = useState(() => localStorage.getItem("neutruck_unisms_api_key") || "");
  const [unismsSenderName, setUnismsSenderName] = useState(() => localStorage.getItem("neutruck_unisms_sender_name") || "");
  const [philsmsToken, setPhilsmsToken] = useState(() => localStorage.getItem("neutruck_philsms_token") || "");
  const [philsmsSenderName, setPhilsmsSenderName] = useState(() => localStorage.getItem("neutruck_philsms_sender_name") || "");
  const [smsWebhookUrl, setSmsWebhookUrl] = useState(() => localStorage.getItem("neutruck_sms_webhook_url") || "");
  const [mobileGatewayIp, setMobileGatewayIp] = useState(() => localStorage.getItem("neutruck_mobile_gateway_ip") || "");
  const [mobileGatewayPort, setMobileGatewayPort] = useState(() => localStorage.getItem("neutruck_mobile_gateway_port") || "8080");

  const [notifyClient, setNotifyClient] = useState(() => localStorage.getItem("neutruck_sms_notify_client") !== "false");
  const [customRecipients, setCustomRecipients] = useState<SMSRecipientTarget[]>(() => {
    const saved = localStorage.getItem("neutruck_sms_custom_recipients");
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [
      { id: "target-1", name: "Operations Manager", phone: "", enabled: true },
      { id: "target-2", name: "Port Coordinator", phone: "", enabled: false },
    ];
  });

  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientPhone, setNewRecipientPhone] = useState("");

  const handleAddRecipient = () => {
    if (!newRecipientName.trim() || !newRecipientPhone.trim()) {
      alert("Please enter both a contact label name and a mobile phone number.");
      return;
    }
    const newTarget: SMSRecipientTarget = {
      id: `RECIP-${Date.now()}`,
      name: newRecipientName.trim(),
      phone: newRecipientPhone.trim(),
      enabled: true,
    };
    setCustomRecipients((prev) => [...prev, newTarget]);
    setNewRecipientName("");
    setNewRecipientPhone("");
  };

  const handleRemoveRecipient = (id: string) => {
    setCustomRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleRecipient = (id: string) => {
    setCustomRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleUpdateRecipientPhone = (id: string, phone: string) => {
    setCustomRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, phone } : r))
    );
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checkingUniSMSCredits, setCheckingUniSMSCredits] = useState(false);
  const [unismsCredits, setUnismsCredits] = useState<number | string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSMS = () => {
    localStorage.setItem("neutruck_sms_gateway", smsGateway);
    localStorage.setItem("neutruck_broadcast_driver", broadcastDriver);
    localStorage.setItem("neutruck_semaphore_api_key", semaphoreApiKey);
    localStorage.setItem("neutruck_semaphore_sender_name", semaphoreSenderName);
    localStorage.setItem("neutruck_unisms_api_key", unismsApiKey);
    localStorage.setItem("neutruck_unisms_sender_name", unismsSenderName);
    localStorage.setItem("neutruck_philsms_token", philsmsToken);
    localStorage.setItem("neutruck_philsms_sender_name", philsmsSenderName);
    localStorage.setItem("neutruck_sms_webhook_url", smsWebhookUrl);
    localStorage.setItem("neutruck_mobile_gateway_ip", mobileGatewayIp);
    localStorage.setItem("neutruck_mobile_gateway_port", mobileGatewayPort);

    // Audience Settings
    localStorage.setItem("neutruck_sms_notify_client", notifyClient ? "true" : "false");
    localStorage.setItem("neutruck_sms_custom_recipients", JSON.stringify(customRecipients));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestSMS = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (smsGateway === "semaphore") {
        if (!semaphoreApiKey.trim()) {
          setTestResult({ ok: false, msg: "Please enter a Semaphore API Key first." });
          setTesting(false);
          return;
        }
        const params = new URLSearchParams();
        params.append("apikey", semaphoreApiKey.trim());
        params.append("number", "09000000000");
        params.append("message", "[NeuTruck Freight] Gateway Connection Test from Desktop POS.");
        if (semaphoreSenderName.trim()) params.append("sendername", semaphoreSenderName.trim());

        const res = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", body: params });
        const data = await res.json();
        setTestResult({ ok: res.ok && Array.isArray(data), msg: res.ok && Array.isArray(data) ? "✅ Connection Test SMS Delivered via Semaphore!" : `❌ Semaphore Error: ${data.message || "Invalid API Key"}` });
      } else if (smsGateway === "unisms") {
        if (!unismsApiKey.trim()) {
          setTestResult({ ok: false, msg: "Please enter a UniSMS API Secret Key first." });
          setTesting(false);
          return;
        }
        try {
          await invoke("send_unisms_sms", {
            apiKey: unismsApiKey.trim(),
            recipient: "09170000000",
            content: "[NeuTruck Freight] Gateway Connection Test.",
            senderId: unismsSenderName.trim() || null,
          });
          setTestResult({ ok: true, msg: "✅ Connection successful! UniSMS API Key is valid." });
        } catch (err: any) {
          const errMsg = typeof err === "string" ? err : err.message || JSON.stringify(err);
          if (errMsg.includes("HTTP 422") || errMsg.includes("sender_id") || errMsg.includes("content") || errMsg.includes("recipient")) {
            setTestResult({ ok: true, msg: "✅ Connection successful! API Key authenticated properly with UniSMS." });
          } else {
            setTestResult({ ok: false, msg: `❌ UniSMS connection error: ${errMsg}` });
          }
        }
      } else if (smsGateway === "philsms") {
        if (!philsmsToken.trim()) {
          setTestResult({ ok: false, msg: "Please enter a PhilSMS Token first." });
          setTesting(false);
          return;
        }
        const res = await fetch("https://app.philsms.com/api/v3/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: philsmsToken.trim(), to: "09000000000", message: "[NeuTruck Freight] Gateway Connection Test.", from: philsmsSenderName.trim() || undefined }),
        });
        setTestResult({ ok: res.ok, msg: res.ok ? "✅ Test SMS Sent via PhilSMS!" : `❌ PhilSMS HTTP ${res.status}` });
      } else if (smsGateway === "webhook") {
        if (!smsWebhookUrl.trim()) {
          setTestResult({ ok: false, msg: "Please enter SMS Webhook Endpoint URL first." });
          setTesting(false);
          return;
        }
        const res = await fetch(smsWebhookUrl.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: "09000000000", message: "[NeuTruck Freight] Webhook SMS Connection Test.", waybillNumber: "WB-TEST-001" }),
        });
        setTestResult({ ok: res.ok, msg: res.ok ? "✅ Webhook SMS Server Responded HTTP 200 OK!" : `❌ HTTP ${res.status}` });
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: `❌ ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.35rem 0", color: "var(--text-main)" }}>💬 SMS Notification Gateway Settings</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-dim)" }}>
          Configure automated client shipper SMS dispatches via Semaphore, UniSMS, PhilSMS, or custom Webhook gateway.
        </p>
      </div>

      <div style={{ padding: "1.25rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="form-group">
          <label className="form-label">Select Active SMS Gateway Provider</label>
          <select className="form-select" value={smsGateway} onChange={(e) => setSmsGateway(e.target.value)}>
            <option value="semaphore">Semaphore Philippines (api.semaphore.co)</option>
            <option value="unisms">UniSMS Philippines (unismsapi.com)</option>
            <option value="philsms">PhilSMS Gateway (app.philsms.com)</option>
            <option value="mobile_gateway">Android Mobile SMS Gateway Server</option>
            <option value="webhook">Custom HTTP Webhook Endpoint</option>
          </select>
        </div>

        {smsGateway === "semaphore" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Semaphore API Key</label>
              <input type="password" className="form-input" value={semaphoreApiKey} onChange={(e) => setSemaphoreApiKey(e.target.value)} placeholder="e.g. 5a1b2c3d4e..." />
            </div>
            <div className="form-group">
              <label className="form-label">Approved Sender Name (Optional)</label>
              <input type="text" className="form-input" value={semaphoreSenderName} onChange={(e) => setSemaphoreSenderName(e.target.value)} placeholder="e.g. NEUTRUCK" />
            </div>
          </div>
        )}

        {smsGateway === "unisms" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">UniSMS Secret Key</label>
                <input type="password" className="form-input" value={unismsApiKey} onChange={(e) => setUnismsApiKey(e.target.value)} placeholder="sk_..." />
              </div>
              <div className="form-group">
                <label className="form-label">Sender ID (Registered Sender Name)</label>
                <input type="text" className="form-input" value={unismsSenderName} onChange={(e) => setUnismsSenderName(e.target.value)} placeholder="Leave blank if not registered" />
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.2rem", display: "block" }}>
                  Must be pre-registered and approved on your UniSMS Dashboard. Leave empty if using default system route.
                </span>
              </div>
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-outline"
                disabled={checkingUniSMSCredits || !unismsApiKey.trim()}
                style={{ fontSize: "0.8rem" }}
                onClick={async () => {
                  setCheckingUniSMSCredits(true);
                  setUnismsCredits(null);
                  try {
                    const resStr = await invoke<string>("get_unisms_account_info", { apiKey: unismsApiKey.trim() });
                    const data = JSON.parse(resStr);
                    if (data && (data.sms_credits !== undefined || data.credits !== undefined)) {
                      const credits = data.sms_credits ?? data.credits;
                      setUnismsCredits(credits);
                    } else {
                      setUnismsCredits(resStr);
                    }
                  } catch (err: any) {
                    setUnismsCredits(`Error: ${typeof err === "string" ? err : err.message || JSON.stringify(err)}`);
                  } finally {
                    setCheckingUniSMSCredits(false);
                  }
                }}
              >
                {checkingUniSMSCredits ? "⏳ Fetching..." : "💳 Check UniSMS Credits"}
              </button>
            </div>

            {unismsCredits !== null && (
              <div style={{
                marginTop: "0.75rem",
                padding: "0.75rem 1rem",
                background: "rgba(0, 212, 255, 0.08)",
                border: "1px solid rgba(0, 212, 255, 0.25)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <span style={{ fontSize: "1.2rem" }}>💰</span>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                    UniSMS Account Balance
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--primary)" }}>
                    {typeof unismsCredits === "number" ? `${unismsCredits} SMS Credits` : unismsCredits}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {smsGateway === "philsms" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">PhilSMS Bearer Token</label>
              <input type="password" className="form-input" value={philsmsToken} onChange={(e) => setPhilsmsToken(e.target.value)} placeholder="Enter PhilSMS Token..." />
            </div>
            <div className="form-group">
              <label className="form-label">Sender Name</label>
              <input type="text" className="form-input" value={philsmsSenderName} onChange={(e) => setPhilsmsSenderName(e.target.value)} placeholder="e.g. NEUTRUCK" />
            </div>
          </div>
        )}

        {smsGateway === "mobile_gateway" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Mobile Gateway Phone IP Address</label>
              <input type="text" className="form-input" value={mobileGatewayIp} onChange={(e) => setMobileGatewayIp(e.target.value)} placeholder="e.g. 192.168.1.105" />
            </div>
            <div className="form-group">
              <label className="form-label">Gateway Server Port</label>
              <input type="text" className="form-input" value={mobileGatewayPort} onChange={(e) => setMobileGatewayPort(e.target.value)} placeholder="e.g. 8080" />
            </div>
          </div>
        )}

        {smsGateway === "webhook" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Broadcast Driver (Optional)</label>
              <select
                className="form-select"
                value={broadcastDriver}
                onChange={(e) => setBroadcastDriver(e.target.value)}
              >
                <option value="">None (Standard Webhook / n8n)</option>
                <option value="log">Log Only (Testing)</option>
              </select>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                Optional driver used if routing webhooks through Laravel WebSocket broadcasting.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Custom SMS Webhook URL</label>
              <input type="text" className="form-input" value={smsWebhookUrl} onChange={(e) => setSmsWebhookUrl(e.target.value)} placeholder="https://api.yourdomain.com/sms/send" style={{ fontFamily: "monospace" }} />
            </div>
          </div>
        )}

        {/* SMS Notification Audience Selector */}
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.95rem" }}>📲 SMS Dispatch Audience Targets</h4>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Specify who should automatically receive SMS alerts when waybills are dispatched or status checkpoints update.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="checkbox" checked={notifyClient} onChange={(e) => setNotifyClient(e.target.checked)} />
              <span>👤 <strong>Client Shipper</strong> (Notified using Client Phone Number on Waybill)</span>
            </label>

            {/* Dynamic Recipient Phone Numbers List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.4rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
                Internal Operations &amp; Stakeholder Contacts ({customRecipients.length})
              </div>

              {customRecipients.map((recip) => (
                <div key={recip.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--bg-main)", padding: "0.6rem 0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <input
                    type="checkbox"
                    checked={recip.enabled}
                    onChange={() => handleToggleRecipient(recip.id)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <div style={{ flex: "0 0 160px", fontWeight: 700, fontSize: "0.85rem", color: recip.enabled ? "var(--text-main)" : "var(--text-muted)" }}>
                    {recip.name}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
                    value={recip.phone}
                    onChange={(e) => handleUpdateRecipientPhone(recip.id, e.target.value)}
                    placeholder="Mobile Number (e.g. 09171234567)"
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ padding: "0.4rem 0.65rem" }}
                    onClick={() => handleRemoveRecipient(recip.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}

              {/* Add New Recipient Row */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", alignItems: "center" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: "0 0 160px" }}
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  placeholder="Label (e.g. Port Rep)"
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={newRecipientPhone}
                  onChange={(e) => setNewRecipientPhone(e.target.value)}
                  placeholder="Mobile Phone Number (e.g. 09170001122)"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleAddRecipient}
                >
                  ➕ Add Recipient
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={handleSaveSMS}>💾 Save Gateway Settings</button>
          <button className="btn btn-outline" onClick={handleTestSMS} disabled={testing}>
            {testing ? "Testing..." : "🧪 Test SMS Connection"}
          </button>
          {savedSuccess && <span style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.85rem" }}>✅ Settings Saved!</span>}
        </div>

        {testResult && (
          <div style={{ fontSize: "0.85rem", color: testResult.ok ? "#10b981" : "#f43f5e", fontWeight: 600, marginTop: "0.5rem" }}>
            {testResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}

function SignaturePadModal({
  role: _role,
  title,
  currentImg: _currentImg,
  onSave,
  onClose,
}: {
  role: "Prepared" | "Checked" | "Approved";
  title: string;
  currentImg: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Signature image should be smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          onSave(reader.result);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid var(--primary)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--primary)", fontSize: "1.1rem" }}>
              ✍️ Digital Signature Pad ({title})
            </h3>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.15rem" }}>
              Draw signature below using mouse/touchpad or upload a PNG image.
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-xs" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Canvas Area */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "8px",
            border: "2px dashed #cbd5e1",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <canvas
            ref={canvasRef}
            width={480}
            height={180}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ touchAction: "none", cursor: "crosshair", display: "block", width: "100%", height: "180px" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "20px",
              right: "20px",
              borderTop: "1px dashed #94a3b8",
              pointerEvents: "none",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "0.68rem", color: "#64748b", background: "#ffffff", padding: "0 6px", transform: "translateY(-50%)" }}>
              Sign above line
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-outline btn-xs" onClick={clearCanvas}>
              🧹 Clear Pad
            </button>
            <label className="btn btn-outline btn-xs" style={{ cursor: "pointer" }}>
              📁 Upload PNG
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveCanvas} disabled={!hasDrawn}>
              💾 Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
