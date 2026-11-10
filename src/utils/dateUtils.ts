export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  { value: "Asia/Manila", label: "Philippine Standard Time (PHT)", offset: "UTC+8" },
  { value: "Asia/Singapore", label: "Singapore Standard Time (SGT)", offset: "UTC+8" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)", offset: "UTC+9" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (HKT)", offset: "UTC+8" },
  { value: "Asia/Bangkok", label: "Indochina Time (ICT)", offset: "UTC+7" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)", offset: "UTC+4" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)", offset: "UTC+0" },
  { value: "Europe/London", label: "Greenwich Mean / British Time (GMT/BST)", offset: "UTC+0/+1" },
  { value: "America/New_York", label: "Eastern Standard Time (EST/EDT)", offset: "UTC-5/-4" },
  { value: "America/Chicago", label: "Central Standard Time (CST/CDT)", offset: "UTC-6/-5" },
  { value: "America/Los_Angeles", label: "Pacific Standard Time (PST/PDT)", offset: "UTC-8/-7" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AEST)", offset: "UTC+10/+11" },
];

export const DEFAULT_TIMEZONE = "Asia/Manila";

/**
 * Gets currently configured Application Timezone from localStorage
 */
export function getAppTimezone(): string {
  if (typeof localStorage === "undefined") return DEFAULT_TIMEZONE;
  return localStorage.getItem("neutruck_app_timezone") || DEFAULT_TIMEZONE;
}

/**
 * Saves new Application Timezone to localStorage
 */
export function setAppTimezone(timezone: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("neutruck_app_timezone", timezone);
  }
}

/**
 * Robustly parses a date string into a Date object.
 * Handles UTC strings from DB (e.g. "2026-09-30 15:10" without Z) and ISO strings.
 */
export function parseAppDate(rawDateStr?: string | null): Date | null {
  if (!rawDateStr) return null;
  let str = rawDateStr.trim();
  // If string is ISO timestamp from DB without Z or offset (e.g. "2026-09-30 15:10"),
  // it was serialized from toISOString() in UTC, so append 'Z' to treat as UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    str = str.replace(" ", "T") + "Z";
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Extract hour of the day (0-23) in configured Application Timezone
 */
export function getAppHour(rawDateStr?: string | null, targetTimezone?: string): number {
  const d = parseAppDate(rawDateStr);
  if (!d) return -1;
  const tz = targetTimezone || getAppTimezone();
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(d);
    return parseInt(hourStr, 10) % 24;
  } catch {
    return d.getHours();
  }
}

/**
 * Extract YYYY-MM-DD string in configured Application Timezone
 */
export function getAppDayStr(rawDateStr?: string | null, targetTimezone?: string): string {
  const d = parseAppDate(rawDateStr);
  if (!d) return "";
  const tz = targetTimezone || getAppTimezone();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().substring(0, 10);
  }
}

/**
 * Generates current timestamp string formatted as "YYYY-MM-DD HH:mm" in configured Application Timezone
 */
export function getAppNowString(targetTimezone?: string): string {
  const d = new Date();
  const tz = targetTimezone || getAppTimezone();
  try {
    const year = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric" }).format(d);
    const month = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "2-digit" }).format(d);
    const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "2-digit" }).format(d);
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(d);
    const minute = new Intl.DateTimeFormat("en-US", { timeZone: tz, minute: "2-digit" }).format(d);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return d.toISOString().replace("T", " ").substring(0, 16);
  }
}

/**
 * Formats 24h number into 12-hour AM/PM string (e.g. 15 -> "03:00 PM")
 */
export function formatHour12(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:00 ${ampm}`;
}

/**
 * Formats date into readable string in configured Application Timezone
 */
export function formatAppDateTime(rawDateStr?: string | null, includeTime: boolean = true, targetTimezone?: string): string {
  const d = parseAppDate(rawDateStr);
  if (!d) return "—";
  const tz = targetTimezone || getAppTimezone();
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
    };
    return new Intl.DateTimeFormat("en-US", options).format(d);
  } catch {
    return d.toLocaleString();
  }
}
