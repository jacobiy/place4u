import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";

export const EditPropertyModal = ({ isOpen, onClose, property, onSave }) => {
  const [formData, setFormData] = useState(property || {});

  useEffect(() => {
    if (property) setFormData(property);
  }, [property]);

  const inputStyle = {
    width: "100%",
    padding: "0.6rem 0.875rem",
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: "0.625rem",
    fontSize: "0.875rem",
    color: T.textPrimary,
    outline: "none",
    fontFamily: "inherit"
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: T.textSecondary,
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Property" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {[
          ["Property Name", "name", "text"],
          ["Location", "location", "text"],
          ["Monthly Rent", "rent", "text"],
          ["Size", "size", "text"]
        ].map(([label, key, type]) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            <input
              type={type}
              value={formData[key] || ""}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              style={inputStyle}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            ["Bedrooms", "bedrooms"],
            ["Bathrooms", "bathrooms"]
          ].map(([label, key]) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="number"
                value={formData[key] || ""}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                style={inputStyle}
                placeholder="0"
              />
            </div>
          ))}
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

