import React, { useState, useRef } from 'react';
import { 
  FileText, UploadCloud, Eye, Trash2, CheckCircle2, AlertCircle, 
  Download, X, FileCheck, RefreshCw, ExternalLink 
} from 'lucide-react';

export const DOCUMENT_CONFIG = {
  student_room: {
    categoryKey: 'student_room',
    categoryLabel: 'Student Accommodation / Student Room',
    badgeText: 'Student Rental Compliance',
    description: 'Accredited student housing and university residence document checklist.',
    slots: [
      {
        key: 'acceptance_letter',
        title: 'University Acceptance Letter / Proof of Registration',
        required: true,
        shortLabel: 'Acceptance Letter',
        description: 'Official letter from university, college, or TVET confirming enrollment or active registration.',
        acceptedHint: 'Official registrar/admissions letterhead PDF'
      },
      {
        key: 'bursary_nsfas',
        title: 'Bursary Confirmation / NSFAS Letter',
        required: true,
        shortLabel: 'NSFAS / Bursary Letter',
        description: 'Official NSFAS funding status letter, university financial aid statement, or sponsor bursary proof.',
        acceptedHint: 'Letterhead PDF showing sponsor details and allowance allocation'
      },
      {
        key: 'id_document',
        title: 'Certified South African ID / Passport',
        required: true,
        shortLabel: 'Certified ID / Passport',
        description: 'Certified copy of green South African ID book, Smart ID card (front & back), or valid passport.',
        acceptedHint: 'Certified stamp not older than 3 months'
      },
      {
        key: 'additional_doc',
        title: 'Additional Supporting Document (Optional)',
        required: false,
        shortLabel: 'Student Card / Voucher',
        description: 'Student card, course schedule, fee statement, or guarantor letter if applicable.',
        acceptedHint: 'Optional supplementary PDF document'
      }
    ]
  },
  standard_room: {
    categoryKey: 'standard_room',
    categoryLabel: 'Standard Room / Residential Property',
    badgeText: 'Resident Vetting & Affordability',
    description: 'Residential rental and room verification document checklist.',
    slots: [
      {
        key: 'bank_statement',
        title: 'Bank Statement (Latest 3 Months)',
        required: true,
        shortLabel: '3 Months Bank Statements',
        description: 'Official electronic stamped bank statement reflecting salary and income deposits for the last 90 days.',
        acceptedHint: 'Official e-stamped PDF from your banking app'
      },
      {
        key: 'id_document',
        title: 'Certified South African ID / Passport',
        required: true,
        shortLabel: 'Certified ID / Passport',
        description: 'Certified copy of RSA green ID book, Smart ID card (both sides), or valid passport with work permit.',
        acceptedHint: 'Clear certified copy in PDF format'
      },
      {
        key: 'proof_of_income',
        title: 'Proof of Income / Latest Payslip',
        required: true,
        shortLabel: 'Latest Payslip / Proof of Income',
        description: 'Most recent salary payslip (last 1-3 months) or official employer letter verifying employment status.',
        acceptedHint: 'PDF payslip or letter on company letterhead'
      },
      {
        key: 'additional_doc',
        title: 'Additional Supporting Document (Optional)',
        required: false,
        shortLabel: 'Reference / Proof of Address',
        description: 'Previous landlord reference letter, municipal utility account, or letter of recommendation.',
        acceptedHint: 'Optional supplementary PDF document'
      }
    ]
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (typeof bytes === 'string') return bytes;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Built-in PDF Preview Modal
 */
export const PdfPreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[120] p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0e131f] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-4xl h-[94dvh] sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold text-[11px] font-mono tracking-wider shrink-0">
              PDF
            </span>
            <div className="truncate">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">{doc.title || doc.fileName}</h3>
              <p className="text-[11px] text-white/50 truncate">
                {doc.fileName} {doc.fileSize ? `· ${doc.fileSize}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {doc.dataUrl && (
              <>
                <a
                  href={doc.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open Tab</span>
                </a>
                <a
                  href={doc.dataUrl}
                  download={doc.fileName || 'document.pdf'}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-500/30"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-[#070a0f] p-2 sm:p-3 overflow-hidden flex flex-col">
          {/* Mobile view quick action notice */}
          {doc.dataUrl && (
            <div className="sm:hidden flex items-center justify-between gap-2 p-2 bg-slate-900/90 border border-white/10 rounded-xl mb-2 text-xs">
              <span className="text-white/60 text-[11px] truncate">Mobile tap to expand:</span>
              <a
                href={doc.dataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 shadow-sm"
              >
                <ExternalLink size={11} />
                <span>Full Screen</span>
              </a>
            </div>
          )}

          {doc.dataUrl ? (
            <object
              data={doc.dataUrl}
              type="application/pdf"
              className="w-full flex-1 rounded-xl sm:rounded-2xl border border-white/5 bg-slate-900"
            >
              <iframe
                src={doc.dataUrl}
                className="w-full h-full rounded-xl sm:rounded-2xl border border-white/5"
                title={doc.title || 'PDF Preview'}
              >
                <div className="p-6 text-center text-white/60">
                  <p className="text-sm">Preview not supported on this device's browser.</p>
                  <a
                    href={doc.dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md"
                  >
                    Open in PDF Viewer
                  </a>
                </div>
              </iframe>
            </object>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/60 space-y-3">
              <FileText size={40} className="text-white/20" />
              <p className="font-semibold text-white text-sm">Attachment Ready</p>
              <p className="text-xs max-w-sm text-white/40">
                This document is scheduled for transmission with your application.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Document Slot Card
 */
const DocumentSlotItem = ({ 
  slot, 
  attachedDoc, 
  onUpload, 
  onRemove, 
  onPreview,
  onError 
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Reset file input so user can re-select same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = (file) => {
    // 1. Strict PDF validation
    const isPdfType = file.type === 'application/pdf';
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');

    if (!isPdfType && !isPdfExt) {
      if (onError) {
        onError(`"${file.name}" is not a PDF. Only official PDF documents (.pdf) are accepted for verification.`);
      }
      return;
    }

    // 2. Size limit: 15MB
    if (file.size > 15 * 1024 * 1024) {
      if (onError) {
        onError(`"${file.name}" exceeds the 15MB file size limit. Please upload a compressed PDF.`);
      }
      return;
    }

    // 3. Read file as Data URL
    const reader = new FileReader();
    reader.onload = () => {
      onUpload({
        slotKey: slot.key,
        title: slot.title,
        shortLabel: slot.shortLabel,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileType: 'application/pdf',
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.onerror = () => {
      if (onError) onError('Failed to read the selected PDF file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div 
      className={`rounded-2xl border transition-all p-4 ${
        attachedDoc 
          ? 'bg-white/[0.04] border-emerald-500/40 hover:border-emerald-500/60' 
          : isDragging
          ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Slot Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-white">
              {slot.title}
            </h4>
            {slot.required ? (
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                attachedDoc 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {attachedDoc ? 'Attached' : 'Required'}
              </span>
            ) : (
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                Optional
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            {slot.description}
          </p>
        </div>
      </div>

      {/* Slot Content: Attached vs Empty */}
      {attachedDoc ? (
        <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-xs">PDF</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {attachedDoc.fileName}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> Valid PDF
                </span>
                <span>•</span>
                <span>{attachedDoc.fileSize}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onPreview}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
              title="Preview attached PDF"
            >
              <Eye size={15} />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
              title="Replace file"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Replace</span>
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-all text-xs"
              title="Remove document"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/15 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <UploadCloud size={16} className="text-blue-400 shrink-0" />
            <span className="truncate">{slot.acceptedHint} (PDF up to 15MB)</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600/25 hover:bg-blue-600/35 active:scale-95 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <FileText size={14} />
            <span>Attach PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Main PDF Attachment Section Component
 */
export default function PdfAttachmentSection({
  category = 'standard_room',
  documents = {},
  onDocumentsChange,
  onError
}) {
  const [previewDoc, setPreviewDoc] = useState(null);
  const currentConfig = DOCUMENT_CONFIG[category] || DOCUMENT_CONFIG.standard_room;

  const requiredSlots = currentConfig.slots.filter(s => s.required);
  const totalRequired = requiredSlots.length;
  const attachedRequired = requiredSlots.filter(s => !!documents[s.key]).length;
  const allRequiredAttached = attachedRequired === totalRequired;

  const handleSlotUpload = (docData) => {
    onDocumentsChange({
      ...documents,
      [docData.slotKey]: docData
    });
  };

  const handleSlotRemove = (slotKey) => {
    const updated = { ...documents };
    delete updated[slotKey];
    onDocumentsChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-white/50 uppercase tracking-widest text-xs font-bold">
          <FileText size={15} className={category === 'student_room' ? 'text-blue-400' : 'text-emerald-400'} />
          <span>
            {category === 'student_room' 
              ? 'Required Student Verification Documents' 
              : 'Required Resident Verification Documents'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-bold tracking-wide flex items-center gap-1.5 ${
            allRequiredAttached 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-white/10 text-white/70 border border-white/10'
          }`}>
            {allRequiredAttached && <CheckCircle2 size={13} className="text-emerald-400" />}
            <span>{attachedRequired} of {totalRequired} Required Attached</span>
          </span>
        </div>
      </div>

      {/* Informative Guidance Banner */}
      <div className="glass rounded-2xl p-4 border border-white/5 flex items-start gap-3 text-xs text-white/60">
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <FileCheck size={16} />
        </div>
        <div className="space-y-1">
          <p className="text-white/80 font-medium">
            {category === 'student_room' 
              ? 'Student Room Verification Requirements' 
              : 'Room & Residential Verification Requirements'}
          </p>
          <p className="leading-relaxed">
            {category === 'student_room' 
              ? 'For student accommodation, our vetting desk only requires your official University Acceptance Letter, Bursary / NSFAS confirmation award, and Certified ID document. All submissions must be PDF files.'
              : 'For residential rooms and full properties, landlords require your latest 3 months bank statements, certified ID, and proof of income / payslip. All submissions must be PDF files.'}
          </p>
        </div>
      </div>

      {/* Document Slots */}
      <div className="space-y-3">
        {currentConfig.slots.map((slot) => (
          <DocumentSlotItem
            key={slot.key}
            slot={slot}
            attachedDoc={documents[slot.key]}
            onUpload={handleSlotUpload}
            onRemove={() => handleSlotRemove(slot.key)}
            onPreview={() => setPreviewDoc(documents[slot.key])}
            onError={onError}
          />
        ))}
      </div>

      {/* PDF Preview Modal */}
      {previewDoc && (
        <PdfPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
