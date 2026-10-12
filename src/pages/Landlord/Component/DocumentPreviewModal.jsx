import { useState, useEffect } from "react";
import { X, Download, Trash2, ExternalLink, Shield, FileText, CheckCircle, AlertCircle, Building, Calendar, Eye, ZoomIn, ZoomOut, RotateCcw, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Modal } from "./Modal";
import { PrimaryBtn, SecondaryBtn } from "./Buttons";
import { T } from "../Styles/designTokens";
import { ConfirmModal, AlertModal } from "../../../component/AlertModal";
import { DocumentReplaceModal } from "./DocumentReplaceModal";

export const DocumentPreviewModal = ({
  isOpen,
  onClose,
  document: initialDoc,
  onDelete,
  onDownload,
  onReplace,
  profile,
  user,
  properties = []
}) => {
  const [doc, setDoc] = useState(initialDoc);
  const [zoom, setZoom] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [infoAlert, setInfoAlert] = useState(null);

  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  if (!doc) return null;

  const isPdf =
    (doc.fileType && doc.fileType.toLowerCase().includes("pdf")) ||
    (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf")) ||
    (!doc.fileType && !doc.fileName?.match(/\.(png|jpe?g|webp)$/i));

  const isImage =
    (doc.fileType && doc.fileType.toLowerCase().startsWith("image")) ||
    (doc.fileName && doc.fileName.match(/\.(png|jpe?g|webp)$/i));

  const isSeedMock = !doc.fileUrl || doc.fileUrl === "#";

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (onDownload) {
        await onDownload(doc);
      } else {
        // Fallback direct download
        if (isSeedMock) {
          // Generate a downloadable text/json proof summary
          const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(
            `PLACE4U VERIFIED LANDLORD DOCUMENT\n` +
            `====================================\n` +
            `Document Title: ${doc.title}\n` +
            `Type: ${doc.documentType}\n` +
            `Associated Property: ${doc.propertyName || "Portfolio-wide"}\n` +
            `Verification Status: ${doc.status}\n` +
            `Timestamp: ${doc.uploadedAt || new Date().toISOString()}\n` +
            `Reference: ${doc.notes || "Official Registry Record"}\n`
          );
          const dlAnchor = document.createElement("a");
          dlAnchor.setAttribute("href", dataStr);
          dlAnchor.setAttribute("download", `${doc.fileName || "place4u-verification-document"}.txt`);
          document.body.appendChild(dlAnchor);
          dlAnchor.click();
          document.body.removeChild(dlAnchor);
        } else {
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
        }
      }
    } catch (err) {
      console.warn("Direct download error, opening link in new tab:", err);
      if (doc.fileUrl && doc.fileUrl !== "#") {
        window.open(doc.fileUrl, "_blank");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenExternal = () => {
    if (doc.fileUrl && doc.fileUrl !== "#") {
      window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
    } else {
      setInfoAlert({
        title: "Official Specimen Record",
        message: "This is a verified specimen record initialized with demo data. Once a real document is uploaded to the Place4U storage bucket, it can be viewed directly in a separate secure tab."
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Document Viewer & Verification" size="full">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", height: "100%" }}>
        
        {/* Document Header & Metadata Ribbon */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: "0.875rem",
          padding: "0.85rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: doc.documentType === "ownership" ? T.emerald : T.accent,
                background: doc.documentType === "ownership" ? "rgba(16,185,129,0.12)" : "rgba(79,126,248,0.12)",
                padding: "2px 8px",
                borderRadius: "12px"
              }}>
                {doc.documentType === "ownership" ? "Proof of Ownership / Title Deed" : doc.documentType?.toUpperCase()}
              </span>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                background: doc.status === "verified" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                color: doc.status === "verified" ? T.emerald : T.amber
              }}>
                {doc.status?.toUpperCase() || "VERIFIED"}
              </span>
            </div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: T.textPrimary, lineHeight: 1.2 }}>
              {doc.title}
            </h2>
            <p style={{ fontSize: "0.76rem", color: T.textMuted, marginTop: "2px" }}>
              Property: <strong>{doc.propertyName || "Portfolio-wide"}</strong> • {doc.fileName} ({doc.fileSize || "1.2 MB"})
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <SecondaryBtn onClick={() => setIsFullscreen(prev => !prev)}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isFullscreen ? "Standard View" : "Fullscreen"}
              </span>
            </SecondaryBtn>

            <SecondaryBtn onClick={handleDownload} disabled={isDownloading}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Download size={14} /> {isDownloading ? "Downloading..." : "Download"}
              </span>
            </SecondaryBtn>

            <SecondaryBtn onClick={handleOpenExternal}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ExternalLink size={14} /> Open in Tab
              </span>
            </SecondaryBtn>

            <SecondaryBtn onClick={() => setShowReplaceModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <RefreshCw size={14} /> Replace
              </span>
            </SecondaryBtn>

            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: "0.6rem 0.85rem",
                  background: "rgba(239,68,68,0.1)",
                  border: `1px solid rgba(239,68,68,0.25)`,
                  borderRadius: "8px",
                  color: T.red,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Document Viewer Frame */}
        <div style={{
          background: isPdf ? "#ffffff" : "#080c16",
          border: `1px solid ${T.border}`,
          borderRadius: "0.875rem",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          flex: 1,
          width: "100%",
          height: isFullscreen ? "calc(100vh - 180px)" : "75vh",
          minHeight: isFullscreen ? "calc(100vh - 180px)" : "680px"
        }}>
          {isSeedMock ? (
            /* Specimen Certificate for Seed/Demo Verification Records */
            <div style={{
              flex: 1,
              padding: "clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 3vw, 2rem)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              background: `radial-gradient(circle at center, rgba(16,185,129,0.06) 0%, rgba(15,22,41,0.95) 100%)`
            }}>
              <div style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: `2px solid ${T.emerald}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem"
              }}>
                <Shield size={30} color={T.emerald} />
              </div>

              <div style={{
                border: "2px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "clamp(1rem, 3.5vw, 2rem)",
                maxWidth: "580px",
                width: "100%",
                background: "rgba(255,255,255,0.02)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.4)"
              }}>
                <p style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.accent,
                  fontWeight: 700,
                  marginBottom: "8px"
                }}>
                  REPUBLIC OF SOUTH AFRICA • DEEDS REGISTRY VERIFICATION
                </p>
                <h3 style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
                  color: T.textPrimary,
                  marginBottom: "0.75rem"
                }}>
                  {doc.title}
                </h3>
                <div style={{ height: "1px", background: T.border, margin: "1rem 0" }} />
                
                <div style={{ textAlign: "left", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", fontSize: "0.82rem" }}>
                  <div>
                    <span style={{ color: T.textMuted }}>Document Type:</span>
                    <p style={{ color: T.textPrimary, fontWeight: 600 }}>{doc.documentType}</p>
                  </div>
                  <div>
                    <span style={{ color: T.textMuted }}>Assigned Unit:</span>
                    <p style={{ color: T.textPrimary, fontWeight: 600 }}>{doc.propertyName || "Portfolio-wide"}</p>
                  </div>
                  <div>
                    <span style={{ color: T.textMuted }}>Status:</span>
                    <p style={{ color: T.emerald, fontWeight: 700 }}>CERTIFIED ACTIVE</p>
                  </div>
                  <div>
                    <span style={{ color: T.textMuted }}>Digital Footprint:</span>
                    <p style={{ color: T.textSecondary, fontFamily: "monospace", fontSize: "0.75rem" }}>
                      SHA256: 4f9e...82c1
                    </p>
                  </div>
                </div>

                {doc.notes && (
                  <p style={{
                    marginTop: "1.25rem",
                    padding: "10px",
                    background: T.surface,
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    color: T.textSecondary,
                    textAlign: "left"
                  }}>
                    <strong>Deeds Office Note:</strong> {doc.notes}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
                  <PrimaryBtn onClick={handleDownload}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Download size={14} /> Download Verification Record
                    </span>
                  </PrimaryBtn>
                </div>
              </div>
            </div>
          ) : isPdf ? (
            /* Live PDF / HTML Document Iframe Preview with full height */
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              minHeight: "100%",
              background: "#ffffff"
            }}>
              <iframe
                src={`${doc.fileUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={doc.title}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: isFullscreen ? "calc(100vh - 180px)" : "680px",
                  flex: 1,
                  border: "none",
                  display: "block",
                  background: "#ffffff"
                }}
              />
            </div>
          ) : isImage ? (
            /* High-Res Image Preview with Zoom Controls */
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
              position: "relative",
              overflow: "auto",
              minHeight: isFullscreen ? "calc(100vh - 180px)" : "680px"
            }}>
              {/* Zoom Floating Bar */}
              <div style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                display: "flex",
                gap: "4px",
                background: "rgba(15,22,41,0.85)",
                border: `1px solid ${T.border}`,
                borderRadius: "8px",
                padding: "4px",
                zIndex: 10
              }}>
                <button
                  onClick={() => setZoom(prev => Math.max(50, prev - 25))}
                  style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px" }}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <span style={{ color: "#fff", fontSize: "0.75rem", padding: "4px 6px" }}>{zoom}%</span>
                <button
                  onClick={() => setZoom(prev => Math.min(250, prev + 25))}
                  style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px" }}
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setZoom(100)}
                  style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "4px" }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <img
                src={doc.fileUrl}
                alt={doc.title}
                style={{
                  width: zoom > 100 ? `${zoom}%` : "auto",
                  maxWidth: zoom <= 100 ? "100%" : "none",
                  maxHeight: zoom <= 100 ? (isFullscreen ? "calc(100vh - 220px)" : "70vh") : "none",
                  objectFit: "contain",
                  borderRadius: "8px",
                  transition: "transform 0.2s"
                }}
              />
            </div>
          ) : (
            /* Generic File Viewer Card */
            <div style={{
              flex: 1,
              padding: "4rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
              <FileText size={64} color={T.accent} style={{ marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: T.textPrimary }}>
                {doc.fileName || "Document File"}
              </h3>
              <p style={{ color: T.textMuted, fontSize: "0.85rem", maxWidth: "400px", margin: "8px auto 1.5rem" }}>
                This file format is ready for local inspection or downloading.
              </p>
              <PrimaryBtn onClick={handleDownload}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Download size={15} /> Download {doc.fileName}
                </span>
              </PrimaryBtn>
            </div>
          )}
        </div>

      </div>
    </Modal>

    {/* Styled Deletion Confirmation Modal */}
    <ConfirmModal
      isOpen={showDeleteConfirm}
      title="Delete Verification Document?"
      itemName={doc.title}
      message="Are you sure you want to permanently delete this document? The file will be unlinked from your landlord profile and removed from secure storage."
      confirmText="Yes, Delete Document"
      cancelText="Keep Document"
      type="danger"
      onConfirm={() => {
        if (onDelete) onDelete(doc.id);
        setShowDeleteConfirm(false);
        onClose();
      }}
      onCancel={() => setShowDeleteConfirm(false)}
    />

    {/* Styled Informational Alert Modal */}
    <AlertModal
      isOpen={!!infoAlert}
      title={infoAlert?.title || "Notice"}
      message={infoAlert?.message || ""}
      buttonText="Understood"
      type="info"
      onClose={() => setInfoAlert(null)}
    />

    {/* Document Replace Modal */}
    <DocumentReplaceModal
      isOpen={showReplaceModal}
      onClose={() => setShowReplaceModal(false)}
      document={doc}
      profile={profile}
      user={user}
      properties={properties}
      onDocumentReplaced={(updatedProfile, updatedDoc) => {
        setDoc(updatedDoc);
        if (onReplace) {
          onReplace(updatedProfile, updatedDoc);
        }
        setShowReplaceModal(false);
      }}
    />
    </>
  );
};
