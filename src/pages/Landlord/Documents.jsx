import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Shield,
  Upload,
  Search,
  CheckCircle,
  Download,
  Trash2,
  Building,
  FileCheck,
  Calendar,
  Lock,
  Eye,
  RefreshCw
} from "lucide-react";
import { T, SERIF } from "./Styles/designTokens";
import { PrimaryBtn, SecondaryBtn } from "./Component/Buttons";
import { DocumentUploadModal, DOCUMENT_CATEGORIES } from "./Component/DocumentUploadModal";
import { DocumentPreviewModal } from "./Component/DocumentPreviewModal";
import { DocumentReplaceModal } from "./Component/DocumentReplaceModal";
import { PropertyDocumentsModal } from "./Component/PropertyDocumentsModal";
import { LandlordQueries } from "./db/queries";
import { ConfirmModal, AlertToast } from "../../component/AlertModal";

const EYEBROW = { fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: T.textMuted, margin: 0 };

const formatSize = (size) => {
  if (size === null || size === undefined || size === "") return "—";
  if (typeof size === "string") return size;
  const n = Number(size);
  if (Number.isNaN(n)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

export const Documents = ({ profile, properties = [], onProfileUpdate, onRefreshProperties, onPropertySubmitted, user }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [docToReplace, setDocToReplace] = useState(null);
  const [listingDocsProperty, setListingDocsProperty] = useState(null);

  const showToast = (message, title = "Success", type = "success") => {
    setToast({ title, message, type });
  };

  const handleOpenPreview = (doc) => {
    setSelectedPreviewDoc(doc);
    setIsPreviewOpen(true);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      if (!doc.fileUrl || doc.fileUrl === "#") {
        const textContent =
          `PLACE4U VERIFIED LANDLORD DOCUMENT\n` +
          `====================================\n` +
          `Title: ${doc.title}\n` +
          `Category: ${doc.documentType}\n` +
          `Property: ${doc.propertyName || "Portfolio-wide"}\n` +
          `Status: ${doc.status}\n` +
          `Timestamp: ${doc.uploadedAt || new Date().toISOString()}\n` +
          `Notes: ${doc.notes || "Official Verified Specimen"}\n`;

        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${doc.fileName || "document"}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast(`Downloaded specimen record for ${doc.title}`);
        return;
      }

      const res = await fetch(doc.fileUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast(`Downloaded ${doc.fileName || "document"}`);
    } catch (err) {
      console.warn("Direct download failed, opening in new tab:", err);
      if (doc.fileUrl && doc.fileUrl !== "#") {
        window.open(doc.fileUrl, "_blank");
      }
    }
  };

  // Sync profile-level verification documents. No seeded placeholders — the vault
  // must only ever show documents the landlord actually uploaded.
  useEffect(() => {
    if (Array.isArray(profile?.verification_documents)) {
      setDocuments(profile.verification_documents);
    } else {
      setDocuments([]);
    }
  }, [profile?.verification_documents]);

  // Property-scoped documents, gathered from each listing's `documents` array so
  // the vault shows both profile credentials and per-listing proof of ownership.
  const propertyDocs = useMemo(() => {
    const out = [];
    (properties || []).forEach((p) => {
      const list = Array.isArray(p.documents) ? p.documents : [];
      list.forEach((d) => {
        out.push({
          ...d,
          __source: "property",
          propertyId: p.id,
          propertyName: p.name || p.address || "Listing",
          propertyApprovalStatus: p.approval_status || "approved"
        });
      });
    });
    return out;
  }, [properties]);

  const profileDocs = useMemo(() => documents.map((d) => ({ ...d, __source: "profile" })), [documents]);
  const allDocs = useMemo(() => [...propertyDocs, ...profileDocs], [propertyDocs, profileDocs]);

  // Handle document uploaded
  const handleDocumentUploaded = (updatedProfile) => {
    if (updatedProfile?.verification_documents) {
      setDocuments(updatedProfile.verification_documents);
    }
    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile);
    }
    showToast("Document successfully uploaded and secured.");
  };

  // Handle document replaced
  const handleDocumentReplaced = (updatedProfile, updatedDoc) => {
    if (updatedProfile?.verification_documents) {
      setDocuments(updatedProfile.verification_documents);
    } else if (updatedDoc) {
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    }
    if (onProfileUpdate && updatedProfile) {
      onProfileUpdate(updatedProfile);
    }
    showToast(`"${updatedDoc?.title || 'Document'}" replaced successfully with new file.`, "Document Replaced", "success");
    setDocToReplace(null);
  };

  // Handle document deletion execution
  const performDeleteDocument = async (docOrId, docTitle) => {
    const docId = typeof docOrId === "object" && docOrId !== null ? docOrId.id : docOrId;
    const doc = typeof docOrId === "object" && docOrId !== null
      ? docOrId
      : allDocs.find((d) => d.id === docId);
    const title = docTitle || doc?.title || "Document";

    setDeletingId(docId);

    try {
      // Listing-scoped document — remove straight from the property record.
      if (doc?.__source === "property" && doc.propertyId) {
        const res = await LandlordQueries.removePropertyDocument(doc.propertyId, docId);
        if (res.success && onRefreshProperties) await onRefreshProperties();
        showToast(`"${title}" was removed from the listing.`, "Document Removed", "success");
        setDocToDelete(null);
        return;
      }

      if (profile?.id) {
        const res = await LandlordQueries.removeVerificationDocument(profile.id, docId);
        if (res.success && res.data) {
          setDocuments(res.data.verification_documents || []);
          if (onProfileUpdate) onProfileUpdate(res.data);
        } else {
          setDocuments(prev => prev.filter(d => d.id !== docId));
        }
      } else {
        setDocuments(prev => prev.filter(d => d.id !== docId));
      }
      showToast(`"${title}" was removed from your records.`, "Document Removed", "success");
    } catch {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      showToast(`Document was removed.`, "Document Removed", "success");
    } finally {
      setDeletingId(null);
      setDocToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    await performDeleteDocument(docToDelete);
  };

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return allDocs.filter(doc => {
      const matchCat = selectedCategory === "all" || doc.documentType === selectedCategory;
      const matchProp =
        selectedPropertyFilter === "all" ||
        (doc.propertyName && doc.propertyName.toLowerCase().includes(selectedPropertyFilter.toLowerCase())) ||
        (doc.propertyId && String(doc.propertyId) === String(selectedPropertyFilter));
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (doc.title && doc.title.toLowerCase().includes(q)) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(q)) ||
        (doc.propertyName && doc.propertyName.toLowerCase().includes(q)) ||
        (doc.notes && doc.notes.toLowerCase().includes(q));
      return matchCat && matchProp && matchSearch;
    });
  }, [allDocs, selectedCategory, selectedPropertyFilter, searchQuery]);

  // Category Icon helper
  const getCategoryIcon = (type) => {
    switch (type) {
      case "ownership":
        return Shield;
      case "id":
        return FileCheck;
      case "rates":
        return FileText;
      case "compliance":
        return Shield;
      default:
        return FileText;
    }
  };

  const getCategoryLabel = (type) => {
    const found = DOCUMENT_CATEGORIES.find(c => c.id === type);
    return found ? found.label : "Document";
  };

  const verifiedCount = allDocs.filter((d) => d.status === "verified").length;
  const vaultHealth = allDocs.length ? Math.round((verifiedCount / allDocs.length) * 100) : 0;
  const listingDocsCount = propertyDocs.length;
  const hasOwnershipDoc = allDocs.some((d) => d.documentType === "ownership");
  const hasIdDoc = allDocs.some((d) => d.documentType === "id");
  const hasComplianceDoc = allDocs.some((d) => ["compliance", "rates"].includes(d.documentType));

  const statusCard = ({ eyebrow, title, caption, icon: Icon, accent, accentSoft, accentBorder, tag }) => (
    <div className="ll-card-hover" style={{
      background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
      padding: "1.25rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem", boxShadow: T.shadowSm
    }}>
      <div style={{
        width: "50px", height: "50px", borderRadius: "0.9rem", background: accentSoft,
        border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <Icon size={23} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: "3px" }}>
          <span style={EYEBROW}>{eyebrow}</span>
          <span style={{ fontSize: "0.68rem", color: accent, fontWeight: 800, letterSpacing: "0.04em" }}>{tag}</span>
        </div>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: T.textPrimary, fontFamily: SERIF }}>{title}</p>
        <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>{caption}</p>
      </div>
    </div>
  );

  return (
    <div className="ll-scope" style={{ maxWidth: "1400px", margin: "0 auto", minWidth: 0 }}>
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      <ConfirmModal
        isOpen={!!docToDelete}
        title="Delete Verification Document?"
        itemName={docToDelete?.title}
        message="Are you sure you want to permanently delete this document? The file will be unlinked from your landlord profile and removed from secure storage."
        confirmText="Yes, Delete Document"
        cancelText="Cancel"
        type="danger"
        isLoading={deletingId === docToDelete?.id}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deletingId && setDocToDelete(null)}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        profile={profile}
        user={user}
        properties={properties}
        onDocumentUploaded={handleDocumentUploaded}
      />

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        document={selectedPreviewDoc}
        profile={profile}
        user={user}
        properties={properties}
        onDelete={(docId) => performDeleteDocument(docId, selectedPreviewDoc?.title)}
        onDownload={handleDownloadDocument}
        onReplace={handleDocumentReplaced}
      />

      <DocumentReplaceModal
        isOpen={!!docToReplace}
        onClose={() => setDocToReplace(null)}
        document={docToReplace}
        profile={profile}
        user={user}
        properties={properties}
        onDocumentReplaced={handleDocumentReplaced}
      />

      <PropertyDocumentsModal
        isOpen={!!listingDocsProperty}
        onClose={() => setListingDocsProperty(null)}
        property={listingDocsProperty}
        user={user}
        onChanged={async () => { if (onRefreshProperties) await onRefreshProperties(); }}
        onSubmitted={(property) => onPropertySubmitted?.(property)}
      />

      {/* HERO */}
      <div className="ll-anim-up" style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap",
        background: "linear-gradient(135deg, #ffffff 0%, #f3f9ff 60%, #eef6ff 100%)",
        border: `1px solid ${T.border}`, borderRadius: T.radiusXl, padding: "clamp(1.4rem, 3.5vw, 2rem)",
        marginBottom: "1.75rem", position: "relative", overflow: "hidden", boxShadow: T.shadow
      }}>
        <div aria-hidden style={{ position: "absolute", top: -60, right: -50, width: 240, height: 240, borderRadius: "9999px", background: "radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)" }} />
        <div style={{ position: "relative", zIndex: 1, flex: "1 1 340px", minWidth: 0 }}>
          <span style={{
            background: T.emeraldSoft, color: T.emerald, fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.05em",
            padding: "4px 12px", borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${T.emeraldBorder}`
          }}>
            <Lock size={12} /> ENCRYPTED & SECURE VAULT
          </span>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.6rem, 4vw, 2.3rem)", color: T.textPrimary, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "12px 0 6px" }}>
            Proof of ownership & compliance
          </h1>
          <p style={{ color: T.textSecondary, fontSize: "0.9rem", maxWidth: "620px", lineHeight: 1.6 }}>
            Upload and manage title deeds, municipal rates certificates, identity verification, and electrical compliance
            documents. Documents attached to a specific listing appear here alongside your profile credentials.
          </p>

          <div style={{ marginTop: "1.25rem", maxWidth: 340 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.72rem", color: T.textMuted, fontWeight: 600 }}>Vault verification health</span>
              <span style={{ fontSize: "0.72rem", color: T.emerald, fontWeight: 800 }}>{vaultHealth}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: T.surface, overflow: "hidden" }}>
              <div style={{ width: `${vaultHealth}%`, height: "100%", borderRadius: 9999, background: "linear-gradient(90deg, #34d399, #059669)", transition: "width 0.6s ease" }} />
            </div>
            <p style={{ fontSize: "0.72rem", color: T.textMuted, marginTop: 6 }}>
              {verifiedCount} of {allDocs.length} documents verified
              {listingDocsCount > 0 ? ` · ${listingDocsCount} attached to listings` : ""}
            </p>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <PrimaryBtn onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={16} /> Upload New Document
          </PrimaryBtn>
        </div>
      </div>

      {/* VERIFICATION STATUS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "1.25rem", marginBottom: "1.75rem" }}>
        {statusCard({ eyebrow: "Proof of Ownership", title: hasOwnershipDoc ? "Title Deeds On File" : "No ownership document", caption: hasOwnershipDoc ? "Attached to a listing for review" : "Upload a title deed or rates clearance", icon: Shield, accent: hasOwnershipDoc ? T.emerald : T.amber, accentSoft: hasOwnershipDoc ? T.emeraldSoft : T.amberSoft, accentBorder: hasOwnershipDoc ? T.emeraldBorder : T.amberBorder, tag: hasOwnershipDoc ? "ON FILE" : "ACTION" })}
        {statusCard({ eyebrow: "Identity Status", title: hasIdDoc ? "ID Document On File" : "No ID document", caption: hasIdDoc ? "Identity document attached" : "Upload your national ID or passport", icon: FileCheck, accent: hasIdDoc ? T.accent : T.amber, accentSoft: hasIdDoc ? T.accentSoft : T.amberSoft, accentBorder: hasIdDoc ? T.accentBorder : T.amberBorder, tag: hasIdDoc ? "ON FILE" : "ACTION" })}
        {statusCard({ eyebrow: "Compliance & Rates", title: hasComplianceDoc ? "Rates / ECOC On File" : "No compliance documents", caption: hasComplianceDoc ? "Municipal / compliance certificates attached" : "Upload rates or a compliance certificate", icon: FileText, accent: hasComplianceDoc ? T.purple : T.amber, accentSoft: hasComplianceDoc ? T.purpleSoft : T.amberSoft, accentBorder: hasComplianceDoc ? T.purpleBorder : T.amberBorder, tag: hasComplianceDoc ? "ON FILE" : "ACTION" })}
      </div>

      {/* TOOLBAR */}
      <div style={{
        background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: "1.1rem 1.3rem",
        marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "1rem", boxShadow: T.shadowSm
      }}>
        <div style={{ position: "relative", minWidth: "240px", flex: "1 1 280px" }}>
          <Search size={15} color={T.textMuted} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search documents by title, property, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", padding: "0.6rem 0.9rem 0.6rem 2.4rem", background: "#ffffff",
              border: `1px solid ${T.borderStrong}`, borderRadius: 9999, color: T.textPrimary, fontSize: "0.85rem", outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "4px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 9999, padding: 4, overflowX: "auto", maxWidth: "100%" }}>
          {[
            { id: "all", label: "All" },
            { id: "ownership", label: "Ownership" },
            { id: "id", label: "ID" },
            { id: "rates", label: "Rates" },
            { id: "compliance", label: "Compliance" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              style={{
                padding: "6px 14px", borderRadius: 9999, border: "none", fontSize: "0.77rem",
                fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                background: selectedCategory === tab.id ? T.accent : "transparent",
                color: selectedCategory === tab.id ? "#ffffff" : T.textSecondary
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {properties && properties.length > 0 && (
          <select
            value={selectedPropertyFilter}
            onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            style={{
              padding: "0.6rem 0.9rem", background: "#ffffff", border: `1px solid ${T.borderStrong}`,
              borderRadius: 9999, color: T.textPrimary, fontSize: "0.82rem", outline: "none", maxWidth: 220
            }}
          >
            <option value="all">All properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* DOCUMENT CARDS GRID */}
      {filteredDocs.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))", gap: "1.25rem" }}>
          {filteredDocs.map((doc, idx) => {
            const IconComponent = getCategoryIcon(doc.documentType);
            const isOwnership = doc.documentType === "ownership";
            const accent = isOwnership ? T.emerald : T.accent;
            const accentSoft = isOwnership ? T.emeraldSoft : T.accentSoft;
            const accentBorder = isOwnership ? T.emeraldBorder : T.accentBorder;

            return (
              <div
                key={doc.id || idx}
                className="ll-card-hover ll-anim-up"
                style={{
                  background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
                  padding: "1.4rem", display: "flex", flexDirection: "column", boxShadow: T.shadowSm
                }}
              >
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "0.75rem", background: accentSoft,
                      border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <IconComponent size={20} color={accent} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "0.66rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: accent }}>
                        {getCategoryLabel(doc.documentType)}
                      </span>
                      <h3 style={{ fontSize: "0.93rem", fontWeight: 700, color: T.textPrimary, lineHeight: 1.3, marginTop: "2px" }}>
                        {doc.title}
                      </h3>
                    </div>
                  </div>

                  <span style={{
                    fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.03em", padding: "4px 9px", borderRadius: 9999,
                    background: doc.status === "verified" ? T.emeraldSoft : T.amberSoft,
                    color: doc.status === "verified" ? T.emerald : T.amber,
                    display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", flexShrink: 0
                  }}>
                    <CheckCircle size={10} />
                    {doc.status === "verified" ? "VERIFIED" : "REVIEW"}
                  </span>
                </div>

                {/* Details Section */}
                <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: "0.75rem", padding: "10px 12px", marginBottom: "1rem", fontSize: "0.78rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: T.textSecondary, marginBottom: "4px", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <Building size={13} color={T.accent} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Property: <strong style={{ color: T.textPrimary }}>{doc.propertyName || "Portfolio-wide"}</strong>
                      </span>
                    </span>
                    <span style={{
                      fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em", padding: "2px 7px", borderRadius: 9999, flexShrink: 0,
                      background: doc.__source === "property" ? T.accentSoft : T.surface,
                      color: doc.__source === "property" ? T.accent : T.textMuted,
                      border: `1px solid ${doc.__source === "property" ? T.accentBorder : T.border}`
                    }}>
                      {doc.__source === "property" ? "LISTING" : "PROFILE"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: T.textMuted, fontSize: "0.71rem", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>File: {doc.fileName || "document.pdf"} ({formatSize(doc.fileSize)})</span>
                    <span>Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "Recent"}</span>
                  </div>

                  {doc.notes && (
                    <p style={{ marginTop: "6px", color: T.textMuted, fontSize: "0.71rem", fontStyle: "italic" }}>
                      "{doc.notes}"
                    </p>
                  )}

                  {doc.expiryDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: T.amber, marginTop: "6px", fontSize: "0.71rem", fontWeight: 600 }}>
                      <Calendar size={12} />
                      <span>Valid until: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
                  <button
                    onClick={() => handleOpenPreview(doc)}
                    style={{
                      flex: "1 1 calc(50% - 4px)", minWidth: "85px", padding: "8px 10px",
                      background: T.accentSoft, border: `1px solid ${T.accentBorder}`, borderRadius: 9999,
                      color: T.accent, fontSize: "0.77rem", fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; }}
                  >
                    <Eye size={13} /> Preview
                  </button>

                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    style={{
                      flex: "1 1 calc(50% - 4px)", minWidth: "85px", padding: "8px 10px",
                      background: "#ffffff", border: `1px solid ${T.borderStrong}`, borderRadius: 9999,
                      color: T.textPrimary, fontSize: "0.77rem", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceAlt}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                    title="Download document file"
                  >
                    <Download size={13} /> Download
                  </button>

                  {doc.__source === "property" ? (
                    <button
                      onClick={() => setListingDocsProperty((properties || []).find((p) => p.id === doc.propertyId) || null)}
                      style={{
                        flex: "1 1 auto", minWidth: "80px", padding: "8px 10px", background: "#ffffff",
                        border: `1px solid ${T.borderStrong}`, borderRadius: 9999, color: T.textMuted,
                        fontSize: "0.77rem", fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.background = T.accentSofter; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = "#ffffff"; }}
                      title="Add or remove documents on this listing"
                    >
                      <Building size={13} /> Manage
                    </button>
                  ) : (
                    <button
                      onClick={() => setDocToReplace(doc)}
                      style={{
                        flex: "1 1 auto", minWidth: "80px", padding: "8px 10px", background: "#ffffff",
                        border: `1px solid ${T.borderStrong}`, borderRadius: 9999, color: T.textMuted,
                        fontSize: "0.77rem", fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.background = T.accentSofter; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = "#ffffff"; }}
                      title="Replace with new file"
                    >
                      <RefreshCw size={13} /> Replace
                    </button>
                  )}

                  <button
                    onClick={() => setDocToDelete(doc)}
                    disabled={deletingId === doc.id}
                    style={{
                      padding: "8px 11px", background: "#ffffff", border: `1px solid ${T.borderStrong}`, borderRadius: 9999,
                      color: T.textMuted, cursor: deletingId === doc.id ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.redBorder; e.currentTarget.style.background = T.redSoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = "#ffffff"; }}
                    title="Delete document"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          background: "#ffffff", border: `1px dashed ${T.borderHover}`, borderRadius: T.radiusLg, padding: "4rem 2rem",
          textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: T.shadowSm
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Shield size={28} color={T.accent} />
          </div>
          <h3 style={{ fontFamily: SERIF, fontSize: "1.4rem", color: T.textPrimary, marginBottom: "0.5rem" }}>
            No documents matched your criteria
          </h3>
          <p style={{ color: T.textMuted, fontSize: "0.85rem", maxWidth: "440px", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Upload title deeds, municipal utility accounts, or national ID cards to verify your ownership of properties on Place4U.
          </p>
          <PrimaryBtn onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={16} /> Upload Verification Document
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
};
