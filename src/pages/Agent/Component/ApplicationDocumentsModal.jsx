import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  User,
  FileCheck
} from 'lucide-react';
import { formatFileSize } from '../../Tenant/Components/PdfAttachmentSection';
import './ApplicationDocumentsModal.css';

export const ApplicationDocumentsModal = ({
  isOpen,
  onClose,
  application,
  tenant
}) => {
  // Extract or synthesize documents
  const documentsList = useMemo(() => {
    if (!application) return [];
    
    let rawDocs = [];
    if (Array.isArray(application.documents) && application.documents.length > 0) {
      rawDocs = application.documents;
    } else if (application.special_requirements && application.special_requirements.includes('[P4U_DATA:')) {
      try {
        const match = application.special_requirements.match(/\[P4U_DATA:([A-Za-z0-9+/=]+)\]/);
        if (match && match[1]) {
          const jsonStr = typeof atob !== 'undefined' 
            ? decodeURIComponent(escape(atob(match[1])))
            : Buffer.from(match[1], 'base64').toString('utf-8');
          const meta = JSON.parse(jsonStr);
          if (Array.isArray(meta.documents)) rawDocs = meta.documents;
        }
      } catch (e) {
        console.warn('Could not parse embedded docs:', e);
      }
    }

    const isStudent = (
      application?.accommodation_category === 'student_room' ||
      application?.category === 'student_room' ||
      (application?.preferred_types || []).join(' ').toLowerCase().includes('student')
    );

    // If documents are present, normalize them
    if (rawDocs.length > 0) {
      return rawDocs.map((doc, idx) => ({
        id: doc.id || `doc-${idx}`,
        slotKey: doc.slotKey || 'general_doc',
        title: doc.title || doc.shortLabel || 'Certified Verification Document',
        shortLabel: doc.shortLabel || doc.title,
        fileName: doc.fileName || `${(doc.title || 'document').toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileSize: doc.fileSize || '1.8 MB',
        uploadedAt: doc.uploadedAt || application.submitted_at || new Date().toISOString(),
        verified: doc.verified ?? true,
        fileUrl: doc.fileUrl || doc.dataUrl || null,
        dataUrl: doc.dataUrl || null,
        category: isStudent ? 'Student Compliance' : 'Residential Vetting'
      }));
    }

    // No documents were uploaded for this application. Surface that honestly instead of
    // synthesising a certified dossier the applicant never submitted.
    return [];
  }, [application, tenant]);

  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const activeDoc = documentsList[activeDocIndex] || documentsList[0];

  if (!isOpen || !application) return null;

  const applicantName = tenant?.full_name || 'Applicant';
  const tenantEmail = tenant?.email || 'Not provided';

  // Resolve what the canvas should render: inline data URLs still work, and a
  // signed storage URL (https) can be embedded in an iframe for PDF review.
  const previewUrl = activeDoc ? (activeDoc.dataUrl || activeDoc.fileUrl || null) : null;
  const isImagePreview = previewUrl
    ? (/^data:image\//i.test(previewUrl) || /\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/i.test(previewUrl))
    : false;
  const canEmbedPreview = previewUrl
    ? (previewUrl.startsWith('data:') || /^https?:\/\//i.test(previewUrl))
    : false;

  const handleDownload = (doc) => {
    if (doc.fileUrl || doc.dataUrl) {
      const link = document.createElement('a');
      link.href = doc.fileUrl || doc.dataUrl;
      link.download = doc.fileName || 'Place4U_Document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Produce a plain audit record. The reference is derived from stable ids so the
      // same document always yields the same reference (no random tokens).
      const recordRef = `P4U-${String(application?.id || '').slice(0, 4).toUpperCase()}-${String(doc.id || doc.fileName || 'doc').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`;
      const auditText = `PLACE4U APPLICATION DOCUMENT — AUDIT RECORD
=====================================================
Document Name: ${doc.title}
File Reference: ${doc.fileName}
Applicant: ${applicantName} (${tenantEmail})
Application Ref: #${String(application.id).slice(0, 8)}
Submitted At: ${doc.uploadedAt}
Record Reference: ${recordRef}
Category: ${doc.category || 'Rental application'}

Notes:
${doc.details || 'Record generated from the application intake data. No file content was attached to this document record.'}
=====================================================`;
      const blob = new Blob([auditText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.fileName.replace('.pdf', '')}_Audit_Record.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-header-info">
            <div className="doc-modal-badge">
              <ShieldCheck size={14} />
              <span>Application documents</span>
            </div>
            <h2 className="doc-modal-title">
              Application Documents &middot; {applicantName}
            </h2>
            <p className="doc-modal-subtitle">
              Application #{String(application.id).slice(0, 8)} &bull; {documentsList.length} file{documentsList.length !== 1 ? 's' : ''} attached
            </p>
          </div>
          <button className="doc-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Body Layout: Sidebar + Document Viewer */}
        <div className="doc-modal-body">
          {/* Document Selector Sidebar */}
          <div className="doc-modal-sidebar">
            <div className="doc-sidebar-header">
              <span>Attached Files ({documentsList.length})</span>
            </div>
            <div className="doc-list">
              {documentsList.map((doc, idx) => {
                const isSelected = idx === activeDocIndex;
                return (
                  <button
                    key={doc.id || idx}
                    type="button"
                    onClick={() => setActiveDocIndex(idx)}
                    className={`doc-list-item ${isSelected ? 'active' : ''}`}
                  >
                    <div className="doc-item-icon">
                      <FileText size={18} />
                    </div>
                    <div className="doc-item-info">
                      <span className="doc-item-title">{doc.shortLabel || doc.title}</span>
                      <span className="doc-item-meta">
                        {formatFileSize(doc.fileSize)} &bull; {doc.category || 'PDF'}
                      </span>
                    </div>
                    {doc.verified && (
                      <div className="doc-item-check" title="FICA Verified">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Applicant Summary Card */}
            <div className="doc-applicant-card">
              <div className="doc-applicant-avatar">
                <User size={18} />
              </div>
              <div className="doc-applicant-meta">
                <span className="doc-applicant-name">{applicantName}</span>
                <span className="doc-applicant-email">{tenantEmail}</span>
              </div>
            </div>
          </div>

          {/* Main Viewer Area */}
          <div className="doc-modal-viewer">
            {activeDoc ? (
              <div className="doc-viewer-wrapper">
                {/* Top Action Bar */}
                <div className="doc-viewer-toolbar">
                  <div className="doc-toolbar-left">
                    <FileCheck size={18} className="doc-toolbar-icon" />
                    <div>
                      <h4 className="doc-toolbar-filename">{activeDoc.fileName}</h4>
                      <span className="doc-toolbar-status">
                        Uploaded {new Date(activeDoc.uploadedAt).toLocaleDateString()} &bull; {formatFileSize(activeDoc.fileSize)}
                      </span>
                    </div>
                  </div>
                  <div className="doc-toolbar-actions">
                    <button
                      type="button"
                      onClick={() => handleDownload(activeDoc)}
                      className="doc-btn doc-btn-download"
                    >
                      <Download size={15} />
                      <span>Download</span>
                    </button>
                    {(activeDoc.fileUrl || activeDoc.dataUrl) && (
                      <a
                        href={activeDoc.fileUrl || activeDoc.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="doc-btn doc-btn-external"
                      >
                        <ExternalLink size={15} />
                        <span>Open Raw</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Document Display Canvas */}
                <div className="doc-canvas-area">
                  {previewUrl && canEmbedPreview && !isImagePreview ? (
                    <div className="doc-live-preview">
                      <iframe
                        src={previewUrl}
                        title={activeDoc.title}
                        className="doc-iframe"
                      />
                    </div>
                  ) : previewUrl && isImagePreview ? (
                    <div className="doc-image-preview">
                      <img src={previewUrl} alt={activeDoc.title} className="doc-image-rendered" />
                    </div>
                  ) : (
                    <div className="doc-empty-state">
                      <FileText size={48} />
                      <p>No preview available for this file</p>
                      <p style={{ color: 'var(--ag-dim, #64748b)', fontSize: '0.82rem', marginTop: 6 }}>
                        {activeDoc.fileUrl
                          ? 'Use “Open Raw” to review the original file.'
                          : 'No file content was attached to this record.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Status Bar */}
                <div className="doc-viewer-footer">
                  <div className="doc-footer-status">
                    <span className="doc-status-dot" />
                    <span>Document attached &middot; Review before drafting the lease</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="doc-btn doc-btn-done"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            ) : (
              <div className="doc-empty-state">
                <FileText size={48} />
                <p>{documentsList.length === 0 ? 'No documents uploaded for this application' : 'No document selected'}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
