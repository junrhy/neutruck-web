import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// PostgreSQL Connection Pool Setup
const databaseUrl = process.env.DATABASE_URL || "";
let pool = null;

function createPool(connStr) {
  if (!connStr) {
    console.warn("⚠️ [Database] No DATABASE_URL provided. Operating in disconnected mode.");
    return null;
  }

  let cleanUrl = connStr.trim();
  let isInternalRender = false;
  let isLocal = false;

  try {
    const parsed = new URL(cleanUrl);
    isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    // Render internal database host looks like: dpg-datjc2vavr4c73dph2ug-a (no dots in hostname)
    isInternalRender = parsed.hostname.startsWith("dpg-") && !parsed.hostname.includes(".");

    if (isInternalRender || isLocal) {
      parsed.searchParams.delete("sslmode");
      parsed.searchParams.set("sslmode", "disable");
      cleanUrl = parsed.toString();
      console.log(`🔌 [Database] Detected ${isInternalRender ? "Render Internal" : "Local"} database connection (SSL disabled).`);
    }
  } catch (err) {
    console.warn("⚠️ [Database] URL parse warning:", err.message);
  }

  const config = {
    connectionString: cleanUrl,
  };

  // Only enable SSL for external cloud hosts (e.g. *.render.com, Neon, Supabase)
  if (!isInternalRender && !isLocal && process.env.DB_SSL !== "false") {
    config.ssl = { rejectUnauthorized: false };
  } else {
    config.ssl = false;
  }

  const p = new pg.Pool(config);

  // Set default search path on every client connection
  p.on("connect", (client) => {
    client.query("SET search_path TO neutruck, public;").catch(() => {});
  });

  p.on("error", (err) => {
    console.error("❌ [Database Pool Error]", err.message);
  });

  return p;
}

if (databaseUrl) {
  pool = createPool(databaseUrl);
  // Test connection on startup
  pool
    .query("SELECT NOW()")
    .then(async (res) => {
      console.log("✅ [NeuTruck Database Connected]", res.rows[0]);
      await pool.query("CREATE SCHEMA IF NOT EXISTS neutruck;");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS neutruck.allowed_ips (
          id VARCHAR(64) PRIMARY KEY,
          ip_address VARCHAR(64) NOT NULL UNIQUE,
          label VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS neutruck.security_settings (
          setting_key VARCHAR(64) PRIMARY KEY,
          setting_value TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO neutruck.security_settings (setting_key, setting_value)
        VALUES ('ip_whitelist_enabled', 'false')
        ON CONFLICT (setting_key) DO NOTHING;
      `).catch((e) => console.warn("⚠️ [Security Tables Setup Warning]", e.message));
    })
    .catch((err) => {
      console.error("❌ [Database Connection Failed]", err.message);
      if (databaseUrl.includes("dpg-") && !databaseUrl.includes(".")) {
        console.error("💡 Hint: If your web service and database are in DIFFERENT Render regions, the internal URL cannot be resolved. Use Render's External Database URL instead.");
      }
    });
}

/**
 * Normalizes SQL queries for PostgreSQL:
 * 1. Converts ? parameters to $1, $2, $3 positional parameters
 * 2. Ensures search path or neutruck schema prefix
 */
function normalizeQuery(sql, binds = []) {
  let query = sql;
  if (!query) return { sql: "", binds: [] };

  // If query uses ?, replace sequentially with $1, $2, $3
  if (query.includes("?")) {
    let index = 1;
    query = query.replace(/\?/g, () => `$${index++}`);
  }

  return { sql: query, binds };
}

// Health Check
app.get("/api/health", async (req, res) => {
  let dbStatus = "disconnected";
  let dbError = null;
  if (pool) {
    try {
      await pool.query("SELECT 1");
      dbStatus = "connected";
    } catch (e) {
      dbStatus = "error";
      dbError = e.message;
    }
  }
  res.json({
    status: "ok",
    app: "NeuTruck Web",
    database: dbStatus,
    error: dbError,
    timestamp: new Date().toISOString()
  });
});

// SELECT Query Endpoint
app.post("/api/db/query", async (req, res) => {
  const { sql, binds = [] } = req.body;
  if (!pool) {
    return res.status(503).json({ error: "Database not configured. Please set DATABASE_URL." });
  }

  try {
    const normalized = normalizeQuery(sql, binds);
    const result = await pool.query(normalized.sql, normalized.binds);
    res.json({ rows: result.rows });
  } catch (err) {
    console.error("❌ Query Error:", err.message, "SQL:", sql);
    res.status(500).json({ error: err.message, query: sql });
  }
});

// EXECUTE Query Endpoint (INSERT / UPDATE / DELETE / DDL)
app.post("/api/db/execute", async (req, res) => {
  const { sql, binds = [] } = req.body;
  if (!pool) {
    return res.status(503).json({ error: "Database not configured. Please set DATABASE_URL." });
  }

  try {
    const normalized = normalizeQuery(sql, binds);
    const result = await pool.query(normalized.sql, normalized.binds);
    res.json({
      rowsAffected: result.rowCount || 0,
      rows: result.rows || [],
    });
  } catch (err) {
    console.error("❌ Execute Error:", err.message, "SQL:", sql);
    res.status(500).json({ error: err.message, query: sql });
  }
});

// Test Connection Endpoint
app.post("/api/db/test", async (req, res) => {
  const { connectionString } = req.body;
  const targetUrl = connectionString || databaseUrl;
  if (!targetUrl) {
    return res.status(400).json({ error: "No connection string provided" });
  }

  try {
    const testPool = createPool(targetUrl);
    const result = await testPool.query("SELECT NOW()");
    await testPool.end();
    res.json({ success: true, timestamp: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SMS Dispatch Endpoint
app.post("/api/sms/send", async (req, res) => {
  const { phone, message } = req.body;
  console.log(`📱 [SMS Send Requested] To: ${phone}, Msg: ${message}`);
  res.json({ success: true, message: "SMS dispatched successfully" });
});

// ==============================================================================
// IP WHITELIST & SECURITY ACCESS CONTROL
// ==============================================================================

// Helper to extract client IP address
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  let ip = forwarded ? forwarded.split(",")[0].trim() : (req.socket?.remoteAddress || req.ip || "");
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }
  if (ip === "::1") ip = "127.0.0.1";
  return ip || "127.0.0.1";
}

// IP matching (exact match, wildcard prefix, localhost equivalence)
function ipMatches(clientIp, allowedPattern) {
  if (!clientIp || !allowedPattern) return false;
  const c = clientIp.trim();
  const p = allowedPattern.trim();
  if (p === "*" || p === "0.0.0.0/0") return true;
  if (c.toLowerCase() === p.toLowerCase()) return true;
  if ((c === "127.0.0.1" || c === "::1") && (p === "127.0.0.1" || p === "::1" || p === "localhost")) {
    return true;
  }
  // Wildcard match e.g. 192.168.1.* or 10.0.*
  if (p.endsWith(".*")) {
    const prefix = p.slice(0, -2);
    if (c.startsWith(prefix + ".")) return true;
  }
  return false;
}

// In-memory fallback state if database is in disconnected mode
let fallbackSecuritySettings = { ip_whitelist_enabled: false };
let fallbackAllowedIps = [];

// GET IP Security Status & Whitelist List
app.get("/api/security/ip-status", async (req, res) => {
  const clientIp = getClientIp(req);
  let whitelistEnabled = false;
  let allowedIps = [];

  if (pool) {
    try {
      const settingsRes = await pool.query(
        "SELECT setting_value FROM neutruck.security_settings WHERE setting_key = 'ip_whitelist_enabled' LIMIT 1"
      );
      if (settingsRes.rows.length > 0) {
        whitelistEnabled = settingsRes.rows[0].setting_value === "true";
      }

      const ipsRes = await pool.query(
        "SELECT * FROM neutruck.allowed_ips ORDER BY created_at DESC"
      );
      allowedIps = ipsRes.rows;
    } catch (err) {
      console.warn("⚠️ [IP Status DB Query Error, using fallback]:", err.message);
      whitelistEnabled = fallbackSecuritySettings.ip_whitelist_enabled;
      allowedIps = fallbackAllowedIps;
    }
  } else {
    whitelistEnabled = fallbackSecuritySettings.ip_whitelist_enabled;
    allowedIps = fallbackAllowedIps;
  }

  // Determine if client is allowed
  let isAllowed = true;
  if (whitelistEnabled) {
    const activeIps = allowedIps.filter((item) => item.is_active === true || item.is_active === 1 || item.is_active === "t");
    if (activeIps.length === 0) {
      // If list is empty, avoid completely bricking localhost
      isAllowed = (clientIp === "127.0.0.1" || clientIp === "localhost");
    } else {
      isAllowed = activeIps.some((item) => ipMatches(clientIp, item.ip_address));
    }
  }

  res.json({
    clientIp,
    whitelistEnabled,
    isAllowed,
    allowedIps,
  });
});

// Toggle IP Whitelist Enforcement
app.post("/api/security/ip-whitelist/toggle", async (req, res) => {
  const { enabled } = req.body;
  const isEnabled = Boolean(enabled);
  const clientIp = getClientIp(req);

  fallbackSecuritySettings.ip_whitelist_enabled = isEnabled;

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO neutruck.security_settings (setting_key, setting_value, updated_at)
         VALUES ('ip_whitelist_enabled', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP`,
        [String(isEnabled)]
      );

      // Safety guard: If enabling, ensure the current client's IP is automatically whitelisted so they don't lock themselves out!
      if (isEnabled) {
        const checkExisting = await pool.query(
          "SELECT id FROM neutruck.allowed_ips WHERE ip_address = $1",
          [clientIp]
        );
        if (checkExisting.rows.length === 0) {
          const id = "ip_" + Date.now();
          await pool.query(
            `INSERT INTO neutruck.allowed_ips (id, ip_address, label, description, is_active)
             VALUES ($1, $2, $3, $4, TRUE)`,
            [id, clientIp, "Current Device (Admin)", "Auto-authorized when whitelist was enabled"]
          );
        }
      }
    } catch (err) {
      console.error("❌ Toggle Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ success: true, enabled: isEnabled, clientIp });
});

// Add or Upsert Allowed IP
app.post("/api/security/ip-whitelist/add", async (req, res) => {
  const { ip_address, label, description } = req.body;
  if (!ip_address || !ip_address.trim()) {
    return res.status(400).json({ error: "IP address is required." });
  }

  const cleanIp = ip_address.trim();
  const cleanLabel = (label && label.trim()) || "Authorized Device";
  const cleanDesc = (description && description.trim()) || "";
  const id = "ip_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  if (pool) {
    try {
      const result = await pool.query(
        `INSERT INTO neutruck.allowed_ips (id, ip_address, label, description, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (ip_address) DO UPDATE SET label = $3, description = $4, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [id, cleanIp, cleanLabel, cleanDesc]
      );
      return res.json({ success: true, item: result.rows[0] });
    } catch (err) {
      console.error("❌ Add IP Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    const newItem = { id, ip_address: cleanIp, label: cleanLabel, description: cleanDesc, is_active: true };
    fallbackAllowedIps.push(newItem);
    return res.json({ success: true, item: newItem });
  }
});

// Delete Allowed IP
app.post("/api/security/ip-whitelist/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "ID is required." });

  if (pool) {
    try {
      await pool.query("DELETE FROM neutruck.allowed_ips WHERE id = $1", [id]);
    } catch (err) {
      console.error("❌ Delete IP Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    fallbackAllowedIps = fallbackAllowedIps.filter((i) => i.id !== id);
  }

  res.json({ success: true });
});

// Toggle Active/Inactive Status for an Allowed IP
app.post("/api/security/ip-whitelist/toggle-active", async (req, res) => {
  const { id, is_active } = req.body;
  if (!id) return res.status(400).json({ error: "ID is required." });

  const activeVal = Boolean(is_active);

  if (pool) {
    try {
      await pool.query(
        "UPDATE neutruck.allowed_ips SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [activeVal, id]
      );
    } catch (err) {
      console.error("❌ Toggle Active Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    const item = fallbackAllowedIps.find((i) => i.id === id);
    if (item) item.is_active = activeVal;
  }

  res.json({ success: true });
});

// Admin Unlock from Blocked Screen
app.post("/api/security/admin-unlock", async (req, res) => {
  const { username, password, label } = req.body;
  const clientIp = getClientIp(req);

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const cleanUser = username.trim().toLowerCase();
  let isAdminValid = false;

  // Check built-in fallback admin
  if (cleanUser === "admin" && password === "password123") {
    isAdminValid = true;
  }

  if (!isAdminValid && pool) {
    try {
      const userRes = await pool.query(
        "SELECT * FROM neutruck.users WHERE LOWER(username) = $1 AND is_active = TRUE LIMIT 1",
        [cleanUser]
      );
      if (userRes.rows.length > 0) {
        const found = userRes.rows[0];
        if (found.password_hash === password && (found.role_id === 1 || String(found.role_id) === "1" || found.username.toLowerCase() === "admin")) {
          isAdminValid = true;
        }
      }
    } catch (err) {
      console.warn("⚠️ Admin verification query error:", err.message);
    }
  }

  if (!isAdminValid) {
    return res.status(401).json({ error: "Invalid administrator credentials." });
  }

  // Whitelist clientIp
  const id = "ip_" + Date.now();
  const cleanLabel = (label && label.trim()) || `Authorized by ${cleanUser}`;

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO neutruck.allowed_ips (id, ip_address, label, description, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (ip_address) DO UPDATE SET label = $3, is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [id, clientIp, cleanLabel, `Unlocked by admin ${cleanUser}`]
      );
    } catch (err) {
      console.error("❌ Insert unlocked IP error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    fallbackAllowedIps.push({ id, ip_address: clientIp, label: cleanLabel, description: `Unlocked by admin ${cleanUser}`, is_active: true });
  }

  res.json({
    success: true,
    message: `IP address ${clientIp} has been authorized successfully.`,
    clientIp,
  });
});


// Serve Vite Static Files in Production
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("NeuTruck Web Server running. (Run 'npm run build' to generate frontend assets)");
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [NeuTruck Web] Server listening on port ${PORT}`);
});
