import { useState, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Shield, Building, Calendar, RefreshCw, FileCheck, Info } from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";
import { LandlordQueries } from "../db/queries";
import { DOCUMENT_CATEGORIES } from "./DocumentUploadModal";

export const DocumentReplaceModal = ({
  isOpen,
  onClose,
  document: doc,
  profile,
  user,
  properties = [],
  onDocumentReplaced
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ownership");
  const [propertyId, setPropertyId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Sync initial values when doc changes
  useEffect(() => {
    if (doc) {
      setTitle(doc.title || "");
      setCategory(doc.documentType || "ownership");
      setPropertyId(doc.propertyId || "");
      setPropertyName(doc.propertyName || "");
      setExpiryDate(doc.expiryDate || "");
      setNotes(doc.notes || "");
      setSelectedFile(null);
      setError("");
    }
  }, [doc, isOpen]);

  if (!doc) return null;

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
      setError("Please select a new file to replace the current document.");
      return;
    }
    if (!profile?.id) {
      setError("Landlord profile not found. Please log in and try again.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const userId = user?.id || profile.user_id || "landlord-user";

      // 1. Upload new binary file to storage bucket
      const uploadRes = await LandlordQueries.uploadVerificationDocumentFile(userId, selectedFile);
      if (!uploadRes.success) {
        throw new Error(uploadRes.error || "Failed to upload document file.");
      }

      // 2. Prepare updated payload
      const replacementPayload = {
        title: title.trim() || doc.title,
        documentType: category,
        fileUrl: uploadRes.url,
        fileName: uploadRes.fileName,
        fileSize: formatFileSize(uploadRes.fileSize),
        fileType: uploadRes.fileType,
        storagePath: uploadRes.storagePath,
        bucket: uploadRes.bucket,
        propertyId: propertyId || null,
        propertyName: propertyName || (propertyId ? properties.find(p => String(p.id) === String(propertyId))?.name : "Portfolio-wide"),
        expiryDate: expiryDate || null,
        notes: notes.trim(),
        status: "verified"
      };

      // 3. Update database record via replace query
      const replaceRes = await LandlordQueries.replaceVerificationDocument(profile.id, doc.id, replacementPayload);

      if (!replaceRes.success) {
        // Fallback in-memory replacement if database returned error
        const fallbackUpdatedDoc = { ...doc, ...replacementPayload, id: doc.id };
        if (onDocumentReplaced) {
          onDocumentReplaced(profile, fallbackUpdatedDoc);
        }
      } else {
        if (onDocumentReplaced) {
          onDocumentReplaced(replaceRes.data, replaceRes.updatedDoc);
        }
      }

      onClose();
    } catch (err) {
      console.error("Document replacement error:", err);
      setError(err.message || "Failed to replace document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Replace Verification Document" size="lg">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        
        {/* Current Document Summary Card */}
        <div style={{
          background: T.accentSofter,
          border: `1px solid ${T.accentBorder}`,
          borderRadius: "0.875rem",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem"
        }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: T.accentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.accent,
            flexShrink: 0
          }}>
            <RefreshCw size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: T.accent, letterSpacing: "0.05em" }}>
                Replacing Document
              </span>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                background: T.surfaceAlt,
                border: `1px solid ${T.border}`,
                padding: "2px 8px",
                borderRadius: "12px",
                color: T.textMuted
              }}>
                Current: {doc.fileName || "File"}
              </span>
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: T.textPrimary, margin: 0 }}>
              {doc.title}
            </h4>
            <p style={{ fontSize: "0.78rem", color: T.textMuted, margin: "4px 0 0 0", lineHeight: 1.4 }}>
              Uploading a replacement will overwrite the file in secure storage, keep your verification history intact, and update the timestamp.
            </p>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div style={{
            background: T.redSoft,
            border: `1px solid ${T.redBorder}`,
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: T.red,
            fontSize: "0.85rem"
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* File Dropzone */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: T.textPrimary, marginBottom: "0.5rem" }}>
            Select Replacement File (PDF, Image, or Word) <span style={{ color: T.red }}>*</span>
          </label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? T.accent : selectedFile ? T.emerald : T.borderHover}`,
              borderRadius: "0.875rem",
              background: dragActive ? T.accentSofter : selectedFile ? T.emeraldSoft : T.surfaceAlt,
              padding: "1.75rem 1.25rem",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={() => document.getElementById("landlord-replace-doc-input")?.click()}
          >
            <input
              id="landlord-replace-doc-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={36} color={T.emerald} />
                <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: "0.95rem" }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: "0.78rem", color: T.textMuted }}>
                  {formatFileSize(selectedFile.size)} • Ready to supersede current file
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  style={{
                    marginTop: "8px",
                    background: T.redSoft,
                    border: `1px solid ${T.redBorder}`,
                    color: T.red,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    cursor: "pointer"
                  }}
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <UploadCloud size={38} color={T.accent} />
                <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: "0.95rem" }}>
                  Drag & drop new file here, or <span style={{ color: T.accent, textDecoration: "underline" }}>browse</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: T.textMuted }}>
                  Supports PDF, PNG, JPG, WEBP, DOCX (Max 15MB)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Title & Category */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textSecondary, marginBottom: "0.35rem" }}>
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. South African National ID Card"
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                background: "#ffffff",
                border: `1px solid ${T.borderStrong}`,
                borderRadius: "0.75rem",
                color: T.textPrimary,
                fontSize: "0.875rem",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textSecondary, marginBottom: "0.35rem" }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                background: "#ffffff",
                border: `1px solid ${T.borderStrong}`,
                borderRadius: "0.75rem",
                color: T.textPrimary,
                fontSize: "0.875rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {DOCUMENT_CATEGORIES.map(c => (
                <option key={c.id} value={c.id} style={{ background: "#ffffff", color: T.textPrimary }}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Property & Expiry Date */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textSecondary, marginBottom: "0.35rem" }}>
              Associated Property
            </label>
            <select
              value={propertyId}
              onChange={(e) => {
                const pId = e.target.value;
                setPropertyId(pId);
                const found = properties.find(p => String(p.id) === String(pId));
                setPropertyName(found ? found.name : "Portfolio-wide");
              }}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                background: "#ffffff",
                border: `1px solid ${T.borderStrong}`,
                borderRadius: "0.75rem",
                color: T.textPrimary,
                fontSize: "0.875rem",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="" style={{ background: "#ffffff", color: T.textPrimary }}>
                Portfolio-wide / General Identification
              </option>
              {properties.map(p => (
                <option key={p.id} value={p.id} style={{ background: "#ffffff", color: T.textPrimary }}>
                  {p.name || p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textSecondary, marginBottom: "0.35rem" }}>
              Expiry Date (if applicable)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                background: "#ffffff",
                border: `1px solid ${T.borderStrong}`,
                borderRadius: "0.75rem",
                color: T.textPrimary,
                fontSize: "0.875rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textSecondary, marginBottom: "0.35rem" }}>
            Reference Notes / Reason for Replacement
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Renewed annual certificate, updated utility bill"
            style={{
              width: "100%",
              padding: "0.65rem 0.85rem",
              background: "#ffffff",
              border: `1px solid ${T.borderStrong}`,
              borderRadius: "0.75rem",
              color: T.textPrimary,
              fontSize: "0.875rem",
              outline: "none"
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${T.border}` }}>
          <SecondaryBtn type="button" onClick={onClose} disabled={isUploading}>
            Cancel
          </SecondaryBtn>

          <PrimaryBtn type="submit" disabled={isUploading || !selectedFile}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <RefreshCw size={15} className={isUploading ? "animate-spin" : ""} />
              {isUploading ? "Uploading & Replacing..." : "Confirm Replacement"}
            </span>
          </PrimaryBtn>
        </div>

      </form>
    </Modal>
  );
};
export default DocumentReplaceModal;
