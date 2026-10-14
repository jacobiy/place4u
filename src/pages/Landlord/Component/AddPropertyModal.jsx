import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, X, MapPin, Bed, Bath, ImagePlus, Sparkles, FileText, ShieldCheck,
  Building2, PawPrint, Sofa, Check, ChevronLeft, ChevronRight, CircleAlert,
  Car, Droplets, Zap, Maximize2, Users, Shield, Wifi, Wind
} from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T, SERIF } from "../Styles/designTokens";
import { DOCUMENT_CATEGORIES } from "./DocumentUploadModal";

const TYPE_LABELS = {
  house: "House",
  apartment: "Apartment",
  room: "Room",
  backroom: "Backroom",
  commercial: "Commercial"
};

const POPULAR_AMENITIES = [
  "Fiber Internet Ready",
  "Backup Inverter / Solar",
  "24/7 Security Guardhouse",
  "Biometric Access",
  "Swimming Pool",
  "Fitness Center / Gym",
  "Balcony / Patio",
  "Air Conditioning",
  "Secure Basement Parking",
  "Braai Area",
  "Gas Hob / Scullery",
  "Pet Friendly"
];

// Documents a landlord can attach to a listing. Proof of ownership is the one
// required before the listing may be submitted for approval.
const PROPERTY_DOC_TYPES = ["ownership", "rates", "compliance", "id", "banking"];
const REQUIRED_DOC_TYPE = "ownership";

const docMeta = (id) => DOCUMENT_CATEGORIES.find((c) => c.id === id) || { label: id, desc: "" };

const newDocId = () => `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultForm = {
  title: "",
  description: "",
  property_type: "apartment",
  complex_name: "",
  address: "",
  area: "",
  city: "",
  province: "",
  postal_code: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  size: "",
  parking_bays: "1",
  parking_type: "covered",
  deposit: "1.5 Months",
  lease_term: "12 Months",
  water_included: false,
  electricity_type: "prepaid",
  furnished: false,
  pet_friendly: false,
  max_occupants: "2",
  available_from: "",
  amenities: [],
  imageFiles: [],
  documentFiles: []
};

const EYEBROW = {
  fontSize: "0.68rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: T.textMuted,
  marginBottom: "0.6rem"
};

const Section = ({ label, children }) => (
  <div style={{ marginBottom: "1.35rem" }}>
    <p style={EYEBROW}>{label}</p>
    {children}
  </div>
);

const ToggleChip = ({ active, onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "8px 14px", borderRadius: 9999, fontSize: "0.8rem", fontWeight: 600,
      cursor: "pointer", transition: "all 0.15s",
      background: active ? T.accentSoft : "#ffffff",
      border: `1px solid ${active ? T.accentBorder : T.borderStrong}`,
      color: active ? T.accent : T.textSecondary
    }}
  >
    {Icon && <Icon size={14} />} {children}
  </button>
);

export const AddPropertyModal = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData(defaultForm);
      setError("");
      setActiveImage(0);
    }
  }, [isOpen]);

  // Create / revoke object URLs for the selected photos
  useEffect(() => {
    const files = formData.imageFiles || [];
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setActiveImage(0);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [formData.imageFiles]);

  const set = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  const toggleAmenity = (amenity) => {
    const current = formData.amenities || [];
    const exists = current.includes(amenity);
    const updated = exists ? current.filter((a) => a !== amenity) : [...current, amenity];
    set({ amenities: updated });
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;
    setFormData((prev) => ({ ...prev, imageFiles: [...(prev.imageFiles || []), ...incoming] }));
  };

  const removeFile = (index) => {
    setFormData((prev) => ({ ...prev, imageFiles: (prev.imageFiles || []).filter((_, i) => i !== index) }));
  };

  const addDocuments = (fileList) => {
    const incoming = Array.from(fileList || []).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (incoming.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      documentFiles: [
        ...(prev.documentFiles || []),
        ...incoming.map((file) => ({
          id: newDocId(),
          file,
          title: file.name,
          documentType: (prev.documentFiles || []).length === 0 ? REQUIRED_DOC_TYPE : "rates"
        }))
      ]
    }));
  };

  const removeDocument = (id) =>
    setFormData((prev) => ({ ...prev, documentFiles: (prev.documentFiles || []).filter((d) => d.id !== id) }));

  const setDocumentType = (id, documentType) =>
    setFormData((prev) => ({
      ...prev,
      documentFiles: (prev.documentFiles || []).map((d) => (d.id === id ? { ...d, documentType } : d))
    }));

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

  /* ---------------- live preview values ---------------- */
  const previewName = useMemo(() => {
    if (formData.title.trim()) return formData.title.trim();
    const type = TYPE_LABELS[formData.property_type] || "Property";
    const place = formData.area.trim() || formData.city.trim();
    return place ? `${type} · ${place}` : type;
  }, [formData.title, formData.property_type, formData.area, formData.city]);

  const previewLocation = [formData.complex_name.trim(), formData.area.trim(), formData.city.trim()].filter(Boolean).join(", ") || "Location not set";
  const previewRent = formData.price ? `R${Number(formData.price).toLocaleString("en-ZA")}/mo` : "R—/mo";
  const coverUrl = previewUrls[activeImage] || previewUrls[0];

  const documentFiles = formData.documentFiles || [];
  const hasRequiredDoc = documentFiles.some((d) => d.documentType === REQUIRED_DOC_TYPE);

  const checklist = [
    { label: "Listing title", done: Boolean(formData.title.trim()) },
    { label: "Property type", done: Boolean(formData.property_type) },
    { label: "Street address", done: Boolean(formData.address.trim()) },
    { label: "Area & city", done: Boolean(formData.area.trim() && formData.city.trim()) },
    { label: "Monthly rent", done: Boolean(formData.price) },
    { label: "At least one photo", done: previewUrls.length > 0 },
    { label: "Proof of ownership document", done: hasRequiredDoc, required: true }
  ];
  const completion = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const handleCreate = async (submitForApproval) => {
    setError("");
    if (!formData.property_type || !formData.address || !formData.area || !formData.city || !formData.price) {
      setError("Property type, address, area, city, and price are required.");
      return;
    }
    if (submitForApproval && !hasRequiredDoc) {
      setError("Upload a proof of ownership document before submitting for approval, or save it as a draft.");
      return;
    }

    const payload = {
      title: formData.title.trim() || previewName,
      description: formData.description.trim() || null,
      property_type: formData.property_type,
      complex_name: formData.complex_name.trim() || null,
      address: formData.address,
      area: formData.area,
      city: formData.city,
      province: formData.province || null,
      postal_code: formData.postal_code.trim() || null,
      price: Number(formData.price),
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
      size: formData.size.trim() ? (formData.size.includes("m") ? formData.size.trim() : `${formData.size.trim()} m²`) : null,
      parking_bays: formData.parking_bays ? Number(formData.parking_bays) : 0,
      parking_type: formData.parking_type || "covered",
      deposit: formData.deposit || "1.5 Months",
      lease_term: formData.lease_term || "12 Months",
      water_included: !!formData.water_included,
      electricity_type: formData.electricity_type || "prepaid",
      furnished: !!formData.furnished,
      pet_friendly: !!formData.pet_friendly,
      max_occupants: formData.max_occupants ? Number(formData.max_occupants) : 2,
      available_from: formData.available_from || null,
      amenities: formData.amenities || [],
      imageFiles: formData.imageFiles || [],
      documentFiles: formData.documentFiles || [],
      submitForApproval: !!submitForApproval
    };

    await onCreate?.(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Property"
      subtitle="Complete listing specifications, attach proof of ownership, then submit for approval"
      size="xl"
      footer={
        <>
          <SecondaryBtn onClick={onClose} disabled={isCreating}>
            Cancel
          </SecondaryBtn>
          <SecondaryBtn onClick={() => handleCreate(false)} disabled={isCreating}>
            Save as draft
          </SecondaryBtn>
          <PrimaryBtn onClick={() => handleCreate(true)} disabled={isCreating || !hasRequiredDoc}>
            {isCreating ? "Submitting..." : "Submit for approval"}
          </PrimaryBtn>
        </>
      }
    >
      <style>{`
        .ap-layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, 1fr); gap: 1.75rem; align-items: start; }
        .ap-preview-col { position: sticky; top: 0; }
        .ap-doc-drop:hover { border-color: ${T.accent} !important; background: ${T.accentSoft} !important; }
        @media (max-width: 820px) {
          .ap-layout { grid-template-columns: 1fr; gap: 1.5rem; }
          .ap-preview-col { position: static; }
        }
      `}</style>

      {error && (
        <div style={{ color: T.red, background: T.redSoft, border: `1px solid ${T.redBorder}`, borderRadius: "0.75rem", padding: "0.65rem 0.9rem", fontSize: "0.83rem", fontWeight: 500, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
          <CircleAlert size={15} /> {error}
        </div>
      )}

      <div className="ap-layout">
        {/* ---------------- LEFT: FORM ---------------- */}
        <div>
          {/* Headline & Narrative */}
          <Section label="Listing Identity & Marketing">
            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>Listing Title / Headline</label>
              <input
                value={formData.title}
                onChange={(e) => set({ title: e.target.value })}
                style={inputStyle}
                placeholder="e.g. Executive 2-Bed Suite with City Skyline Views"
              />
            </div>
            <div>
              <label style={labelStyle}>Property Description & Narrative</label>
              <textarea
                value={formData.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Highlight living spaces, kitchen finishes, proximity to transport/business nodes, security..."
              />
            </div>
          </Section>

          {/* Location & Complex */}
          <Section label="Location & Address">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={labelStyle}>Property Type</label>
                <select
                  value={formData.property_type}
                  onChange={(e) => set({ property_type: e.target.value })}
                  style={inputStyle}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Building / Complex Name (optional)</label>
                <input
                  value={formData.complex_name}
                  onChange={(e) => set({ complex_name: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. The Apex"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={labelStyle}>Area / Suburb</label>
                <input value={formData.area} onChange={(e) => set({ area: e.target.value })} style={inputStyle} placeholder="e.g. Rosebank / Sea Point" />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input value={formData.city} onChange={(e) => set({ city: e.target.value })} style={inputStyle} placeholder="e.g. Johannesburg" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={labelStyle}>Street Address</label>
                <input value={formData.address} onChange={(e) => set({ address: e.target.value })} style={inputStyle} placeholder="e.g. 15 Baker Street" />
              </div>
              <div>
                <label style={labelStyle}>Postal Code</label>
                <input value={formData.postal_code} onChange={(e) => set({ postal_code: e.target.value })} style={inputStyle} placeholder="2196" />
              </div>
            </div>
          </Section>

          {/* Spatial Specs & Parking */}
          <Section label="Spatial Layout & Parking">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={labelStyle}>Bedrooms</label>
                <input type="number" min="0" value={formData.bedrooms} onChange={(e) => set({ bedrooms: e.target.value })} style={inputStyle} placeholder="2" />
              </div>
              <div>
                <label style={labelStyle}>Bathrooms</label>
                <input type="number" min="0" step="0.5" value={formData.bathrooms} onChange={(e) => set({ bathrooms: e.target.value })} style={inputStyle} placeholder="2" />
              </div>
              <div>
                <label style={labelStyle}>Floor Size (m²)</label>
                <input value={formData.size} onChange={(e) => set({ size: e.target.value })} style={inputStyle} placeholder="e.g. 95 m²" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Parking Bays</label>
                <input type="number" min="0" value={formData.parking_bays} onChange={(e) => set({ parking_bays: e.target.value })} style={inputStyle} placeholder="1" />
              </div>
              <div>
                <label style={labelStyle}>Parking Arrangement</label>
                <select
                  value={formData.parking_type}
                  onChange={(e) => set({ parking_type: e.target.value })}
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
          </Section>

          {/* Lease Economics & Terms */}
          <Section label="Rental Economics & Lease Terms">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={labelStyle}>Monthly Rent (ZAR)</label>
                <input type="number" value={formData.price} onChange={(e) => set({ price: e.target.value })} style={inputStyle} placeholder="12500" />
              </div>
              <div>
                <label style={labelStyle}>Deposit Requirement</label>
                <input value={formData.deposit} onChange={(e) => set({ deposit: e.target.value })} style={inputStyle} placeholder="1.5 Months" />
              </div>
              <div>
                <label style={labelStyle}>Lease Term</label>
                <select
                  value={formData.lease_term}
                  onChange={(e) => set({ lease_term: e.target.value })}
                  style={inputStyle}
                >
                  <option value="12 Months">12 Months (Standard)</option>
                  <option value="6 - 12 Months">6 - 12 Months</option>
                  <option value="24 Months">24 Months</option>
                  <option value="Month-to-Month">Month-to-Month</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Available From</label>
                <input type="date" value={formData.available_from} onChange={(e) => set({ available_from: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Electricity Model</label>
                <select
                  value={formData.electricity_type}
                  onChange={(e) => set({ electricity_type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="prepaid">Prepaid Meter</option>
                  <option value="billed">Monthly Billed</option>
                  <option value="included">Included in Rent</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Max Occupants</label>
                <input type="number" min="1" value={formData.max_occupants} onChange={(e) => set({ max_occupants: e.target.value })} style={inputStyle} placeholder="2" />
              </div>
            </div>
          </Section>

          {/* Quick Rules & Inclusions */}
          <Section label="Inclusions & Policies">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ToggleChip active={formData.water_included} onClick={() => set({ water_included: !formData.water_included })} icon={Droplets}>
                Water Included
              </ToggleChip>
              <ToggleChip active={formData.furnished} onClick={() => set({ furnished: !formData.furnished })} icon={Sofa}>
                Furnished
              </ToggleChip>
              <ToggleChip active={formData.pet_friendly} onClick={() => set({ pet_friendly: !formData.pet_friendly })} icon={PawPrint}>
                Pet Friendly
              </ToggleChip>
            </div>
          </Section>

          {/* Curated Features & Amenities */}
          <Section label="Curated Features & Amenities">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {POPULAR_AMENITIES.map((amenity) => {
                const active = (formData.amenities || []).includes(amenity);
                return (
                  <ToggleChip key={amenity} active={active} onClick={() => toggleAmenity(amenity)} icon={Sparkles}>
                    {amenity}
                  </ToggleChip>
                );
              })}
            </div>
          </Section>

          {/* Photos */}
          <Section label={`Photos${previewUrls.length ? ` · ${previewUrls.length}` : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              style={{
                width: "100%", border: `1.5px dashed ${T.borderHover}`, borderRadius: "1rem",
                background: T.accentSofter, padding: "1.25rem", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s"
              }}
            >
              <Upload size={20} color={T.accent} />
              <span style={{ fontSize: "0.84rem", fontWeight: 600, color: T.textPrimary }}>Click or drag photos here</span>
              <span style={{ fontSize: "0.72rem", color: T.textMuted }}>PNG or JPG · the first photo becomes the cover</span>
            </button>

            {previewUrls.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 8, marginTop: 12 }}>
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    onClick={() => setActiveImage(i)}
                    style={{
                      position: "relative", aspectRatio: "1 / 1", borderRadius: "0.7rem", overflow: "hidden",
                      border: `2px solid ${i === activeImage ? T.accent : T.border}`, cursor: "pointer"
                    }}
                  >
                    <img src={url} alt={`Property photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      aria-label="Remove photo"
                      style={{
                        position: "absolute", top: 3, right: 3, width: 19, height: 19, borderRadius: "50%",
                        background: "rgba(15,23,42,0.72)", border: "none", color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <X size={11} />
                    </button>
                    {i === 0 && (
                      <span style={{
                        position: "absolute", bottom: 3, left: 3, fontSize: "0.53rem", fontWeight: 800,
                        letterSpacing: "0.04em", background: T.accent, color: "#fff", padding: "1px 5px", borderRadius: 9999
                      }}>
                        COVER
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: "0.71rem", color: T.textMuted, marginTop: 8 }}>
              Click a thumbnail to preview it on the card.
            </p>
          </Section>

          {/* Property Documents */}
          <Section label={`Property documents${documentFiles.length ? ` · ${documentFiles.length}` : ""}`}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: hasRequiredDoc ? T.emeraldSoft : T.amberSoft, border: `1px solid ${hasRequiredDoc ? T.emeraldBorder : T.amberBorder}`, borderRadius: "0.75rem", padding: "0.6rem 0.8rem", marginBottom: 12 }}>
              <ShieldCheck size={15} color={hasRequiredDoc ? T.emerald : T.amber} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: "0.76rem", color: T.textSecondary, lineHeight: 1.45 }}>
                {hasRequiredDoc
                  ? "Proof of ownership attached — you're ready to submit for approval."
                  : "Proof of ownership (title deed, deed of transfer or rates clearance) is required before you can submit this listing for approval."}
              </span>
            </div>

            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,application/pdf,image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { addDocuments(e.target.files); e.target.value = ""; }}
            />

            <button
              type="button"
              className="ap-doc-drop"
              onClick={() => docInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addDocuments(e.dataTransfer.files); }}
              style={{
                width: "100%", border: `1.5px dashed ${T.borderHover}`, borderRadius: "1rem",
                background: T.surfaceAlt, padding: "1.1rem", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s"
              }}
            >
              <FileText size={20} color={T.accent} />
              <span style={{ fontSize: "0.84rem", fontWeight: 600, color: T.textPrimary }}>Add documents</span>
              <span style={{ fontSize: "0.72rem", color: T.textMuted }}>PDF, PNG or JPG · proof of ownership, rates, compliance…</span>
            </button>

            {documentFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {documentFiles.map((doc) => (
                  <div
                    key={doc.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${T.border}`, borderRadius: "0.8rem", padding: "0.55rem 0.7rem" }}
                  >
                    <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: doc.documentType === REQUIRED_DOC_TYPE ? T.accentSoft : T.surfaceAlt, border: `1px solid ${doc.documentType === REQUIRED_DOC_TYPE ? T.accentBorder : T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileText size={15} color={doc.documentType === REQUIRED_DOC_TYPE ? T.accent : T.textMuted} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {doc.title}
                      </p>
                      <span style={{ fontSize: "0.68rem", color: T.textMuted }}>
                        {docMeta(doc.documentType).label}
                      </span>
                    </div>
                    <select
                      value={doc.documentType}
                      onChange={(e) => setDocumentType(doc.id, e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${T.borderStrong}`, fontSize: "0.74rem", background: "#fff", color: T.textPrimary, outline: "none" }}
                    >
                      {PROPERTY_DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {docMeta(t).label}{t === REQUIRED_DOC_TYPE ? " (required)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      aria-label="Remove document"
                      style={{ width: 26, height: 26, borderRadius: "50%", background: "transparent", border: "none", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ---------------- RIGHT: LIVE PREVIEW & CHECKLIST ---------------- */}
        <div className="ap-preview-col">
          <p style={EYEBROW}>Live listing card preview</p>
          <div style={{
            background: "#ffffff",
            borderRadius: "1.25rem",
            border: `1px solid ${T.border}`,
            overflow: "hidden",
            boxShadow: "0 10px 30px -10px rgba(15,23,42,0.12)"
          }}>
            <div style={{
              position: "relative",
              aspectRatio: "16 / 10",
              background: coverUrl ? "#0f172a" : T.surfaceAlt,
              overflow: "hidden"
            }}>
              {coverUrl ? (
                <img src={coverUrl} alt="Cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: T.textMuted }}>
                  <ImagePlus size={26} />
                  <span style={{ fontSize: "0.75rem" }}>Upload photos to preview</span>
                </div>
              )}

              {coverUrl && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.72) 0%, transparent 55%)" }} />}

              {previewUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setActiveImage((i) => (i - 1 + previewUrls.length) % previewUrls.length)}
                    style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,23,42,0.25)" }}
                  >
                    <ChevronLeft size={16} color={T.textPrimary} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setActiveImage((i) => (i + 1) % previewUrls.length)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(15,23,42,0.25)" }}
                  >
                    <ChevronRight size={16} color={T.textPrimary} />
                  </button>
                  <span style={{ position: "absolute", top: 12, right: 12, fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: "rgba(15,23,42,0.6)", padding: "3px 9px", borderRadius: 9999 }}>
                    {activeImage + 1} / {previewUrls.length}
                  </span>
                </>
              )}

              <span style={{
                position: "absolute", top: 12, left: 12, fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.05em",
                padding: "4px 11px", borderRadius: 9999,
                background: T.amber, color: "#fff",
                display: "flex", alignItems: "center", gap: 4
              }}>
                <ShieldCheck size={12} /> AWAITING APPROVAL
              </span>

              <p style={{ position: "absolute", bottom: 12, left: 14, right: 14, fontFamily: SERIF, fontSize: "1.15rem", color: "#fff", textShadow: coverUrl ? "0 2px 10px rgba(15,23,42,0.6)" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {previewName}
              </p>
            </div>

            <div style={{ padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: "0.75rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                  <MapPin size={12} color={T.accent} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewLocation}</span>
                </span>
                <span style={{ fontFamily: SERIF, fontSize: "1.15rem", color: T.accent, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                  {previewRent}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                {[
                  { icon: <Bed size={12} color={T.accent} />, val: formData.bedrooms ? `${formData.bedrooms} bd` : "— bd" },
                  { icon: <Bath size={12} color={T.accent} />, val: formData.bathrooms ? `${formData.bathrooms} ba` : "— ba" },
                  { icon: <Maximize2 size={12} color={T.accent} />, val: formData.size || "— m²" },
                  { icon: <Car size={12} color={T.accent} />, val: formData.parking_bays ? `${formData.parking_bays} bay` : "Parking" }
                ].map(({ icon, val }, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: T.textSecondary, background: T.surfaceAlt, border: `1px solid ${T.border}`, padding: "3px 9px", borderRadius: 9999 }}>
                    {icon} {val}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {formData.water_included && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: T.accent, background: T.accentSoft, border: `1px solid ${T.accentBorder}`, padding: "2px 8px", borderRadius: 9999 }}>
                    <Droplets size={11} /> Water Incl.
                  </span>
                )}
                {formData.furnished && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: T.purple, background: T.purpleSoft, border: `1px solid ${T.purpleBorder}`, padding: "2px 8px", borderRadius: 9999 }}>
                    <Sofa size={11} /> Furnished
                  </span>
                )}
                {formData.pet_friendly && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.71rem", color: T.emerald, background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, padding: "2px 8px", borderRadius: 9999 }}>
                    <PawPrint size={11} /> Pet friendly
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Completeness checklist */}
          <div style={{ marginTop: "1rem", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: "1rem", padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textMuted }}>
                Listing readiness
              </span>
              <span style={{ fontSize: "0.76rem", fontWeight: 800, color: completion === 100 ? T.emerald : T.accent }}>
                {completion}%
              </span>
            </div>

            <div style={{ height: 6, borderRadius: 9999, background: "#e2e8f0", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ width: `${completion}%`, height: "100%", borderRadius: 9999, background: "linear-gradient(90deg,#7dd3fc,#0284c7)", transition: "width 0.4s ease" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {checklist.map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
                  <span style={{
                    width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: item.done ? T.emeraldSoft : "#ffffff",
                    border: `1px solid ${item.done ? T.emeraldBorder : (item.required && !item.done ? T.amberBorder : T.borderStrong)}`
                  }}>
                    {item.done && <Check size={10} color={T.emerald} />}
                  </span>
                  <span style={{ color: item.done ? T.textSecondary : T.textMuted }}>
                    {item.label}{item.required && !item.done ? " · required" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: "0.72rem", color: T.textMuted, marginTop: 12, lineHeight: 1.5 }}>
            Submitting sends this listing to the Place4U team for review. It only goes live once approved.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default AddPropertyModal;
