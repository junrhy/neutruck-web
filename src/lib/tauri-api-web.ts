export async function invoke<T = any>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  switch (cmd) {
    case "get_current_db_path": {
      // In web, tell the frontend it's a PostgreSQL connection so isPg = true
      return "postgres://render-web" as unknown as T;
    }
    case "activate_license_key": {
      return true as unknown as T;
    }
    case "get_machine_fingerprint": {
      return "render-web-instance" as unknown as T;
    }
    case "open_tv_kiosk_window": {
      window.open("?mode=tv-kiosk", "_blank");
      return true as unknown as T;
    }
    case "test_postgres_connection": {
      const res = await fetch("/api/db/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to test connection");
      return data as unknown as T;
    }
    case "send_unisms_sms": {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS");
      return data as unknown as T;
    }
    default:
      console.info(`[Web invoke] Command handled in web mode: ${cmd}`, args);
      return true as unknown as T;
  }
}
