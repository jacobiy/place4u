import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";

const defaultForm = {
  property_type: "apartment",
  address: "",
  area: "",
  city: "",
  province: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  furnished: false,
  pet_friendly: false,
  available_from: "",
  is_active: true,
  imageFiles: []
};

export const AddPropertyModal = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormData(defaultForm);
      setError("");
    }
  }, [isOpen]);

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

  const handleCreate = async () => {
    setError("");
    if (!formData.property_type || !formData.address || !formData.area || !formData.city || !formData.price) {
      setError("Property type, address, area, city, and price are required.");
      return;
    }

    const payload = {
      property_type: formData.property_type,
      address: formData.address,
      area: formData.area,
      city: formData.city,
      province: formData.province || null,
      price: Number(formData.price),
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
      furnished: !!formData.furnished,
      pet_friendly: !!formData.pet_friendly,
      available_from: formData.available_from || null,
      is_active: !!formData.is_active,
      imageFiles: formData.imageFiles || []
    };

    await onCreate?.(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Property" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div style={{ color: T.red, fontSize: "0.85rem" }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Property Type</label>
            <select
              value={formData.property_type}
              onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              style={inputStyle}
            >
              {["house", "apartment", "room", "backroom", "commercial"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} style={inputStyle} placeholder="Cape Town" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Area</label>
            <input
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              style={inputStyle}
              placeholder="Sea Point / CBD / etc."
            />
          </div>
          <div>
            <label style={labelStyle}>Province (optional)</label>
            <input
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              style={inputStyle}
              placeholder="Western Cape"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Address</label>
          <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={inputStyle} placeholder="Street, suburb, area..." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Rent (monthly)</label>
            <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} style={inputStyle} placeholder="8500" />
          </div>
          <div>
            <label style={labelStyle}>Bedrooms</label>
            <input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} style={inputStyle} placeholder="2" />
          </div>
          <div>
            <label style={labelStyle}>Bathrooms</label>
            <input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })} style={inputStyle} placeholder="1" />
          </div>
        </div>

        <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary }}>
            <input type="checkbox" checked={formData.furnished} onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })} style={{ accentColor: T.accent }} />
            Furnished
          </label>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary }}>
            <input type="checkbox" checked={formData.pet_friendly} onChange={(e) => setFormData({ ...formData, pet_friendly: e.target.checked })} style={{ accentColor: T.accent }} />
            Pet friendly
          </label>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", color: T.textSecondary }}>
            <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} style={{ accentColor: T.accent }} />
            Active listing
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Available From (optional)</label>
            <input
              type="date"
              value={formData.available_from}
              onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Photos (optional)</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setFormData({ ...formData, imageFiles: Array.from(e.target.files || []) })} style={inputStyle} />
            {formData.imageFiles?.length > 0 && (
              <div style={{ fontSize: "0.75rem", color: T.textSecondary, marginTop: "4px" }}>
                {formData.imageFiles.length} file(s) selected
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", paddingTop: "0.5rem" }}>
          <PrimaryBtn style={{ flex: 1 }} onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Property"}
          </PrimaryBtn>
          <SecondaryBtn style={{ flex: 1 }} onClick={onClose} disabled={isCreating}>
            Cancel
          </SecondaryBtn>
        </div>
      </div>
    </Modal>
  );
};
