import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/Supabase'
import {
  getPropertySubmissions,
  reviewPropertySubmission,
  formatCurrency,
  formatDate,
  openGmail
} from './db/queries'
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  MapPin,
  Mail,
  Phone,
  Eye,
  Check,
  X,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Bed,
  Bath,
  Maximize2,
  TrendingUp,
  Image as ImageIcon,
  Layers,
  Calendar,
  Sparkles,
  UserCheck,
  FileCheck2,
  Send
} from 'lucide-react'

// Approval lifecycle display metadata (mirrors the landlord portal + properties registry)
const APPROVAL_META = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_approval: { label: 'Pending Approval', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved & Live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
}
const approvalMeta = (status) => APPROVAL_META[status] || APPROVAL_META.pending_approval

// Friendly labels for the document types a landlord can attach
const DOC_TYPE_LABELS = {
  ownership: 'Proof of Ownership',
  title_deed: 'Deeds Office Title Deed',
  rates: 'Municipal Rates & Taxes',
  rates_taxes: 'Municipal Rates & Taxes',
  id: 'Certified ID',
  fica: 'FICA Documentation',
  lease: 'Lease Agreement',
  other: 'Supporting Document'
}
const docLabel = (doc) => DOC_TYPE_LABELS[doc?.documentType] || doc?.title || 'Property Document'

const PROPERTY_TYPES = ['All Types', 'apartment', 'townhouse', 'house', 'room', 'studio', 'condo']

const initialsOf = (name) =>
  (name || 'Landlord')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

export default function PropertySubmissionsPage() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All Types')

  const [selected, setSelected] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    setLoading(true)
    try {
      const data = await getPropertySubmissions()
      setSubmissions(data || [])
    } catch (err) {
      showToast(`Error loading submissions: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 4000)
  }

  const reviewerIdOf = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      return data?.user?.id || null
    } catch {
      return null
    }
  }

  // Approve a submitted listing — publishes it to tenants
  const handleApprove = async (sub) => {
    setIsSubmitting(true)
    try {
      const reviewerId = await reviewerIdOf()
      const updated = await reviewPropertySubmission(sub.id, 'approved', {
        notes: 'Listing verified and approved by Place4U administrator.',
        reviewerId
      })
      applyUpdate(sub.id, updated)
      showToast(`"${sub.address || 'Listing'}" approved and published live.`)
    } catch (err) {
      showToast(`Failed to approve listing: ${err.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open the styled rejection prompt
  const openReject = (sub) => {
    setRejectTarget(sub)
    setRejectReason(
      'Listing did not meet Place4U verification standards. Please review the property details and proof-of-ownership documents and resubmit.'
    )
  }

  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    const reason = rejectReason.trim() || 'Listing did not meet Place4U verification requirements.'
    setIsSubmitting(true)
    try {
      const reviewerId = await reviewerIdOf()
      const updated = await reviewPropertySubmission(rejectTarget.id, 'rejected', {
        notes: reason,
        reviewerId
      })
      applyUpdate(rejectTarget.id, updated)
      setRejectTarget(null)
      showToast(`"${rejectTarget.address || 'Listing'}" rejected — landlord notified.`, 'warning')
    } catch (err) {
      showToast(`Failed to reject listing: ${err.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Merge an updated row into both the list and the open dossier
  const applyUpdate = (id, updated) => {
    if (!updated) return
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)))
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev))
  }

  const counts = useMemo(() => {
    const pending = submissions.filter((s) => (s.approval_status || 'pending_approval') === 'pending_approval').length
    const approved = submissions.filter((s) => s.approval_status === 'approved').length
    const rejected = submissions.filter((s) => s.approval_status === 'rejected').length
    const draft = submissions.filter((s) => s.approval_status === 'draft').length
    const rentRoll = submissions
      .filter((s) => s.approval_status === 'approved')
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0)
    return { total: submissions.length, pending, approved, rejected, draft, rentRoll }
  }, [submissions])

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const landlordName = s.landlord?.full_name || ''
      const landlordEmail = s.landlord?.email || ''
      const haystack = `${s.address || ''} ${s.area || ''} ${s.city || ''} ${s.province || ''} ${s.property_type || ''} ${landlordName} ${landlordEmail}`.toLowerCase()
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())

      const norm = s.approval_status || 'pending_approval'
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Pending'
          ? norm === 'pending_approval'
          : statusFilter === 'Approved'
          ? norm === 'approved'
          : statusFilter === 'Rejected'
          ? norm === 'rejected'
          : statusFilter === 'Draft'
          ? norm === 'draft'
          : true

      const matchesType = typeFilter === 'All Types' || (s.property_type || '').toLowerCase() === typeFilter.toLowerCase()

      return matchesQuery && matchesStatus && matchesType
    })
  }, [submissions, query, statusFilter, typeFilter])

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-100 border-rose-700/80'
              : toast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-100 border-amber-700/80'
              : 'bg-slate-900/95 text-emerald-100 border-emerald-600/50'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle size={17} className="text-rose-400 flex-shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle size={17} className="text-amber-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={17} className="text-emerald-400 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2 p-1 rounded-md transition">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileCheck2 size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Property Submission Review</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Inspect listings landlords have submitted for approval — verify the property details, photos and proof-of-ownership documents — then approve to publish the listing to tenants or reject it with feedback.
          </p>
        </div>

        <button
          onClick={loadSubmissions}
          disabled={loading}
          className="self-start flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Command Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('All')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'All' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Submissions</span>
            <Layers size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
          <span className="text-[10px] text-slate-400">All submitted listings</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Pending' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Awaiting Review</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          <span className="text-[10px] text-amber-600/80 font-medium">Needs a decision</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Approved')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Approved' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Approved</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{counts.approved}</p>
          <span className="text-[10px] text-emerald-600/80 font-medium">Live to tenants</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Rejected')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Rejected' ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rejected</span>
            <XCircle size={15} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{counts.rejected}</p>
          <span className="text-[10px] text-rose-600/80 font-medium">Sent back to landlord</span>
        </button>

        <div className="p-4 rounded-xl border bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Approved Rent Roll</span>
            <TrendingUp size={15} className="text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(counts.rentRoll)}
            <span className="text-xs text-slate-400 font-sans">/mo</span>
          </p>
          <span className="text-[10px] text-slate-400">Live monthly value</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by address, area, city, type or landlord..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Awaiting Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Draft">Drafts</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Building2 size={13} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer capitalize"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-500 font-medium text-[11px] ml-1">
            Showing {filtered.length} of {submissions.length}
          </span>
        </div>
      </div>

      {/* Submission List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center text-slate-400 text-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
          Loading submitted listings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-xs space-y-2">
          <FileCheck2 size={32} className="mx-auto text-slate-300" />
          <p className="font-semibold text-slate-700">No submissions match your filters.</p>
          <p className="text-[11px] text-slate-400">When a landlord submits a listing for approval it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const meta = approvalMeta(sub.approval_status)
            const norm = sub.approval_status || 'pending_approval'
            const isPending = norm === 'pending_approval' || norm === 'draft'
            const thumb = sub.image_urls?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'
            const landlordName = sub.landlord?.full_name || 'Registered Landlord'
            const docs = Array.isArray(sub.documents) ? sub.documents : []

            return (
              <div key={sub.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Thumbnail */}
                  <img
                    src={thumb}
                    alt={sub.address}
                    onClick={() => setSelected(sub)}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'
                    }}
                    className="w-full lg:w-28 h-40 lg:h-24 rounded-lg object-cover shrink-0 border border-slate-200 bg-slate-100 cursor-pointer"
                  />

                  {/* Core details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => setSelected(sub)}
                        className="font-bold text-slate-900 text-sm truncate hover:text-blue-600 cursor-pointer"
                        title={sub.address}
                      >
                        {sub.address || sub.property_type || 'Untitled listing'}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {sub.area || sub.city || '—'}
                        {sub.city ? `, ${sub.city}` : ''}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Building2 size={11} className="text-slate-400" />
                        {sub.property_type || 'Apartment'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bed size={11} className="text-slate-400" />
                        {sub.bedrooms ?? 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath size={11} className="text-slate-400" />
                        {sub.bathrooms ?? 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        Submitted {formatDate(sub.submitted_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-1.5">
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px]">
                          {initialsOf(landlordName)}
                        </span>
                        {landlordName}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(sub.price)}
                        <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <FileText size={11} className="text-slate-400" />
                        {docs.length} document{docs.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelected(sub)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={12} />
                      Review Listing
                    </button>

                    {isPending ? (
                      <>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleApprove(sub)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check size={12} />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => openReject(sub)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <X size={12} />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Reviewed {formatDate(sub.reviewed_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rejection reason strip */}
                {norm === 'rejected' && sub.approval_notes && (
                  <div className="px-4 py-2.5 bg-rose-50/60 border-t border-rose-100 text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-rose-500 mt-0.5 shrink-0" />
                    <span>
                      <strong className="font-semibold">Rejection feedback:</strong> {sub.approval_notes}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ================= MODAL: LISTING REVIEW DOSSIER ================= */}
      {selected && (
        <SubmissionDossier
          sub={selected}
          isSubmitting={isSubmitting}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={openReject}
          onPreview={setPreviewDoc}
        />
      )}

      {/* ================= MODAL: DOCUMENT / PHOTO PREVIEW ================= */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full p-4 shadow-2xl border border-slate-700 space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" />
                {previewDoc.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Open Full Size
                </a>
                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center border border-slate-200">
              {/\.pdf($|\?)/i.test(previewDoc.url) ? (
                <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-[70vh]" />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[70vh] w-auto object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STYLED REJECTION PROMPT ================= */}
      {rejectTarget && (
        <div
          onClick={() => !isSubmitting && setRejectTarget(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 pb-4 border-b border-slate-100 flex items-start gap-3.5 bg-rose-50/50">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm">Reject Property Submission</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {rejectTarget.address} • {rejectTarget.landlord?.full_name || 'Landlord'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Reason for Rejection (shown to the landlord)</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Property photos do not match the listed address; proof-of-ownership document is illegible or expired..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white resize-none leading-relaxed transition"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                This feedback is stored on the listing and displayed to the landlord so they can correct it and resubmit.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==================================================================== */
/*  Listing review dossier — full inspection modal for a submission     */
/* ==================================================================== */
function SubmissionDossier({ sub, isSubmitting, onClose, onApprove, onReject, onPreview }) {
  const [activeImage, setActiveImage] = useState(0)

  const images = Array.isArray(sub.image_urls) && sub.image_urls.length > 0
    ? sub.image_urls
    : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200']

  const meta = approvalMeta(sub.approval_status)
  const norm = sub.approval_status || 'pending_approval'
  const isPending = norm === 'pending_approval' || norm === 'draft'
  const landlord = sub.landlord || {}

  const specs = [
    { label: 'Property Type', value: (sub.property_type || 'apartment'), icon: Building2, capitalize: true },
    { label: 'Monthly Rent', value: formatCurrency(sub.price), icon: TrendingUp, mono: true },
    { label: 'Bedrooms', value: sub.bedrooms ?? 1, icon: Bed },
    { label: 'Bathrooms', value: sub.bathrooms ?? 1, icon: Bath },
    { label: 'Available From', value: formatDate(sub.available_from), icon: Calendar },
    { label: 'Furnishing', value: sub.furnished ? 'Furnished' : 'Unfurnished', icon: Sparkles }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base truncate">{sub.address || 'Untitled listing'}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin size={12} className="text-slate-400" />
              {[sub.area, sub.city, sub.province].filter(Boolean).join(', ') || 'Location not provided'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[74vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Left: photos + specs + description */}
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={images[activeImage]}
                alt={`Property photo ${activeImage + 1}`}
                onClick={() => onPreview({ title: `Property Photo — ${sub.address || 'Listing'}`, url: images[activeImage] })}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200'
                }}
                className="w-full h-56 object-cover cursor-pointer"
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                      idx === activeImage ? 'border-blue-600' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {specs.map(({ label, value, icon: Icon, capitalize, mono }) => (
                <div key={label} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Icon size={11} />
                    {label}
                  </span>
                  <span className={`font-semibold text-slate-800 ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
            </div>

            {(sub.description || sub.furnished || sub.pet_friendly) && (
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <ImageIcon size={14} className="text-blue-600" />
                  Listing Highlights
                </h4>
                {sub.description && <p className="text-[11px] text-slate-600 leading-relaxed">{sub.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {sub.furnished && <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Furnished</span>}
                  {sub.pet_friendly && <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">Pet Friendly</span>}
                  {sub.available_from && (
                    <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      Available {formatDate(sub.available_from)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: landlord + documents + history */}
          <div className="space-y-4">
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <UserCheck size={14} className="text-blue-600" />
                Submitting Landlord
              </h4>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0">
                  {initialsOf(landlord.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                    {landlord.full_name || 'Registered Landlord'}
                    {landlord.is_verified && <ShieldCheck size={13} className="text-emerald-600" title="Verified owner" />}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{landlord.email || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Phone size={11} className="text-slate-400" />
                  {landlord.phone || 'No phone on file'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Calendar size={11} className="text-slate-400" />
                  Submitted {formatDate(sub.submitted_at)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    openGmail(
                      landlord.email,
                      `Place4U Listing Review — ${sub.address || 'Your property'}`,
                      `Hi ${landlord.full_name || 'there'},\n\nWe are reviewing the listing you submitted on Place4U:\n\n${
                        sub.address || ''
                      }\n\n`
                    )
                  }
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                >
                  <Mail size={12} />
                  Email
                </button>
                {landlord.phone && (
                  <a
                    href={`https://wa.me/${String(landlord.phone).replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[11px] transition flex items-center gap-1"
                  >
                    <MessageCircle size={12} />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" />
                  Proof-of-Ownership Documents
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {(Array.isArray(sub.documents) ? sub.documents.length : 0)} attached
                </span>
              </h4>

              {Array.isArray(sub.documents) && sub.documents.length > 0 ? (
                <div className="space-y-2">
                  {sub.documents.map((doc, idx) => (
                    <button
                      key={doc.id || idx}
                      type="button"
                      onClick={() => onPreview({ title: docLabel(doc), url: doc.fileUrl || doc.url })}
                      className="w-full flex items-center justify-between gap-3 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/40 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-800 text-[11px] truncate">{docLabel(doc)}</span>
                          <span className="block text-[10px] text-slate-400 truncate">{doc.fileName || 'document'}</span>
                        </span>
                      </span>
                      <span className="text-blue-600 shrink-0">
                        <Maximize2 size={13} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-lg">
                  No ownership documents were attached to this submission.
                </div>
              )}
            </div>

            {/* Verification checklist */}
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-2.5">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">Approval Checklist</span>
              <ul className="space-y-1.5 text-[11px] text-blue-800">
                <li className="flex items-center gap-1.5">
                  <Check size={13} className="text-blue-600 flex-shrink-0" />
                  Address and location details are complete and consistent
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={13} className="text-blue-600 flex-shrink-0" />
                  Photos match the listed property and are not misleading
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={13} className="text-blue-600 flex-shrink-0" />
                  Proof-of-ownership documents are legible and current
                </li>
              </ul>
            </div>

            {norm === 'rejected' && sub.approval_notes && (
              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-1.5">
                <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Previous rejection feedback
                </span>
                <p className="text-[11px] text-rose-800 leading-relaxed">{sub.approval_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <a
            href={landlord.email ? `mailto:${landlord.email}` : undefined}
            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition flex items-center gap-1.5"
          >
            <Send size={13} />
            Request Clarification
          </a>

          {isPending ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onReject(sub)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <X size={14} />
                Reject Listing
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => onApprove(sub)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Approve & Publish
              </button>
            </div>
          ) : (
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border ${meta.cls}`}>
              {meta.label} • Reviewed {formatDate(sub.reviewed_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
