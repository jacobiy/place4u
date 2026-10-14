import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, X, FileText, ShieldCheck, CircleAlert, Check,
  ExternalLink, Trash2, Send, Clock
} from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T, SERIF } from "../Styles/designTokens";
import { DOCUMENT_CATEGORIES } from "./DocumentUploadModal";
import { getApprovalMeta } from "../Styles/approval";
import { LandlordQueries } from "../db/queries";

const REQUIRED_DOC_TYPE = "ownership";
const PROPERTY_DOC_TYPES = ["ownership", "rates", "compliance", "id", "banking"];

const docMeta = (id) => DOCUMENT_CATEGORIES.find((c) => c.id === id) || { label: "Document", desc: "" };

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(bytes);
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

export const PropertyDocumentsModal = ({ isOpen, onClose, property, user, onChanged, onSubmitted }) => {
  const [docs, setDocs] = useState([]);
  const [documentType, setDocumentType] = useState(REQUIRED_DOC_TYPE);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setDocs(Array.isArray(property?.documents) ? property.documents : []);
      setDocumentType(REQUIRED_DOC_TYPE);
      setError("");
    }
  }, [isOpen, property]);

  const approval = getApprovalMeta(property?.approval_status);
  const hasRequired = docs.some((d) => d.documentType === REQUIRED_DOC_TYPE);
  const canSubmit = hasRequired && ["draft", "rejected"].includes(property?.approval_status || "approved");

  const grouped = useMemo(() => docs, [docs]);

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList || []).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    if (files.length === 0 || !property?.id) return;

    setUploading(true);
    setError("");
    let latest = docs;
    try {
      for (const file of files) {
        const upload = await LandlordQueries.uploadPropertyDocument(property.id, file);
        if (!upload.success) {
          setError(upload.error || `Could not upload ${file.name}.`);
          continue;
        }
        const res = await LandlordQueries.addPropertyDocument(property.id, {
          title: file.name,
          documentType,
          fileName: upload.fileName,
          fileUrl: upload.url,
          storagePath: upload.storagePath,
          bucket: upload.bucket,
          fileSize: upload.fileSize,
          fileType: upload.fileType
        });
        if (res.success) {
          latest = Array.isArray(res.data?.documents) ? res.data.documents : latest;
        } else {
          setError(res.error || `Could not attach ${file.name}.`);
        }
      }
      setDocs(latest);
      await onChanged?.();
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (docId) => {
    if (!property?.id) return;
    setBusyId(docId);
    setError("");
    try {
      const res = await LandlordQueries.removePropertyDocument(property.id, docId);
      if (!res.success) {
        setError(res.error || "Could not remove document.");
        return;
      }
      setDocs(Array.isArray(res.data?.documents) ? res.data.documents : docs.filter((d) => d.id !== docId));
      await onChanged?.();
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async () => {
    if (!property?.id) return;
    if (!hasRequired) {
      setError("Attach a proof of ownership document before submitting for approval.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await LandlordQueries.submitPropertyForApproval(property.id);
      if (!res.success) {
        setError(res.error || "Could not submit for approval.");
        return;
      }
      // onSubmitted (when provided) also logs the activity + refreshes the list.
      if (onSubmitted) await onSubmitted(property);
      else await onChanged?.();
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Property documents"
      subtitle={property?.name || property?.address || "Listing verification"}
      size="lg"
      footer={
        <>
          <SecondaryBtn onClick={onClose} disabled={submitting}>
            Close
          </SecondaryBtn>
          <PrimaryBtn onClick={handleSubmit} disabled={submitting || uploading || !canSubmit}>
            <Send size={15} />
            {submitting
              ? "Submitting..."
              : property?.approval_status === "pending_approval"
                ? "Submitted"
                : property?.approval_status === "approved"
                  ? "Approved"
                  : "Submit for approval"}
          </PrimaryBtn>
        </>
      }
    >
      {/* Approval state banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: approval.soft, border: `1px solid ${approval.border}`, borderRadius: "0.9rem", padding: "0.8rem 0.95rem", marginBottom: "1.25rem" }}>
        <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: "#fff", border: `1px solid ${approval.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {property?.approval_status === "approved" ? <Check size={15} color={approval.color} /> : <Clock size={15} color={approval.color} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: approval.color }}>{approval.label}</p>
          <p style={{ fontSize: "0.75rem", color: T.textSecondary, lineHeight: 1.45, marginTop: 2 }}>
            {property?.approval_notes && property?.approval_status === "rejected"
              ? property.approval_notes
              : approval.help}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ color: T.red, background: T.redSoft, border: `1px solid ${T.redBorder}`, borderRadius: "0.75rem", padding: "0.6rem 0.85rem", fontSize: "0.8rem", fontWeight: 500, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
          <CircleAlert size={14} /> {error}
        </div>
      )}

      {/* Uploader */}
      <div style={{ display: "flex", gap: 10, alignItems: "stretch", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", minWidth: 180 }}>
          <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.textMuted, marginBottom: 6 }}>
            Document type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.8rem", background: "#fff", border: `1px solid ${T.borderStrong}`, borderRadius: "0.75rem", fontSize: "0.85rem", color: T.textPrimary, outline: "none", fontFamily: "inherit" }}
          >
            {PROPERTY_DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {docMeta(type).label}{type === REQUIRED_DOC_TYPE ? " (required)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 200, display: "flex", alignItems: "flex-end" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf,image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
            disabled={uploading}
            style={{
              width: "100%", border: `1.5px dashed ${T.borderHover}`, borderRadius: "0.85rem",
              background: T.accentSofter, padding: "0.6rem 0.9rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: "0.83rem", fontWeight: 600, color: T.textPrimary, transition: "all 0.15s"
            }}
          >
            <Upload size={16} color={T.accent} />
            {uploading ? "Uploading…" : "Upload documents"}
          </button>
        </div>
      </div>

      {/* Document list */}
      {grouped.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem 1rem", background: T.surfaceAlt, border: `1px dashed ${T.border}`, borderRadius: "0.9rem" }}>
          <FileText size={26} color={T.textMuted} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: T.textSecondary }}>No documents attached yet</p>
          <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: 4 }}>
            Add a proof of ownership to unlock submission for approval.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {grouped.map((doc) => {
            const isRequired = doc.documentType === REQUIRED_DOC_TYPE;
            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: `1px solid ${T.border}`, borderRadius: "0.85rem", padding: "0.65rem 0.8rem" }}>
                <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: isRequired ? T.accentSoft : T.surfaceAlt, border: `1px solid ${isRequired ? T.accentBorder : T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={17} color={isRequired ? T.accent : T.textMuted} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.83rem", fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {doc.title || doc.fileName}
                  </p>
                  <p style={{ fontSize: "0.71rem", color: T.textMuted, marginTop: 2 }}>
                    {docMeta(doc.documentType).label}
                    {doc.fileSize ? ` · ${formatBytes(doc.fileSize)}` : ""}
                    {doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ""}
                  </p>
                </div>

                {isRequired && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.04em", color: T.emerald, background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, padding: "3px 8px", borderRadius: 9999, flexShrink: 0 }}>
                    <ShieldCheck size={11} /> REQUIRED
                  </span>
                )}

                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open document"
                    style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSecondary }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(doc.id)}
                  disabled={busyId === doc.id}
                  title="Remove document"
                  style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: T.redSoft, border: `1px solid ${T.redBorder}`, color: T.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: "0.72rem", color: T.textMuted, marginTop: "1rem", lineHeight: 1.5 }}>
        These documents are attached to <span style={{ fontFamily: SERIF, color: T.textPrimary }}>{property?.name || "this listing"}</span> only — they stay with the property for verification and are visible to the review team.
      </p>
    </Modal>
  );
};

export default PropertyDocumentsModal;
