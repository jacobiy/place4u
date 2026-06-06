import { useEffect, useState, useMemo } from "react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";

export const EditPropertyModal = ({ isOpen, onClose, property, onSave }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (property) {
      setFormData({
        id: property.id,
        property_type: property.property_type || "",
        address: property.address || "",
        area: property.area || "",
        city: property.city || "",
        price: property.price || "",
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        size: property.size || "",
        occupied: property.occupied || false
      });
    }
  }, [property]);

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      padding: "0.6rem 0.875rem",
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: "0.625rem",
      fontSize: "0.875rem",
      color: T.textPrimary,
      outline: "none",
      fontFamily: "inherit"
    }),
    []
  );

  const labelStyle = useMemo(
    () => ({
      display: "block",
      fontSize: "0.75rem",
      fontWeight: 500,
      color: T.textSecondary,
      marginBottom: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }),
    []
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Property" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Property Type</label>
            <select
              value={formData.property_type}
              onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select Type...</option>
              {["house", "apartment", "room", "backroom", "commercial"].map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              value={formData.city || ""}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              style={inputStyle}
              placeholder="e.g. Cape Town"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Area</label>
            <input
              type="text"
              value={formData.area || ""}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              style={inputStyle}
              placeholder="e.g. Sea Point"
            />
          </div>
          <div>
            <label style={labelStyle}>Monthly Rent</label>
            <input
              type="number"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={inputStyle}
              placeholder="8500"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            value={formData.address || ""}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            style={inputStyle}
            placeholder="Full address..."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Bedrooms</label>
            <input
              type="number"
              value={formData.bedrooms || ""}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              style={inputStyle}
              placeholder="0"
            />
          </div>
          <div>
            <label style={labelStyle}>Bathrooms</label>
            <input
              type="number"
              value={formData.bathrooms || ""}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              style={inputStyle}
              placeholder="0"
            />
          </div>
          <div>
            <label style={labelStyle}>Size (sqm)</label>
            <input
              type="text"
              value={formData.size || ""}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              style={inputStyle}
              placeholder="e.g. 50 sqm"
            />
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary }}>
            <input type="checkbox" checked={formData.occupied} onChange={(e) => setFormData({ ...formData, occupied: e.target.checked })} style={{ accentColor: T.accent }} />
            Mark as Occupied
          </label>
        </div>

        <div style={{ display: "flex", gap: "10px", paddingTop: "0.5rem" }}>
          <PrimaryBtn style={{ flex: 1 }} onClick={() => onSave?.(formData)}>
            Save Changes
          </PrimaryBtn>
          <SecondaryBtn style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </SecondaryBtn>
        </div>
      </div>
    </Modal>
  );
};
