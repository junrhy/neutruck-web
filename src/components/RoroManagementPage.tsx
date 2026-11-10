import { useState } from "react";
import { RoroPort, RoroRoute } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useDialog } from "./common/CustomDialogModal";

interface RoroManagementPageProps {
  ports: RoroPort[];
  routes: RoroRoute[];
  onAddPort: (port: Omit<RoroPort, "id">) => void;
  onUpdatePort: (port: RoroPort) => void;
  onDeletePort: (id: string) => void;
  onAddRoute: (route: Omit<RoroRoute, "id">) => void;
  onUpdateRoute: (route: RoroRoute) => void;
  onDeleteRoute: (id: string) => void;
}

export default function RoroManagementPage({
  ports,
  routes,
  onAddPort,
  onUpdatePort,
  onDeletePort,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: RoroManagementPageProps) {
  const { user } = useAuth();
  const { showConfirm } = useDialog();
  const [activeSubTab, setActiveSubTab] = useState<"ports" | "routes">("routes");

  // Form states - Ports
  const [showPortForm, setShowPortForm] = useState(false);
  const [editingPort, setEditingPort] = useState<RoroPort | null>(null);
  const [portName, setPortName] = useState("");
  const [province, setProvince] = useState("");
  const [islandGroup, setIslandGroup] = useState<RoroPort["islandGroup"]>("Luzon");

  // Form states - Routes
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RoroRoute | null>(null);
  const [originPortName, setOriginPortName] = useState("");
  const [destinationPortName, setDestinationPortName] = useState("");
  const [shippingLine, setShippingLine] = useState("");
  const [defaultTicketFee, setDefaultTicketFee] = useState<number>(7500);

  const [search, setSearch] = useState("");

  // Port Handlers
  const handleOpenAddPort = () => {
    setEditingPort(null);
    setPortName("");
    setProvince("");
    setIslandGroup("Luzon");
    setShowPortForm(true);
  };

  const handleOpenEditPort = (port: RoroPort) => {
    setEditingPort(port);
    setPortName(port.portName);
    setProvince(port.province);
    setIslandGroup(port.islandGroup);
    setShowPortForm(true);
  };

  const handleClosePortForm = () => {
    setShowPortForm(false);
    setEditingPort(null);
    setPortName("");
    setProvince("");
    setIslandGroup("Luzon");
  };

  const handlePortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portName.trim() || !province.trim()) return;

    if (editingPort) {
      onUpdatePort({
        id: editingPort.id,
        portName: portName.trim(),
        province: province.trim(),
        islandGroup,
      });
    } else {
      onAddPort({
        portName: portName.trim(),
        province: province.trim(),
        islandGroup,
      });
    }

    handleClosePortForm();
  };

  // Route Handlers
  const handleOpenAddRoute = () => {
    setEditingRoute(null);
    setOriginPortName("");
    setDestinationPortName("");
    setShippingLine("");
    setDefaultTicketFee(7500);
    setShowRouteForm(true);
  };

  const handleOpenEditRoute = (route: RoroRoute) => {
    setEditingRoute(route);
    setOriginPortName(route.originPortName);
    setDestinationPortName(route.destinationPortName);
    setShippingLine(route.shippingLine);
    setDefaultTicketFee(route.defaultTicketFee);
    setShowRouteForm(true);
  };

  const handleCloseRouteForm = () => {
    setShowRouteForm(false);
    setEditingRoute(null);
    setOriginPortName("");
    setDestinationPortName("");
    setShippingLine("");
    setDefaultTicketFee(7500);
  };

  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originPortName.trim() || !destinationPortName.trim() || !shippingLine.trim()) return;

    if (editingRoute) {
      onUpdateRoute({
        id: editingRoute.id,
        originPortName: originPortName.trim(),
        destinationPortName: destinationPortName.trim(),
        shippingLine: shippingLine.trim(),
        defaultTicketFee: Number(defaultTicketFee) || 0,
      });
    } else {
      onAddRoute({
        originPortName: originPortName.trim(),
        destinationPortName: destinationPortName.trim(),
        shippingLine: shippingLine.trim(),
        defaultTicketFee: Number(defaultTicketFee) || 0,
      });
    }

    handleCloseRouteForm();
  };

  const filteredPorts = ports.filter(
    (p) =>
      p.portName.toLowerCase().includes(search.toLowerCase()) ||
      p.province.toLowerCase().includes(search.toLowerCase()) ||
      p.islandGroup.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRoutes = routes.filter(
    (r) =>
      r.originPortName.toLowerCase().includes(search.toLowerCase()) ||
      r.destinationPortName.toLowerCase().includes(search.toLowerCase()) ||
      r.shippingLine.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>⚓ RoRo Ports &amp; Ferry Lines Directory</h2>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem" }}>
            Configure inter-island sea ferry passage corridors, ticket fares, and shipping line schedules.
          </p>
        </div>

        {user && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {activeSubTab === "routes" && !showRouteForm && (
              <button className="btn btn-primary" onClick={handleOpenAddRoute}>
                ➕ Register Ferry Passage Route
              </button>
            )}
            {activeSubTab === "ports" && !showPortForm && (
              <button className="btn btn-primary" onClick={handleOpenAddPort}>
                ➕ Register RoRo Seaport
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        <button
          className={`tab-btn ${activeSubTab === "routes" ? "active" : ""}`}
          onClick={() => { setActiveSubTab("routes"); handleClosePortForm(); }}
        >
          ⛴️ Ferry Routes &amp; Fares ({routes.length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === "ports" ? "active" : ""}`}
          onClick={() => { setActiveSubTab("ports"); handleCloseRouteForm(); }}
        >
          ⚓ RoRo Seaports ({ports.length})
        </button>
      </div>

      {/* Sub Tab 1: Ferry Routes */}
      {activeSubTab === "routes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {showRouteForm && (
            <div style={{ padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--primary)" }}>
                  {editingRoute ? "✏️ Edit Inter-Island Sea Passage Route" : "⛴️ Register Inter-Island Sea Passage Route"}
                </h3>
                <button className="btn btn-outline btn-sm" onClick={handleCloseRouteForm}>
                  ✕ Cancel
                </button>
              </div>

              <form onSubmit={handleRouteSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Origin Port / Pier *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Batangas Port Pier 3"
                      value={originPortName}
                      onChange={(e) => setOriginPortName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination Port / Pier *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Calapan Port Pier 1"
                      value={destinationPortName}
                      onChange={(e) => setDestinationPortName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ferry Shipping Line *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. FastCat / Montenegro Lines / 2GO"
                      value={shippingLine}
                      onChange={(e) => setShippingLine(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Standard Truck Passage Fee (₱)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      placeholder="7500"
                      value={defaultTicketFee}
                      onChange={(e) => setDefaultTicketFee(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-outline" onClick={handleCloseRouteForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingRoute ? "💾 Update Ferry Route" : "💾 Save Ferry Route"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-card">
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>📋 Inter-Island Passage Routes ({routes.length})</div>
              <input
                type="text"
                className="form-input"
                style={{ width: "300px", padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                placeholder="Search Origin, Destination, Shipping Line..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <table style={{ minWidth: "800px" }}>
              <thead>
                <tr>
                  <th>Passage Corridor (Origin → Destination)</th>
                  <th>Shipping Line Carrier</th>
                  <th>Standard Truck Ticket Fee</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No RoRo passage routes registered yet. Click "+ Register Ferry Passage Route" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: "var(--text-main)" }}>
                        ⛴️ {r.originPortName} ➔ {r.destinationPortName}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>
                          {r.shippingLine}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>
                        ₱{r.defaultTicketFee.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {user ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenEditRoute(r)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={async () => {
                                const confirmed = await showConfirm(`Are you sure you want to delete route "${r.originPortName} ➔ ${r.destinationPortName}"?`, "Delete Ferry Route");
                                if (confirmed) {
                                  onDeleteRoute(r.id);
                                }
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Read-Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab 2: Seaports Directory */}
      {activeSubTab === "ports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {showPortForm && (
            <div style={{ padding: "1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--primary)" }}>
                  {editingPort ? "✏️ Edit Philippine RoRo Seaport" : "⚓ Register Philippine RoRo Seaport"}
                </h3>
                <button className="btn btn-outline btn-sm" onClick={handleClosePortForm}>
                  ✕ Cancel
                </button>
              </div>

              <form onSubmit={handlePortSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Seaport Terminal Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Batangas Port Pier 3"
                      value={portName}
                      onChange={(e) => setPortName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Province *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="e.g. Batangas"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Island Region Group</label>
                    <select
                      className="form-select"
                      value={islandGroup}
                      onChange={(e) => setIslandGroup(e.target.value as any)}
                    >
                      <option value="Luzon">Luzon</option>
                      <option value="Visayas">Visayas</option>
                      <option value="Mindanao">Mindanao</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-outline" onClick={handleClosePortForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPort ? "💾 Update Seaport" : "💾 Save Seaport"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-card">
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>📋 Philippine RoRo Seaports Directory ({ports.length})</div>
              <input
                type="text"
                className="form-input"
                style={{ width: "300px", padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                placeholder="Search Seaport, Province, Region..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <table style={{ minWidth: "750px" }}>
              <thead>
                <tr>
                  <th>Seaport Terminal</th>
                  <th>Province</th>
                  <th>Island Region</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPorts.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      No seaports registered yet. Click "+ Register RoRo Seaport" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredPorts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: "var(--text-main)" }}>⚓ {p.portName}</td>
                      <td>{p.province}</td>
                      <td>
                        <span className="badge badge-outline" style={{ fontWeight: 600 }}>
                          {p.islandGroup}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {user ? (
                          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenEditPort(p)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={async () => {
                                const confirmed = await showConfirm(`Are you sure you want to remove seaport "${p.portName}"?`, "Remove Seaport");
                                if (confirmed) {
                                  onDeletePort(p.id);
                                }
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Read-Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
