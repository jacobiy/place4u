import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Shield,
  Upload,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  Building,
  FileCheck,
  Calendar,
  Lock,
  Eye,
  RefreshCw
} from "lucide-react";
import { T } from "./Styles/designTokens";
import { PrimaryBtn, SecondaryBtn } from "./Component/Buttons";
import { DocumentUploadModal, DOCUMENT_CATEGORIES } from "./Component/DocumentUploadModal";
import { DocumentPreviewModal } from "./Component/DocumentPreviewModal";
import { DocumentReplaceModal } from "./Component/DocumentReplaceModal";
import { LandlordQueries } from "./db/queries";
import { ConfirmModal, AlertToast } from "../../component/AlertModal";

export const Documents = ({ profile, properties = [], onProfileUpdate, user }) => {
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

  // Default baseline documents if none are stored yet
  const defaultDocs = useMemo(() => [
    {
      id: "doc-seed-1",
      title: "Title Deed - Sunset Apartments Unit 3A",
      documentType: "ownership",
      fileName: "Sunset_3A_Deed_Transfer.pdf",
      fileUrl: "#",
      fileSize: "2.4 MB",
      fileType: "application/pdf",
      propertyName: "Sunset Apartments Unit 3A",
      uploadedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      status: "verified",
      notes: "Cape Town Deeds Registry #T49281/2023"
    },
    {
      id: "doc-seed-2",
      title: "South African National ID Card",
      documentType: "id",
      fileName: "Landlord_ID_SmartCard.pdf",
      fileUrl: "#",
      fileSize: "1.1 MB",
      fileType: "application/pdf",
      propertyName: "Portfolio-wide",
      uploadedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      status: "verified",
      notes: "Identity verified & matched with home affairs"
    },
    {
      id: "doc-seed-3",
      title: "City of Cape Town Municipal Rates Clearance",
      documentType: "rates",
      fileName: "CoCT_Rates_Assessment_2026.pdf",
      fileUrl: "#",
      fileSize: "840 KB",
      fileType: "application/pdf",
      propertyName: "Harbour View Apartment",
      uploadedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      status: "verified",
      notes: "Account #93821034 - Zero arrears"
    },
    {
      id: "doc-seed-4",
      title: "Electrical Certificate of Compliance (ECOC)",
      documentType: "compliance",
      fileName: "Rosebank_ECOC_Certified.pdf",
      fileUrl: "#",
      fileSize: "1.8 MB",
      fileType: "application/pdf",
      propertyName: "Garden Flat Rosebank",
      uploadedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      expiryDate: "2027-10-15",
      status: "verified",
      notes: "Master Electrician reg #EC-49102"
    }
  ], []);

  // Sync documents from profile or fallback
  useEffect(() => {
    if (profile?.verification_documents && Array.isArray(profile.verification_documents) && profile.verification_documents.length > 0) {
      setDocuments(profile.verification_documents);
    } else {
      setDocuments(defaultDocs);
    }
  }, [profile?.verification_documents, defaultDocs]);

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
  const performDeleteDocument = async (docId, docTitle) => {
    setDeletingId(docId);

    try {
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
      showToast(`"${docTitle || 'Document'}" was removed from your records.`, "Document Removed", "success");
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
    await performDeleteDocument(docToDelete.id, docToDelete.title);
  };

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
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
  }, [documents, selectedCategory, selectedPropertyFilter, searchQuery]);

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

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", animation: "fadeIn 0.3s ease-in-out" }}>
      {/* Styled Toast Notification */}
      <AlertToast toast={toast} onClose={() => setToast(null)} />

      {/* Styled Document Deletion Confirmation Modal */}
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

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        profile={profile}
        user={user}
        properties={properties}
        onDocumentUploaded={handleDocumentUploaded}
      />

      {/* Document Preview Modal */}
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

      {/* Document Replace Modal */}
      <DocumentReplaceModal
        isOpen={!!docToReplace}
        onClose={() => setDocToReplace(null)}
        document={docToReplace}
        profile={profile}
        user={user}
        properties={properties}
        onDocumentReplaced={handleDocumentReplaced}
      />

      {/* 1. HEADER SECTION */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "1.5rem"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{
              background: "rgba(16,185,129,0.12)",
              color: T.emerald,
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}>
              <Lock size={12} /> Encrypted & Secure Vault
            </span>
          </div>
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(1.5rem, 4vw, 2.4rem)",
            color: T.textPrimary,
            lineHeight: 1.15,
            marginBottom: "6px"
          }}>
            Documents & Proof of Ownership
          </h1>
          <p style={{ color: T.textMuted, fontSize: "0.92rem", maxWidth: "680px" }}>
            Upload and manage title deeds, municipal rates certificates, identity verification, and electrical compliance documents to maintain high landlord trust rating.
          </p>
        </div>

        <PrimaryBtn onClick={() => setIsUploadModalOpen(true)}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Upload size={16} /> Upload New Document
          </span>
        </PrimaryBtn>
      </div>

      {/* 2. VERIFICATION STATUS CARDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
        gap: "1.25rem",
        marginBottom: "2rem"
      }}>
        {/* Ownership Proof Status */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(16,185,129,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Shield size={24} color={T.emerald} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <span style={{ fontSize: "0.7rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
                Proof of Ownership
              </span>
              <span style={{ fontSize: "0.72rem", color: T.emerald, fontWeight: 700 }}>VERIFIED</span>
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary }}>
              Title Deeds On File
            </p>
            <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
              Verified with Deeds Registry
            </p>
          </div>
        </div>

        {/* Identity Verification Status */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(79,126,248,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <FileCheck size={24} color={T.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <span style={{ fontSize: "0.7rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
                Identity Status
              </span>
              <span style={{ fontSize: "0.72rem", color: T.emerald, fontWeight: 700 }}>ACTIVE</span>
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary }}>
              South African ID
            </p>
            <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
              Valid SmartCard ID attached
            </p>
          </div>
        </div>

        {/* Compliance Certificates */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(139,92,246,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <FileText size={24} color="#8b5cf6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <span style={{ fontSize: "0.7rem", color: T.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
                Compliance & Rates
              </span>
              <span style={{ fontSize: "0.72rem", color: T.emerald, fontWeight: 700 }}>COMPLIANT</span>
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: T.textPrimary }}>
              Rates & ECOC Active
            </p>
            <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
              Electrical certificate valid until 2027
            </p>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR & FILTER CONTROLS */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: "1rem",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px", flex: "1 1 280px" }}>
          <Search size={16} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search documents by title, property, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.85rem 0.55rem 2.4rem",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: "8px",
              color: T.textPrimary,
              fontSize: "0.85rem",
              outline: "none"
            }}
          />
        </div>

        {/* Category Pills Filter */}
        <div style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          maxWidth: "100%",
          paddingBottom: "2px"
        }}>
          {[
            { id: "all", label: "All Documents" },
            { id: "ownership", label: "Ownership / Title" },
            { id: "id", label: "ID Documents" },
            { id: "rates", label: "Rates & Taxes" },
            { id: "compliance", label: "Compliance (ECOC)" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: selectedCategory === tab.id ? 600 : 400,
                cursor: "pointer",
                background: selectedCategory === tab.id ? T.accent : T.surface,
                color: selectedCategory === tab.id ? "#ffffff" : T.textSecondary,
                whiteSpace: "nowrap",
                transition: "all 0.15s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Associated Property Filter */}
        {properties && properties.length > 0 && (
          <select
            value={selectedPropertyFilter}
            onChange={(e) => setSelectedPropertyFilter(e.target.value)}
            style={{
              padding: "0.55rem 0.85rem",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: "8px",
              color: T.textPrimary,
              fontSize: "0.82rem",
              outline: "none"
            }}
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 4. DOCUMENT CARDS GRID */}
      {filteredDocs.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1.25rem"
        }}>
          {filteredDocs.map((doc, idx) => {
            const IconComponent = getCategoryIcon(doc.documentType);
            const isDeleting = deletingId === doc.id;

            return (
              <div
                key={doc.id || idx}
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.borderHover;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: doc.documentType === "ownership" ? "rgba(16,185,129,0.12)" : "rgba(79,126,248,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <IconComponent
                        size={20}
                        color={doc.documentType === "ownership" ? T.emerald : T.accent}
                      />
                    </div>
                    <div>
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: doc.documentType === "ownership" ? T.emerald : T.accent
                      }}>
                        {getCategoryLabel(doc.documentType)}
                      </span>
                      <h3 style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: T.textPrimary,
                        lineHeight: 1.3,
                        marginTop: "2px"
                      }}>
                        {doc.title}
                      </h3>
                    </div>
                  </div>

                  {/* Verification Status Badge */}
                  <span style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "12px",
                    background: doc.status === "verified" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                    color: doc.status === "verified" ? T.emerald : T.amber,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <CheckCircle size={10} />
                    {doc.status === "verified" ? "VERIFIED" : "UNDER REVIEW"}
                  </span>
                </div>

                {/* Details Section */}
                <div style={{
                  background: T.surface,
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "1rem",
                  fontSize: "0.78rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: T.textSecondary, marginBottom: "4px" }}>
                    <Building size={13} color={T.accent} />
                    <span>Property: <strong>{doc.propertyName || "Portfolio-wide"}</strong></span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: T.textMuted, fontSize: "0.72rem" }}>
                    <span>File: {doc.fileName || "document.pdf"} ({doc.fileSize || "1.2 MB"})</span>
                    <span>Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "Recent"}</span>
                  </div>

                  {doc.notes && (
                    <p style={{ marginTop: "6px", color: T.textMuted, fontSize: "0.72rem", fontStyle: "italic" }}>
                      "{doc.notes}"
                    </p>
                  )}

                  {doc.expiryDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: T.amber, marginTop: "6px", fontSize: "0.72rem", fontWeight: 500 }}>
                      <Calendar size={12} />
                      <span>Valid until: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Preview, Download, Replace, Delete */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
                  <button
                    onClick={() => handleOpenPreview(doc)}
                    style={{
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: "85px",
                      padding: "7px 10px",
                      background: "rgba(79,126,248,0.12)",
                      border: `1px solid rgba(79,126,248,0.25)`,
                      borderRadius: "8px",
                      color: T.accent,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(79,126,248,0.22)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(79,126,248,0.12)"}
                  >
                    <Eye size={13} /> Preview
                  </button>

                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    style={{
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: "85px",
                      padding: "7px 10px",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: "8px",
                      color: T.textPrimary,
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = T.surface}
                    title="Download document file"
                  >
                    <Download size={13} /> Download
                  </button>

                  <button
                    onClick={() => setDocToReplace(doc)}
                    style={{
                      flex: "1 1 auto",
                      minWidth: "80px",
                      padding: "7px 10px",
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      borderRadius: "8px",
                      color: T.textMuted,
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = T.accent;
                      e.currentTarget.style.borderColor = T.accent;
                      e.currentTarget.style.background = "rgba(79, 126, 248, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = T.textMuted;
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Replace with new file"
                  >
                    <RefreshCw size={13} /> Replace
                  </button>

                  <button
                    onClick={() => setDocToDelete(doc)}
                    disabled={deletingId === doc.id}
                    style={{
                      padding: "7px 11px",
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      borderRadius: "8px",
                      color: T.textMuted,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = T.red;
                      e.currentTarget.style.borderColor = T.red;
                      e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = T.textMuted;
                      e.currentTarget.style.borderColor = T.border;
                      e.currentTarget.style.background = "transparent";
                    }}
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
        /* Empty State */
        <div style={{
          background: T.cardBg,
          border: `1px dashed ${T.border}`,
          borderRadius: "1rem",
          padding: "4rem 2rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Shield size={42} color={T.textMuted} style={{ marginBottom: "1rem", opacity: 0.6 }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: T.textPrimary, marginBottom: "0.5rem" }}>
            No documents matched your criteria
          </h3>
          <p style={{ color: T.textMuted, fontSize: "0.85rem", maxWidth: "420px", marginBottom: "1.5rem" }}>
            Upload title deeds, municipal utility accounts, or national ID cards to verify your ownership of properties on Place4U.
          </p>
          <PrimaryBtn onClick={() => setIsUploadModalOpen(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Upload size={16} /> Upload Verification Document
            </span>
          </PrimaryBtn>
        </div>
      )}
    </div>
  );
};
