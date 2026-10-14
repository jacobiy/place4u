import React, { useEffect, useMemo, useState } from 'react'
import {
  getAdminAgentApplications,
  updateAgentApplicationStatus,
  scheduleAgentInterview,
  formatDate,
  openGmail
} from './db/queries'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Search,
  Filter,
  UserCheck,
  Building,
  MapPin,
  Mail,
  Phone,
  FileText,
  Eye,
  Check,
  X,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  Maximize2
} from 'lucide-react'
import { resolveDocumentUrl, AGENT_DOCUMENTS_BUCKET } from '../../utils/documentUrls'

const PROVINCES = [
  'All Provinces',
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Mpumalanga',
  'Limpopo',
  'North West',
  'Northern Cape'
]

export default function AgentApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [provinceFilter, setProvinceFilter] = useState('All Provinces')
  const [selectedApp, setSelectedApp] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [resolvedDocs, setResolvedDocs] = useState({ id: null, por: null, ffc: null })
  const [toast, setToast] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Interview scheduling in modal
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewSlot, setInterviewSlot] = useState('morning')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const data = await getAdminAgentApplications()
      setApplications(data || [])
    } catch (err) {
      showToast(`Error loading agent applications: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    if (typeof msg === 'string') {
      setToast({ text: msg, type })
    } else {
      setToast(msg)
    }
    setTimeout(() => setToast(null), 4000)
  }

  // Open review dossier modal
  const handleOpenDossier = (app) => {
    setSelectedApp(app)
    setInterviewDate(app.interview_date ? app.interview_date.slice(0, 10) : '')
    setInterviewSlot(app.interview_time_slot || 'morning')
    setAdminNotes(app.admin_notes || '')
  }

  // Resolve private-storage FICA document paths to signed URLs for the open dossier
  useEffect(() => {
    let active = true
    ;(async () => {
      const [id, por, ffc] = await Promise.all([
        resolveDocumentUrl(selectedApp?.id_document_url || null, { bucket: AGENT_DOCUMENTS_BUCKET }),
        resolveDocumentUrl(selectedApp?.proof_of_residence_url || null, { bucket: AGENT_DOCUMENTS_BUCKET }),
        resolveDocumentUrl(selectedApp?.fidelity_fund_cert_url || null, { bucket: AGENT_DOCUMENTS_BUCKET })
      ])
      if (active) setResolvedDocs({ id, por, ffc })
    })()
    return () => {
      active = false
    }
  }, [
    selectedApp?.id_document_url,
    selectedApp?.proof_of_residence_url,
    selectedApp?.fidelity_fund_cert_url
  ])

  // Open the full-size document preview, resolving storage paths first
  const openPreviewDoc = async (title, value) => {
    if (!value) return
    const url = await resolveDocumentUrl(value, { bucket: AGENT_DOCUMENTS_BUCKET })
    setPreviewDoc({ title, url: url || value })
  }

  // Status updates
  const handleApproveAgent = async (app) => {
    setIsSubmitting(true)
    try {
      await updateAgentApplicationStatus(app.id, 'verified', adminNotes || 'Approved by Place4U administrator.')
      setApplications((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? {
                ...item,
                verification_status: 'verified',
                is_verified: true,
                verified_at: new Date().toISOString(),
                admin_notes: adminNotes || item.admin_notes
              }
            : item
        )
      )
      if (selectedApp?.id === app.id) {
        setSelectedApp((prev) => ({
          ...prev,
          verification_status: 'verified',
          is_verified: true,
          verified_at: new Date().toISOString(),
          admin_notes: adminNotes || prev.admin_notes
        }))
      }
      showToast(`Agent "${app.full_name}" successfully accredited and verified!`)
    } catch (err) {
      showToast(`Failed to approve agent: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Custom Reject Modal State
  const [rejectModalApp, setRejectModalApp] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Open Styled Reject Modal
  const handleOpenRejectModal = (app) => {
    setRejectModalApp(app)
    setRejectReason(adminNotes || 'Submitted FICA documentation did not satisfy regulatory verification standards.')
  }

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectModalApp) return
    const app = rejectModalApp
    const reason = rejectReason.trim() || 'Submitted FICA documentation did not satisfy regulatory verification standards.'

    setIsSubmitting(true)
    try {
      const targetIdentifier = app.user_id || app.id || app.email
      await updateAgentApplicationStatus(targetIdentifier, 'rejected', reason)
      setApplications((prev) =>
        prev.map((item) =>
          item.id === app.id || item.user_id === app.user_id
            ? {
                ...item,
                verification_status: 'rejected',
                is_verified: false,
                admin_notes: reason
              }
            : item
        )
      )
      if (selectedApp?.id === app.id || selectedApp?.user_id === app.user_id) {
        setSelectedApp((prev) => ({
          ...prev,
          verification_status: 'rejected',
          is_verified: false,
          admin_notes: reason
        }))
      }
      setRejectModalApp(null)
      showToast(`Agent application for "${app.full_name}" marked as Rejected.`, 'error')
    } catch (err) {
      showToast(`Failed to reject agent: ${err.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScheduleInterviewSubmit = async (e) => {
    e.preventDefault()
    if (!selectedApp) return
    if (!interviewDate) {
      showToast('Please select a date for the interview.')
      return
    }

    setIsSubmitting(true)
    try {
      await scheduleAgentInterview(
        selectedApp.id,
        new Date(interviewDate).toISOString(),
        interviewSlot,
        adminNotes
      )
      setApplications((prev) =>
        prev.map((item) =>
          item.id === selectedApp.id
            ? {
                ...item,
                verification_status: 'interview_scheduled',
                interview_date: new Date(interviewDate).toISOString(),
                interview_time_slot: interviewSlot,
                admin_notes: adminNotes
              }
            : item
        )
      )
      setSelectedApp((prev) => ({
        ...prev,
        verification_status: 'interview_scheduled',
        interview_date: new Date(interviewDate).toISOString(),
        interview_time_slot: interviewSlot,
        admin_notes: adminNotes
      }))
      showToast(`Interview scheduled for ${formatDate(interviewDate)} (${interviewSlot}).`)

      // Open Gmail notification
      openGmail(
        selectedApp.email,
        'Place4U Agent Onboarding Interview Scheduled',
        `Dear ${selectedApp.full_name},\n\nThank you for submitting your leasing agent application and FICA documents.\n\nWe have scheduled your introductory onboarding interview for:\n\n• Date: ${formatDate(interviewDate)}\n• Time Slot: ${interviewSlot.toUpperCase()} (South Africa Standard Time)\n• Contact: Telephonic / WhatsApp (${selectedApp.phone})\n\nPlease reply if you need to reschedule.\n\nKind regards,\nPlace4U Administration`
      )
    } catch (err) {
      showToast(`Failed to schedule interview: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered applications
  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const name = app.full_name || ''
      const email = app.email || ''
      const phone = app.phone || ''
      const idNum = app.id_number || ''
      const agency = app.agency_name || ''
      const city = app.city || ''
      const province = app.province || ''
      const haystack = `${name} ${email} ${phone} ${idNum} ${agency} ${city} ${province}`.toLowerCase()

      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Pending'
          ? app.verification_status === 'pending_review'
          : statusFilter === 'Interview'
          ? app.verification_status === 'interview_scheduled'
          : statusFilter === 'Verified'
          ? app.verification_status === 'verified'
          : statusFilter === 'Rejected'
          ? app.verification_status === 'rejected'
          : true

      const matchesProvince = provinceFilter === 'All Provinces' || app.province === provinceFilter

      return matchesQuery && matchesStatus && matchesProvince
    })
  }, [applications, query, statusFilter, provinceFilter])

  // KPI counts
  const counts = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((a) => a.verification_status === 'pending_review').length,
      interview: applications.filter((a) => a.verification_status === 'interview_scheduled').length,
      verified: applications.filter((a) => a.verification_status === 'verified').length,
      rejected: applications.filter((a) => a.verification_status === 'rejected').length
    }
  }, [applications])

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200 ${
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
          <span className="text-xs font-medium">{toast.text || toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 transition p-0.5 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Applications & Onboarding</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review practitioner credentials, audit statutory FICA documents, schedule onboarding interviews, and approve or reject leasing agent applicants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadApplications}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('All')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'All'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Submissions</span>
            <FileText size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
          <span className="text-[10px] text-slate-400">All registered practitioners</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Pending'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending FICA Audit</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          <span className="text-[10px] text-amber-600/80 font-medium">Requires admin review</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Interview')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Interview'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Interview Scheduled</span>
            <Calendar size={15} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{counts.interview}</p>
          <span className="text-[10px] text-purple-600/80 font-medium">Booked for onboarding</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Verified')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Verified'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Accredited Agents</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{counts.verified}</p>
          <span className="text-[10px] text-emerald-600/80 font-medium">Active in marketplace</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Rejected')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Rejected'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rejected</span>
            <XCircle size={15} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{counts.rejected}</p>
          <span className="text-[10px] text-rose-600/80 font-medium">Failed compliance / invalid</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by agent name, email, phone, SA ID, agency, or city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Interview">Interview Scheduled</option>
              <option value="Verified">Verified / Accredited</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Province Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <MapPin size={13} className="text-slate-400" />
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            Loading agent applications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <ShieldCheck size={32} className="mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No agent applications match your filters.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Applicant / Agency</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4">FICA Compliance</th>
                  <th className="py-3 px-4">Interview Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => {
                  const isVerified = app.verification_status === 'verified'
                  const isPending = app.verification_status === 'pending_review'
                  const isInterview = app.verification_status === 'interview_scheduled'
                  const isRejected = app.verification_status === 'rejected'

                  const initials = (app.full_name || 'Agent')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Applicant & Agency */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-xs border border-blue-200">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{app.full_name}</span>
                              {isVerified && (
                                <span title="Verified Leasing Agent" className="text-emerald-600">
                                  <ShieldCheck size={13} />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {app.agency_name || 'Independent Practitioner'}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {app.id_number || 'Not provided'} • {app.experience_years ?? 1} yrs exp
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-3 px-4">
                        <p className="text-slate-800 font-medium">{app.email}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone size={10} className="text-slate-400" />
                          {app.phone}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          {app.city}, {app.province}
                        </p>
                      </td>

                      {/* FICA Compliance Documents */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {app.id_document_url ? (
                              <button
                                type="button"
                                onClick={() => openPreviewDoc(`Certified ID — ${app.full_name}`, app.id_document_url)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                              >
                                <Eye size={11} />
                                ID Document
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">No ID Attached</span>
                            )}

                            {app.proof_of_residence_url ? (
                              <button
                                type="button"
                                onClick={() => openPreviewDoc(`Proof of Residence — ${app.full_name}`, app.proof_of_residence_url)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                              >
                                <Eye size={11} />
                                Proof Address
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">No Address Proof</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Prefers contact via <strong className="capitalize text-slate-600">{app.preferred_contact_method || 'WhatsApp'}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Interview Slot / Scheduled Date */}
                      <td className="py-3 px-4">
                        {app.interview_date ? (
                          <div>
                            <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 w-max">
                              <Calendar size={11} />
                              {formatDate(app.interview_date)}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
                              Slot: {app.interview_time_slot || 'Morning'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-600 font-medium capitalize text-[11px]">
                              {app.interview_time_slot || 'Anytime'} slot
                            </span>
                            <span className="text-[10px] text-slate-400 block">Not yet scheduled</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} />
                            Pending Review
                          </span>
                        )}
                        {isInterview && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Calendar size={11} />
                            Interview Booked
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            Accredited & Active
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={11} />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatDate(app.submitted_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDossier(app)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <FileText size={12} />
                            Review
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openGmail(
                                app.email,
                                `Place4U Agent Application — ${app.full_name}`,
                                `Hi ${app.full_name},\n\nRegarding your leasing agent application with Place4U:\n\n`
                              )
                            }
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition"
                            title="Send email via Gmail"
                          >
                            <Mail size={13} />
                          </button>

                          {app.phone && (
                            <a
                              href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 rounded-lg transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: DETAILED APPLICANT DOSSIER ================= */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {selectedApp.full_name?.substring(0, 2).toUpperCase() || 'AG'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {selectedApp.full_name}
                    {selectedApp.verification_status === 'verified' && (
                      <span className="text-emerald-600 text-xs flex items-center gap-1 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={12} /> Accredited
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Agent Application Dossier • Submitted {formatDate(selectedApp.submitted_at)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Personal & Agency Credentials */}
                <div className="space-y-4">
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <UserCheck size={14} className="text-blue-600" />
                      Practitioner Information
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Full Legal Name</span>
                        <span className="font-semibold text-slate-800">{selectedApp.full_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">South African ID Number</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {selectedApp.id_number || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Email Address</span>
                        <span className="font-semibold text-slate-800 break-all">{selectedApp.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Phone Contact</span>
                        <span className="font-semibold text-slate-800">{selectedApp.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <Building size={14} className="text-blue-600" />
                      Agency & Geographic Jurisdiction
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Agency / Firm Name</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApp.agency_name || 'Independent Practitioner'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Years Experience</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApp.experience_years ?? 1} years
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tax / PPRA FFC Ref</span>
                        <span className="font-mono text-slate-800">{selectedApp.tax_number || 'Exempt / Individual'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Preferred Contact</span>
                        <span className="capitalize font-semibold text-slate-800">
                          {selectedApp.preferred_contact_method || 'WhatsApp'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block">Physical Office / Address</span>
                        <span className="text-slate-800">
                          {selectedApp.address ? `${selectedApp.address}, ` : ''}
                          {selectedApp.city}, {selectedApp.province} {selectedApp.postal_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="font-bold text-slate-900 text-xs block">Internal Compliance Notes</label>
                    <textarea
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add compliance notes, phone interview feedback, FICA document verification status..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Right Column: FICA Documents & Interview Scheduler */}
                <div className="space-y-4">
                  {/* FICA Documents Audit */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" />
                        Statutory FICA Documents
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Click thumbnail to enlarge</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Certified ID */}
                      <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-slate-700">Certified ID Document</span>
                          {selectedApp.id_document_url && (
                            <button
                              type="button"
                              onClick={() => openPreviewDoc(`Certified ID — ${selectedApp.full_name}`, selectedApp.id_document_url)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Enlarge"
                            >
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                        {selectedApp.id_document_url ? (
                          <div
                            onClick={() => openPreviewDoc(`Certified ID — ${selectedApp.full_name}`, selectedApp.id_document_url)}
                            className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer group relative"
                          >
                            <img
                              src={resolvedDocs.id || selectedApp.id_document_url}
                              alt="ID Document"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold text-[10px]">
                              View Document
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            Not uploaded
                          </div>
                        )}
                      </div>

                      {/* Proof of Address */}
                      <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-slate-700">Proof of Address</span>
                          {selectedApp.proof_of_residence_url && (
                            <button
                              type="button"
                              onClick={() => openPreviewDoc(`Proof of Residence — ${selectedApp.full_name}`, selectedApp.proof_of_residence_url)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Enlarge"
                            >
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                        {selectedApp.proof_of_residence_url ? (
                          <div
                            onClick={() => openPreviewDoc(`Proof of Residence — ${selectedApp.full_name}`, selectedApp.proof_of_residence_url)}
                            className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer group relative"
                          >
                            <img
                              src={resolvedDocs.por || selectedApp.proof_of_residence_url}
                              alt="Proof of Residence"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold text-[10px]">
                              View Document
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            Not uploaded
                          </div>
                        )}
                      </div>

                      {/* Fidelity Fund Certificate */}
                      <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-slate-700">Fidelity Fund Cert.</span>
                          {selectedApp.fidelity_fund_cert_url && (
                            <button
                              type="button"
                              onClick={() => openPreviewDoc(`Fidelity Fund Certificate — ${selectedApp.full_name}`, selectedApp.fidelity_fund_cert_url)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Enlarge"
                            >
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                        {selectedApp.fidelity_fund_cert_url ? (
                          <div
                            onClick={() => openPreviewDoc(`Fidelity Fund Certificate — ${selectedApp.full_name}`, selectedApp.fidelity_fund_cert_url)}
                            className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer group relative"
                          >
                            <img
                              src={resolvedDocs.ffc || selectedApp.fidelity_fund_cert_url}
                              alt="Fidelity Fund Certificate"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold text-[10px]">
                              View Document
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interview Scheduling Form */}
                  <form onSubmit={handleScheduleInterviewSubmit} className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
                    <h4 className="font-bold text-purple-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <Calendar size={14} className="text-purple-600" />
                      Schedule Onboarding Interview
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-purple-900 block mb-1">Interview Date</label>
                        <input
                          type="date"
                          value={interviewDate}
                          onChange={(e) => setInterviewDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-purple-900 block mb-1">Time Slot Preference</label>
                        <select
                          value={interviewSlot}
                          onChange={(e) => setInterviewSlot(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-purple-600"
                        >
                          <option value="morning">Morning (09:00 - 12:00)</option>
                          <option value="afternoon">Afternoon (13:00 - 16:00)</option>
                          <option value="evening">Evening (17:00 - 19:00)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Calendar size={12} />
                        Confirm & Email Interview Invite
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Modal Footer Decisions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openGmail(
                      selectedApp.email,
                      `FICA Document Clarification — Place4U Application`,
                      `Dear ${selectedApp.full_name},\n\nWe are reviewing your leasing agent application for Place4U.\n\nPlease provide clearer / updated copies of the following documents to complete verification:\n\n• Proof of residence (must be within last 3 months)\n• Certified ID / Passport\n\nKind regards,\nPlace4U Compliance Team`
                    )
                  }
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Mail size={13} />
                  Request Document Update
                </button>

                {selectedApp.phone && (
                  <a
                    href={`https://wa.me/${selectedApp.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                  >
                    <MessageCircle size={13} />
                    WhatsApp Applicant
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleOpenRejectModal(selectedApp)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <X size={14} />
                  Reject Application
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || selectedApp.verification_status === 'verified'}
                  onClick={() => handleApproveAgent(selectedApp)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  {selectedApp.verification_status === 'verified'
                    ? 'Already Accredited'
                    : 'Approve & Unlock Agent Portal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FULL DOCUMENT PREVIEW ================= */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-zoom-out"
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
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center border border-slate-200">
              {/\.pdf($|\?|#)/i.test(previewDoc.url || '') ? (
                <iframe
                  src={previewDoc.url}
                  title="FICA Document Preview"
                  className="w-full"
                  style={{ height: '70vh', border: 'none' }}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt="FICA Document Preview"
                  className="max-h-[70vh] w-auto object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STYLED REJECTION PROMPT ================= */}
      {rejectModalApp && (
        <div
          onClick={() => setRejectModalApp(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="p-5 pb-4 border-b border-slate-100 flex items-start gap-3.5 bg-rose-50/50">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-sm">Reject Agent Application</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {rejectModalApp.full_name} • {rejectModalApp.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Reason for Rejection / Compliance Discrepancy
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reasons for rejecting (e.g. Invalid FICA documents, unverified identity, expired certification)..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white resize-none leading-relaxed transition"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                This notice reason will be recorded on the agent profile audit log and displayed to the applicant.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalApp(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <X size={13} />
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
