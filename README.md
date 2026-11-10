# NeuTruck Web — Online Fleet & Dispatch Logistics

Standalone online web edition of **NeuTruck**, ready to run locally and deploy to **Render.com**.

Shares the **exact same PostgreSQL database and authentication** (`neutruck.*` schema) as the desktop version.

---

## 🚀 Features

- **Full Parity with Desktop**: Dispatch Board, Fleet Vehicles, Waybills & Printable PDF Sheets, Fuel Management, Unit Inspection, RORO Routes & Ports, Maintenance Logs, SMS Console, Live Trucks Map (Leaflet), and Financial/Statements Reports.
- **Identical Database & Auth**: Connects directly to your PostgreSQL database (`neutruck` schema). Users log in using their existing accounts from `neutruck.users` and roles/permissions.
- **Modern Full-Stack Architecture**:
  - **Frontend**: Vite 7 + React 19 + TypeScript + Tailwind/CSS
  - **Backend**: Express + `pg` connection pool with SSL support
  - **Ready for Render.com**: Multi-stage `Dockerfile` and `render.yaml` included.

---

## 🛠️ Local Development

### 1. Prerequisites
- Node.js 18+ or 20+
- PostgreSQL database with `neutruck` schema (or your remote database URL)

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and provide your PostgreSQL connection string:
```ini
PORT=3001
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require
DB_SSL=true
```

### 3. Install & Run
```bash
# Install dependencies
npm install

# Run backend + frontend concurrently in dev mode
npm run dev
```

- Frontend dev server: `http://localhost:3000`
- Backend API server: `http://localhost:3001`

---

## 🌐 Deploy to Render.com

### Option 1: Using the Render Dashboard (Web Service)
1. Push this repository (`/Users/junrhycrodua/Job/JRC/web-apps/neutruck-web`) to a GitHub or GitLab repository.
2. In the [Render Dashboard](https://dashboard.render.com):
   - Click **New +** → **Web Service**
   - Connect your repository.
   - Choose **Node** runtime (or Docker).
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
3. Add Environment Variables under **Environment**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgres://user:password@host:port/dbname?sslmode=require` (your PostgreSQL connection string)
   - `DB_SSL`: `true`
4. Click **Deploy Web Service**!

### Option 2: Using Docker on Render
The project includes a production-optimized multi-stage `Dockerfile`.
- When creating the Web Service, select **Docker** as the runtime.
- Render will automatically build the frontend assets and serve them with Express on port 3001 (or `$PORT`).

---

## 📁 Project Structure

```
neutruck-web/
├── server.js               # Express server: handles DB queries, auth, and serves dist/
├── render.yaml             # Render Blueprint configuration
├── Dockerfile              # Multi-stage production container
├── vite.config.ts          # Vite configuration with web adapters for Tauri
├── schema_setup.sql        # PostgreSQL schema setup script
├── src/
│   ├── App.tsx             # Main application component
│   ├── components/         # All logistics pages, modals, reports, wizard
│   ├── hooks/useAuth.tsx   # Authentication provider matching neutruck.users
│   ├── lib/                # Web adapters for database and browser APIs
│   │   ├── tauri-sql-web.ts
│   │   ├── tauri-api-web.ts
│   │   ├── tauri-window-web.ts
│   │   ├── tauri-opener-web.ts
│   │   └── tauri-updater-web.ts
│   └── utils/
│       ├── dbHelper.ts
│       ├── idGenerator.ts
│       └── philippineCoordinates.ts
```
