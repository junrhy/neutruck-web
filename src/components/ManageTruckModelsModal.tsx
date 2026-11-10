import React, { useState } from "react";
import { useDialog } from "./common/CustomDialogModal";

interface ManageTruckModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  truckModels: string[];
  onAddTruckModel: (modelName: string) => void;
  onUpdateTruckModel: (oldName: string, newName: string) => void;
  onDeleteTruckModel: (modelName: string) => void;
  usedModels?: string[];
}

export const ManageTruckModelsModal: React.FC<ManageTruckModelsModalProps> = ({
  isOpen,
  onClose,
  truckModels,
  onAddTruckModel,
  onUpdateTruckModel,
  onDeleteTruckModel,
  usedModels = [],
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [newModelInput, setNewModelInput] = useState("");
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editModelInput, setEditModelInput] = useState("");

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newModelInput.trim();
    if (!trimmed) {
      showAlert("Please enter a truck model type name.", "Validation Error", "warning");
      return;
    }
    if (truckModels.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      showAlert(`Truck model "${trimmed}" already exists.`, "Duplicate Model", "warning");
      return;
    }
    onAddTruckModel(trimmed);
    setNewModelInput("");
    showAlert(`Truck model "${trimmed}" successfully added!`, "Model Added", "success");
  };

  const handleStartEdit = (model: string) => {
    setEditingModel(model);
    setEditModelInput(model);
  };

  const handleSaveEdit = (oldModel: string) => {
    const trimmed = editModelInput.trim();
    if (!trimmed) {
      showAlert("Truck model name cannot be empty.", "Validation Error", "warning");
      return;
    }
    if (trimmed !== oldModel && truckModels.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      showAlert(`Truck model "${trimmed}" already exists.`, "Duplicate Model", "warning");
      return;
    }
    onUpdateTruckModel(oldModel, trimmed);
    setEditingModel(null);
    setEditModelInput("");
    showAlert(`Updated "${oldModel}" to "${trimmed}".`, "Model Renamed", "success");
  };

  const handleDelete = async (model: string) => {
    const isUsed = usedModels.some((m) => m.toLowerCase() === model.toLowerCase());
    if (isUsed) {
      const confirmForce = await showConfirm(
        `Truck model "${model}" is currently assigned to one or more vehicles in your fleet. Are you sure you want to delete this category option?`,
        "Model In Use"
      );
      if (!confirmForce) return;
    } else {
      const confirmDelete = await showConfirm(`Are you sure you want to delete truck model "${model}"?`, "Delete Model");
      if (!confirmDelete) return;
    }
    onDeleteTruckModel(model);
    showAlert(`Truck model "${model}" removed.`, "Model Removed", "info");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          width: "100%",
          maxWidth: "540px",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
          boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
              🚚 Manage Fleet Truck Models &amp; Categories
            </h3>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Add, rename, or organize vehicle classifications used across Fleet Management and Dispatch Reports.
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Add Form */}
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.6rem" }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 10-Wheeler Wingvan, Thermo-Van..."
              value={newModelInput}
              onChange={(e) => setNewModelInput(e.target.value)}
              style={{ flex: 1, fontSize: "0.85rem" }}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: "nowrap" }}>
              ➕ Add Model
            </button>
          </form>

          {/* Model List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Configured Truck Models ({truckModels.length})
            </div>

            {truckModels.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No truck model categories registered. Add one above!
              </div>
            ) : (
              truckModels.map((model) => {
                const isEditing = editingModel === model;
                const isUsed = usedModels.some((m) => m.toLowerCase() === model.toLowerCase());

                return (
                  <div
                    key={model}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.85rem",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      gap: "0.5rem",
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: "flex", gap: "0.5rem", flex: 1, alignItems: "center" }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1, fontSize: "0.82rem", padding: "0.3rem 0.6rem" }}
                          value={editModelInput}
                          onChange={(e) => setEditModelInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleSaveEdit(model)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => setEditingModel(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.9rem" }}>🚚</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                            {model}
                          </span>
                          {isUsed && (
                            <span style={{ fontSize: "0.68rem", background: "rgba(16, 185, 129, 0.12)", color: "var(--success)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                              Active in Fleet
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                            onClick={() => handleStartEdit(model)}
                            title="Rename truck model"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                            onClick={() => handleDelete(model)}
                            title="Delete truck model"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border)", textAlign: "right" }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
