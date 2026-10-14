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
        title: property.title || property.name || "",
        description: property.description || "",
        property_type: property.property_type || "apartment",
        complex_name: property.complex_name || "",
        address: property.address || "",
        area: property.area || "",
        city: property.city || "",
        postal_code: property.postal_code || "",
        price: property.price || "",
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        size: property.size || "",
        parking_bays: property.parking_bays ?? 1,
        parking_type: property.parking_type || "covered",
        deposit: property.deposit || "1.5 Months",
        lease_term: property.lease_term || "12 Months",
        water_included: !!property.water_included,
        electricity_type: property.electricity_type || "prepaid",
        furnished: !!property.furnished,
        pet_friendly: !!property.pet_friendly,
        occupied: !!property.occupied
      });
    }
  }, [property]);

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      padding: "0.6rem 0.875rem",
      background: "#ffffff",
      border: `1px solid ${T.borderStrong}`,
      borderRadius: "0.75rem",
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
      fontSize: "0.7rem",
      fontWeight: 600,
      color: T.textSecondary,
      marginBottom: "6px",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }),
    []
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Property Specifications" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Title & Description */}
        <div>
          <label style={labelStyle}>Listing Title / Headline</label>
          <input
            type="text"
            value={formData.title || ""}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={inputStyle}
            placeholder="e.g. Modern 2-Bed Luxury Suite"
          />
        </div>

        <div>
          <label style={labelStyle}>Description & Overview</label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Detailed description of layout, views, and finishes..."
          />
        </div>

        {/* Location & Complex */}
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
            <label style={labelStyle}>Complex / Estate Name</label>
            <input
              type="text"
              value={formData.complex_name || ""}
              onChange={(e) => setFormData({ ...formData, complex_name: e.target.value })}
              style={inputStyle}
              placeholder="e.g. The Apex"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Area / Suburb</label>
            <input
              type="text"
              value={formData.area || ""}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              style={inputStyle}
              placeholder="e.g. Sea Point"
            />
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

        <div>
          <label style={labelStyle}>Street Address</label>
          <input
            type="text"
            value={formData.address || ""}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            style={inputStyle}
            placeholder="Full street address..."
          />
        </div>

        {/* Financials & Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Monthly Rent (ZAR)</label>
            <input
              type="number"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={inputStyle}
              placeholder="8500"
            />
          </div>
          <div>
            <label style={labelStyle}>Deposit Terms</label>
            <input
              type="text"
              value={formData.deposit || ""}
              onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
              style={inputStyle}
              placeholder="1.5 Months"
            />
          </div>
          <div>
            <label style={labelStyle}>Lease Term</label>
            <input
              type="text"
              value={formData.lease_term || ""}
              onChange={(e) => setFormData({ ...formData, lease_term: e.target.value })}
              style={inputStyle}
              placeholder="12 Months"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Bedrooms</label>
            <input
              type="number"
              value={formData.bedrooms || ""}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              style={inputStyle}
              placeholder="2"
            />
          </div>
          <div>
            <label style={labelStyle}>Bathrooms</label>
            <input
              type="number"
              step="0.5"
              value={formData.bathrooms || ""}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              style={inputStyle}
              placeholder="1"
            />
          </div>
          <div>
            <label style={labelStyle}>Size (m²)</label>
            <input
              type="text"
              value={formData.size || ""}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              style={inputStyle}
              placeholder="e.g. 75 m²"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Parking Bays</label>
            <input
              type="number"
              value={formData.parking_bays ?? 1}
              onChange={(e) => setFormData({ ...formData, parking_bays: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Parking Type</label>
            <select
              value={formData.parking_type || "covered"}
              onChange={(e) => setFormData({ ...formData, parking_type: e.target.value })}
              style={inputStyle}
            >
              <option value="covered">Covered Bay</option>
              <option value="basement">Secure Basement</option>
              <option value="garage">Lockup Garage</option>
              <option value="open">Open Bay</option>
              <option value="street">Street Parking</option>
              <option value="none">No Parking</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center", paddingTop: "4px" }}>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary, fontSize: "0.82rem", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={formData.water_included || false}
              onChange={(e) => setFormData({ ...formData, water_included: e.target.checked })}
              style={{ accentColor: T.accent }}
            />
            Water Included
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary, fontSize: "0.82rem", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={formData.furnished || false}
              onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })}
              style={{ accentColor: T.accent }}
            />
            Furnished
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary, fontSize: "0.82rem", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={formData.pet_friendly || false}
              onChange={(e) => setFormData({ ...formData, pet_friendly: e.target.checked })}
              style={{ accentColor: T.accent }}
            />
            Pet Friendly
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary, fontSize: "0.82rem", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={formData.occupied || false}
              onChange={(e) => setFormData({ ...formData, occupied: e.target.checked })}
              style={{ accentColor: T.accent }}
            />
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

export default EditPropertyModal;
