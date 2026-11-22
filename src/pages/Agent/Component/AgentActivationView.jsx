import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Eye,
  X,
  Upload,
  ExternalLink,
  Building2,
  UserCheck
} from 'lucide-react'
import { AgentQueries } from '../db/queries'
import { resolveDocumentUrls, AGENT_DOCUMENTS_BUCKET } from '../../../utils/documentUrls'

const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'Free State',
  'North West',
  'Northern Cape'
]

export default function AgentActivationView({
  userRow,
  profile,
  onRefresh,
  autoOpenModal = false,
  onAutoOpenHandled = () => {}
}) {
  const formRef = useRef(null)

  const verificationStatus = profile?.verification_status || (profile?.submitted_at ? 'pending_review' : 'not_applied')
  const isPending = verificationStatus === 'pending_review' || verificationStatus === 'interview_scheduled'
  const isRejected = verificationStatus === 'rejected'

  const [isEditing, setIsEditing] = useState(!isPending)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || userRow?.full_name || '',
    email: userRow?.email || '',
    phone: profile?.phone || userRow?.phone || '',
    id_number: profile?.id_number || userRow?.id_number || '',
    address: profile?.address || '',
    city: profile?.city || 'Johannesburg',
    province: profile?.province || 'Gauteng',
    postal_code: profile?.postal_code || '',
    agency_name: profile?.agency_name || '',
    experience_years: profile?.experience_years ?? 1,
    tax_number: profile?.tax_number || '',
    id_document_url: profile?.id_document_url || '',
    proof_of_residence_url: profile?.proof_of_residence_url || '',
    fidelity_fund_cert_url: profile?.fidelity_fund_cert_url || '',
    preferred_contact_method: profile?.preferred_contact_method || 'whatsapp',
    interview_time_slot: profile?.interview_time_slot || 'morning'
  })

  const [idDocumentFile, setIdDocumentFile] = useState(null)
  const [proofOfResidenceFile, setProofOfResidenceFile] = useState(null)
  const [fidelityFundCertFile, setFidelityFundCertFile] = useState(null)

  const [docPreviews, setDocPreviews] = useState({ id: null, por: null, ffc: null })
  const [previewModal, setPreviewModal] = useState(null) // { title, url }

  const isPdfUrl = (url) => typeof url === 'string' && /\.pdf(\?|#|$)/i.test(url)

  useEffect(() => {
    if (autoOpenModal) {
      setIsEditing(true)
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      onAutoOpenHandled()
    }
  }, [autoOpenModal, onAutoOpenHandled])

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        full_name: profile.full_name || prev.full_name,
        phone: profile.phone || prev.phone,
        id_number: profile.id_number || prev.id_number,
        address: profile.address || prev.address,
        city: profile.city || prev.city,
        province: profile.province || prev.province,
        postal_code: profile.postal_code || prev.postal_code,
        agency_name: profile.agency_name || prev.agency_name,
        experience_years: profile.experience_years ?? prev.experience_years,
        tax_number: profile.tax_number || prev.tax_number,
        id_document_url: profile.id_document_url || prev.id_document_url,
        proof_of_residence_url: profile.proof_of_residence_url || prev.proof_of_residence_url,
        fidelity_fund_cert_url: profile.fidelity_fund_cert_url || prev.fidelity_fund_cert_url,
        preferred_contact_method: profile.preferred_contact_method || prev.preferred_contact_method,
        interview_time_slot: profile.interview_time_slot || prev.interview_time_slot
      }))
    }
  }, [profile])

  useEffect(() => {
    let active = true
    ;(async () => {
      const resolved = await resolveDocumentUrls(
        {
          id: profile?.id_document_url || null,
          por: profile?.proof_of_residence_url || null,
          ffc: profile?.fidelity_fund_cert_url || null
        },
        { bucket: AGENT_DOCUMENTS_BUCKET }
      )
      if (active) {
        setDocPreviews((prev) => ({
          id: idDocumentFile ? prev.id : (resolved.id || null),
          por: proofOfResidenceFile ? prev.por : (resolved.por || null),
          ffc: fidelityFundCertFile ? prev.ffc : (resolved.ffc || null)
        }))
      }
    })()
    return () => {
      active = false
    }
  }, [
    profile?.id_document_url,
    profile?.proof_of_residence_url,
    profile?.fidelity_fund_cert_url,
    idDocumentFile,
    proofOfResidenceFile,
    fidelityFundCertFile
  ])

  const handleFileSelect = (field, file) => {
    if (!file) return
    setError('')
    const objectUrl = URL.createObjectURL(file)

    if (field === 'id_document') {
      setIdDocumentFile(file)
      setDocPreviews((prev) => ({ ...prev, id: objectUrl }))
    } else if (field === 'proof_of_residence') {
      setProofOfResidenceFile(file)
      setDocPreviews((prev) => ({ ...prev, por: objectUrl }))
    } else if (field === 'fidelity_fund_cert') {
      setFidelityFundCertFile(file)
      setDocPreviews((prev) => ({ ...prev, ffc: objectUrl }))
    }
  }

  const handleFileRemove = (field) => {
    if (field === 'id_document') {
      setIdDocumentFile(null)
      setDocPreviews((prev) => ({ ...prev, id: null }))
      setFormData((prev) => ({ ...prev, id_document_url: '' }))
    } else if (field === 'proof_of_residence') {
      setProofOfResidenceFile(null)
      setDocPreviews((prev) => ({ ...prev, por: null }))
      setFormData((prev) => ({ ...prev, proof_of_residence_url: '' }))
    } else if (field === 'fidelity_fund_cert') {
      setFidelityFundCertFile(null)
      setDocPreviews((prev) => ({ ...prev, ffc: null }))
      setFormData((prev) => ({ ...prev, fidelity_fund_cert_url: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const hasId = Boolean(idDocumentFile || formData.id_document_url)
    const hasPor = Boolean(proofOfResidenceFile || formData.proof_of_residence_url)

    if (!hasId || !hasPor) {
      setError('Both your identity document and proof of residential address are mandatory under FICA.')
      return
    }

    if (!formData.full_name?.trim() || !formData.id_number?.trim() || !formData.phone?.trim()) {
      setError('Please provide your full legal name, ID or passport number, and contact phone.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const userId = userRow?.id || profile?.user_id
      const res = await AgentQueries.submitVerificationApplication(userId, {
        ...formData,
        id_document_file: idDocumentFile,
        proof_of_residence_file: proofOfResidenceFile,
        fidelity_fund_cert_file: fidelityFundCertFile,
        id_document_url: idDocumentFile ? null : (formData.id_document_url || null),
        proof_of_residence_url: proofOfResidenceFile ? null : (formData.proof_of_residence_url || null),
        fidelity_fund_cert_url: fidelityFundCertFile ? null : (formData.fidelity_fund_cert_url || null)
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to submit application.')
      }

      setToast('Verification documents submitted. Place4U compliance is reviewing your profile.')
      setIsEditing(false)
      if (onRefresh) await onRefresh()
    } catch (err) {
      setError(err?.message || 'Submission error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasIdDoc = Boolean(idDocumentFile || formData.id_document_url || docPreviews.id)
  const hasPorDoc = Boolean(proofOfResidenceFile || formData.proof_of_residence_url || docPreviews.por)
  const hasFfcDoc = Boolean(fidelityFundCertFile || formData.fidelity_fund_cert_url || docPreviews.ffc)
  const docCount = (hasIdDoc ? 1 : 0) + (hasPorDoc ? 1 : 0) + (hasFfcDoc ? 1 : 0)

  return (
    <div className="space-y-6" ref={formRef}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Document Inspector Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setPreviewModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <span className="font-semibold text-sm text-slate-900">{previewModal.title}</span>
              <div className="flex items-center gap-3">
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={13} /> Open full window
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto bg-slate-50 flex items-center justify-center">
              {isPdfUrl(previewModal.url) ? (
                <iframe
                  title={previewModal.title}
                  src={previewModal.url}
                  className="w-full h-[70vh] border-0 rounded-lg bg-white shadow-xs"
                />
              ) : (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xs"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Banner — matching Admin Dashboard Header */}
      <div className="bg-gradient-to-r from-[#0F1E35] via-[#132847] to-[#1A365D] rounded-2xl p-6 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isPending
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : isRejected
                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isPending ? 'bg-blue-400 animate-pulse' : isRejected ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                }`} />
                {isPending ? 'Application Under Review' : isRejected ? 'Verification Action Required' : 'Accreditation Pending'}
              </span>
              <span className="text-slate-400 text-xs">Place4U Practitioner Verification Desk</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Agent Onboarding & FICA Compliance</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Under the Property Practitioners Act 22 of 2019 and FICA, Place4U verifies identity and practice credentials to activate application routing, matching tools, and commission disbursements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-colors"
            >
              <RefreshCw size={13} />
              Sync Status
            </button>

            <p className="inline-flex items-center gap-1.5 text-xs text-slate-300">
              <Mail size={13} className="text-slate-400" />
              Need assistance? Email:
              <a
                href="mailto:support@place4u.xyz"
                className="font-semibold text-white hover:text-blue-300 transition-colors"
              >
                support@place4u.xyz
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Metrics KPI Grid — matching Admin Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Verification Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Verification State</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isPending ? 'bg-blue-50 text-blue-600' : isRejected ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {isPending ? <Clock size={16} /> : isRejected ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {isPending ? 'Under Review' : isRejected ? 'Update Required' : 'Unverified'}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            {isPending ? 'Compliance audit in progress' : isRejected ? 'Please correct documents' : 'Submit FICA documents'}
          </div>
        </div>

        {/* Metric 2: FICA Documents on File */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">FICA Documents</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {docCount} <span className="text-xs font-normal text-slate-400">/ 2 required</span>
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            {hasIdDoc && hasPorDoc ? 'Required files uploaded' : 'ID & proof of address needed'}
          </div>
        </div>

        {/* Metric 3: Territory / Location */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Service Territory</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <MapPin size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 truncate">
            {profile?.city || formData.city || 'Johannesburg'}
          </p>
          <div className="text-[11px] text-slate-500 mt-1">
            {profile?.province || formData.province || 'Gauteng'}
          </div>
        </div>

        {/* Metric 4: Review Turnaround SLA */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Review Window</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">1 – 2 Days</p>
          <div className="text-[11px] text-slate-500 mt-1">
            Standard compliance review
          </div>
        </div>
      </div>

      {/* Rejection Alert */}
      {isRejected && !isEditing && (
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900">Verification Returned for Revision</h4>
              <p className="text-xs text-red-700 mt-0.5">
                {profile?.rejection_reason || 'Submitted documentation did not satisfy regulatory FICA standards. Please update your details and re-attach valid documents.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
          >
            Update & Resubmit
          </button>
        </div>
      )}

      {/* Main Content Workspace — matching Admin's Panel Card */}
      {isPending && !isEditing ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Manifest Column */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-900 font-bold text-base">Application Processing Status</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                    Review In Progress
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Your credentials and FICA documentation are under review by Place4U compliance
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                >
                  <RefreshCw size={12} /> Sync
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                >
                  Edit Details
                </button>
              </div>
            </div>

            {/* Review Call Notice Banner */}
            <div className="p-5 bg-blue-50/50 border-b border-blue-100/60 flex items-start gap-3">
              <Clock size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-semibold text-blue-900 block">Compliance Interview Scheduling</strong>
                <p className="text-xs text-blue-800/90 mt-0.5 leading-relaxed">
                  A compliance officer will call you at <span className="font-semibold">{profile?.phone || formData.phone}</span> during the {profile?.interview_time_slot || formData.interview_time_slot} window ({profile?.preferred_contact_method || formData.preferred_contact_method}) to complete your 15-minute onboarding interview.
                </p>
              </div>
            </div>

            {/* Submitted Data Table */}
            <div className="p-5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Submitted Practitioner Manifest</h4>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-medium">Full Legal Name</span>
                  <span className="text-slate-900 font-semibold">{profile?.full_name || formData.full_name || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-medium">ID or Passport Number</span>
                  <span className="font-mono text-slate-900 font-semibold">{profile?.id_number || formData.id_number || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-medium">Agency / Practice</span>
                  <span className="text-slate-900 font-semibold">{profile?.agency_name || formData.agency_name || 'Independent Practitioner'}</span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-medium">Contact Phone</span>
                  <span className="font-mono text-slate-900 font-semibold">{profile?.phone || formData.phone || '—'}</span>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500 font-medium">Operating City & Province</span>
                  <span className="text-slate-900 font-semibold">{profile?.city || formData.city}, {profile?.province || formData.province}</span>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Audited Documents on File</h4>
                <div className="space-y-2">
                  {docPreviews.id && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText size={15} className="text-blue-600" />
                        <span className="font-semibold text-slate-900">National ID or Passport</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ title: 'Identity Document', url: docPreviews.id })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={12} /> Inspect File
                      </button>
                    </div>
                  )}

                  {docPreviews.por && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText size={15} className="text-blue-600" />
                        <span className="font-semibold text-slate-900">Proof of Residential Address</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ title: 'Proof of Address', url: docPreviews.por })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={12} /> Inspect File
                      </button>
                    </div>
                  )}

                  {docPreviews.ffc && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText size={15} className="text-blue-600" />
                        <span className="font-semibold text-slate-900">Fidelity Fund Certificate (FFC)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ title: 'Fidelity Fund Certificate', url: docPreviews.ffc })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={12} /> Inspect File
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Side Info Rail — matching Admin's Sidebar Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Onboarding Procedure</h3>
              <ol className="space-y-3 text-xs text-slate-600 list-decimal list-inside">
                <li>
                  <strong className="text-slate-900">Statutory FICA Audit:</strong> Compliance validates ID and utility bill against national records.
                </li>
                <li>
                  <strong className="text-slate-900">Practitioner Interview:</strong> Brief call to confirm operating territories and brokerage accreditation.
                </li>
                <li>
                  <strong className="text-slate-900">Platform Activation:</strong> Access granted to application queues, match pipeline, and EFT commission payouts.
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-2">Statutory Compliance Notice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Place4U complies with the Financial Intelligence Centre Act (FICA) No. 38 of 2001 and the Property Practitioners Act No. 22 of 2019. Unverified agent accounts cannot view personal tenant data or process placement transactions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Form State: Practitioner Registration & Document Upload */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-slate-900 font-bold text-base">Practitioner Registration Form</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Submit your details and FICA documents to complete accreditation
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                FICA Mandatory
              </span>
            </div>

            {error && (
              <div className="mx-5 mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-5 space-y-6">
              {/* Section 1: Practitioner Details */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">1. Practitioner Identity & Practice</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Full Legal Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="e.g. Sipho Ndlovu"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">ID or Passport Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      placeholder="13-digit SA ID or passport"
                      className="w-full font-mono border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Agency or Brokerage Name</label>
                    <input
                      type="text"
                      value={formData.agency_name}
                      onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                      placeholder="e.g. Pam Golding or Independent"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Phone / WhatsApp <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 082 555 1234"
                      className="w-full font-mono border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Operating City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Johannesburg"
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Province <span className="text-red-500">*</span></label>
                    <select
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: FICA Documents */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">2. Statutory FICA Documentation</h4>
                <p className="text-xs text-slate-500 mb-3">Upload clear PDF, PNG, or JPEG documents (maximum 10 MB each).</p>

                <div className="space-y-3">
                  {/* ID Document Row */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <strong className="text-slate-900 block font-semibold">National ID or Valid Passport <span className="text-red-500">*</span></strong>
                      <span className="text-slate-500 text-[11px]">Smart ID card (both sides), green barcoded ID, or passport with work endorsement.</span>
                    </div>

                    <div>
                      {hasIdDoc ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                          <span className="font-semibold text-xs truncate max-w-[140px]">
                            {idDocumentFile ? idDocumentFile.name : 'Attached'}
                          </span>
                          {docPreviews.id && (
                            <button
                              type="button"
                              onClick={() => setPreviewModal({ title: 'Identity Document', url: docPreviews.id })}
                              className="text-xs text-blue-600 underline hover:text-blue-800 ml-1"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleFileRemove('id_document')}
                            className="text-slate-400 hover:text-red-600 ml-1"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileSelect('id_document', e.target.files[0])}
                          />
                          <Upload size={13} />
                          Upload Document
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Proof of Address Row */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <strong className="text-slate-900 block font-semibold">Proof of Residential Address <span className="text-red-500">*</span></strong>
                      <span className="text-slate-500 text-[11px]">Utility bill, rates notice, or bank statement dated within the past 3 months.</span>
                    </div>

                    <div>
                      {hasPorDoc ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                          <span className="font-semibold text-xs truncate max-w-[140px]">
                            {proofOfResidenceFile ? proofOfResidenceFile.name : 'Attached'}
                          </span>
                          {docPreviews.por && (
                            <button
                              type="button"
                              onClick={() => setPreviewModal({ title: 'Proof of Address', url: docPreviews.por })}
                              className="text-xs text-blue-600 underline hover:text-blue-800 ml-1"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleFileRemove('proof_of_residence')}
                            className="text-slate-400 hover:text-red-600 ml-1"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileSelect('proof_of_residence', e.target.files[0])}
                          />
                          <Upload size={13} />
                          Upload Document
                        </label>
                      )}
                    </div>
                  </div>

                  {/* FFC Certificate Row */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-semibold">Fidelity Fund Certificate (FFC)</strong>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">Optional</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">PPRA registration certificate if available.</span>
                    </div>

                    <div>
                      {hasFfcDoc ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                          <span className="font-semibold text-xs truncate max-w-[140px]">
                            {fidelityFundCertFile ? fidelityFundCertFile.name : 'Attached'}
                          </span>
                          {docPreviews.ffc && (
                            <button
                              type="button"
                              onClick={() => setPreviewModal({ title: 'Fidelity Fund Certificate', url: docPreviews.ffc })}
                              className="text-xs text-blue-600 underline hover:text-blue-800 ml-1"
                            >
                              View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleFileRemove('fidelity_fund_cert')}
                            className="text-slate-400 hover:text-red-600 ml-1"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileSelect('fidelity_fund_cert', e.target.files[0])}
                          />
                          <Upload size={13} />
                          Upload Document
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Onboarding Call Window */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">3. Compliance Interview Preference</h4>
                <p className="text-xs text-slate-500 mb-3">Choose your preferred window for the 15-minute verification interview.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Preferred Time of Day</label>
                    <select
                      value={formData.interview_time_slot}
                      onChange={(e) => setFormData({ ...formData, interview_time_slot: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="morning">Morning (09:00 – 12:00)</option>
                      <option value="afternoon">Afternoon (13:00 – 17:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Preferred Channel</label>
                    <select
                      value={formData.preferred_contact_method}
                      onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="whatsapp">WhatsApp Voice Call</option>
                      <option value="phone">Cellular Direct Call</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  {submitting ? 'Submitting Application…' : 'Submit Verification Application'}
                </button>
                {isPending && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Documents are protected and encrypted per POPIA regulations.
              </p>
            </div>
          </form>

          {/* Side Info Rail */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Verification Checklist</h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Valid South African smart ID or passport with permit</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Proof of residence with street address (under 3 months old)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Reachability on mobile/WhatsApp for onboarding call</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-2">Statutory Notice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Place4U operates under the Property Practitioners Act 22 of 2019 and the Financial Intelligence Centre Act 38 of 2001. Unverified agent accounts are restricted from tenant data access and commission payouts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
