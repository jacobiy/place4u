import { useState } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Shield, Building, Calendar, FileCheck } from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";
import { LandlordQueries } from "../db/queries";

export const DOCUMENT_CATEGORIES = [
  { id: "ownership", label: "Proof of Ownership / Title Deed", icon: Shield, desc: "Deed of transfer, municipal rates clearance, or title deed." },
  { id: "id", label: "Identity Document / Passport", icon: FileCheck, desc: "National ID smartcard, green book, or official passport." },
  { id: "rates", label: "Municipal Rates & Taxes Bill", icon: FileText, desc: "Recent utility or municipal account (less than 3 months old)." },
  { id: "banking", label: "Bank Account Confirmation Letter", icon: FileText, desc: "Stamped bank confirmation letter for rent disbursements." },
  { id: "compliance", label: "Compliance Certificate (ECOC / Gas)", icon: Shield, desc: "Electrical, gas, beetle, or plumbing certificate." },
  { id: "lease", label: "Lease Agreement / Addendum", icon: FileText, desc: "Signed tenant lease contracts or tenancy addendums." },
  { id: "other", label: "Other Supporting Document", icon: FileText, desc: "Insurance policies, power of attorney, HOA rules, etc." }
];

export const DocumentUploadModal = ({
  isOpen,
  onClose,
  profile,
  user,
  properties = [],
  defaultProperty = null,
  defaultCategory = "ownership",
  onDocumentUploaded
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [propertyId, setPropertyId] = useState(defaultProperty?.id || "");
  const [propertyName, setPropertyName] = useState(defaultProperty?.name || "");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError("");
    if (file.size > 15 * 1024 * 1024) {
      setError("File exceeds 15MB limit. Please select a smaller document.");
      return;
    }
    setSelectedFile(file);
    if (!title) {
      // Default title from filename without extension
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setTitle(cleanName.replace(/[-_]/g, " "));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please choose a file to upload.");
      return;
    }
    if (!profile?.id) {
      setError("Landlord profile not found. Please ensure you are logged in.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      // 1. Upload file
      const uploadRes = await LandlordQueries.uploadVerificationDocumentFile(
        user?.id || profile.user_id || "landlord",
        selectedFile
      );

      if (!uploadRes.success) {
        throw new Error(uploadRes.error || "Failed to upload document file.");
      }

      // 2. Register document record
      const docPayload = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: title || selectedFile.name,
        documentType: category,
        fileName: selectedFile.name,
        fileUrl: uploadRes.url,
        storagePath: uploadRes.storagePath || null,
        bucket: uploadRes.bucket || null,
        fileSize: formatFileSize(selectedFile.size),
        fileType: selectedFile.type || "application/pdf",
        propertyId: propertyId || null,
        propertyName: propertyName || (propertyId ? properties.find(p => String(p.id) === String(propertyId))?.name : "Portfolio-wide"),
        expiryDate: expiryDate || null,
        notes: notes || null,
        status: "verified", // Automatically verified or marked under review
        uploadedAt: new Date().toISOString()
      };

      const saveRes = await LandlordQueries.addVerificationDocument(profile.id, docPayload);
      if (!saveRes.success) {
        throw new Error(saveRes.error || "Failed to save document record.");
      }

      // Log activity
      await LandlordQueries.logActivity(
        profile.id,
        "document_uploaded",
        `Uploaded document: ${docPayload.title} (${docPayload.documentType})`
      );

      if (onDocumentUploaded) {
        onDocumentUploaded(saveRes.data);
      }

      onClose();
      // Reset form
      setSelectedFile(null);
      setTitle("");
      setNotes("");
      setExpiryDate("");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err?.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.7rem 0.9rem",
    background: "#ffffff",
    border: `1px solid ${T.borderStrong}`,
    borderRadius: "0.75rem",
    color: T.textPrimary,
    fontSize: "0.88rem",
    outline: "none",
    fontFamily: "inherit"
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Verification & Property Document" size="lg">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {error && (
          <div style={{
            background: T.redSoft,
            border: `1px solid ${T.redBorder}`,
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            color: T.red,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Drag & Drop File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? T.accent : selectedFile ? T.emerald : T.borderHover}`,
            borderRadius: "1rem",
            padding: "1.8rem 1.5rem",
            background: dragActive ? T.accentSofter : selectedFile ? T.emeraldSoft : T.surfaceAlt,
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onClick={() => document.getElementById("file-upload-input")?.click()}
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {selectedFile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: T.emeraldSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <CheckCircle size={26} color={T.emerald} />
              </div>
              <p style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary }}>
                {selectedFile.name}
              </p>
              <span style={{ fontSize: "0.78rem", color: T.textMuted }}>
                {formatFileSize(selectedFile.size)} • Click to replace file
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: T.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <UploadCloud size={26} color={T.accent} />
              </div>
              <p style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary }}>
                Drag and drop your file here, or <span style={{ color: T.accent }}>browse</span>
              </p>
              <p style={{ fontSize: "0.75rem", color: T.textMuted }}>
                Supports PDF, JPG, PNG, WEBP, DOCX (Max 15MB)
              </p>
            </div>
          )}
        </div>

        {/* Document Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
              Document Type *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {DOCUMENT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Title Deed - Sunset Apts Unit 3A"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Property Association & Expiry */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
              Associated Property
            </label>
            <select
              value={propertyId}
              onChange={(e) => {
                const selected = e.target.value;
                setPropertyId(selected);
                const found = properties.find(p => String(p.id) === String(selected));
                setPropertyName(found ? found.name : "Portfolio-wide");
              }}
              style={inputStyle}
            >
              <option value="">Portfolio-wide (General Landlord Doc)</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
              Expiry Date (if applicable)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.textMuted, marginBottom: "6px", textTransform: "uppercase" }}>
            Optional Notes / Registration Ref
          </label>
          <input
            type="text"
            placeholder="e.g. Deeds Office transfer reference #T14829/2024"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
          <PrimaryBtn type="submit" style={{ flex: 1 }} disabled={isUploading || !selectedFile}>
            {isUploading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                Uploading & Verifying...
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Shield size={16} /> Upload & Save Document
              </span>
            )}
          </PrimaryBtn>
          <SecondaryBtn type="button" onClick={onClose} disabled={isUploading}>
            Cancel
          </SecondaryBtn>
        </div>
      </form>
    </Modal>
  );
};
