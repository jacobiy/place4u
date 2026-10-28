import React, { useEffect, useMemo, useState } from 'react'
import {
  getAdminLandlordApplications,
  updateLandlordApplicationStatus,
  formatCurrency,
  formatDate,
  openEmailClient
} from './db/queries'
import {
  Building2,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
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
  Maximize2,
  FileCheck2,
  TrendingUp
} from 'lucide-react'

const PROVINCES = [
  'All Provinces',
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Limpopo',
  'Eastern Cape',
  'Free State',
  'Mpumalanga',
  'North West',
  'Northern Cape'
]

const ENTITY_TYPES = [
  'All Entities',
  'Private Landlord',
  'Commercial Entity / CC',
  'Family Trust'
]

export default function LandlordApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [provinceFilter, setProvinceFilter] = useState('All Provinces')
  const [entityFilter, setEntityFilter] = useState('All Entities')
  const [selectedApp, setSelectedApp] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [toast, setToast] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const data = await getAdminLandlordApplications()
      setApplications(data || [])
    } catch (err) {
      showToast(`Error loading landlord applications: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ text: msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Open review dossier modal
  const handleOpenDossier = (app) => {
    setSelectedApp(app)
    setAdminNotes(app.admin_notes || '')
  }

  // Approve Landlord
  const handleApproveLandlord = async (app) => {
    setIsSubmitting(true)
    try {
      const targetIdentifier = app.user_id || app.id || app.email
      await updateLandlordApplicationStatus(targetIdentifier, 'approved', adminNotes || 'Title Deed and FICA verified by Place4U administrator.')
      setApplications((prev) =>
        prev.map((item) =>
          item.id === app.id || item.user_id === app.user_id
            ? {
                ...item,
                verification_status: 'approved',
                application_status: 'approved',
                is_verified: true,
                id_verified: true,
                ownership_proof_verified: true,
                approved_at: new Date().toISOString(),
                admin_notes: adminNotes || item.admin_notes
              }
            : item
        )
      )
      if (selectedApp?.id === app.id || selectedApp?.user_id === app.user_id) {
        setSelectedApp((prev) => ({
          ...prev,
          verification_status: 'approved',
          application_status: 'approved',
          is_verified: true,
          id_verified: true,
          ownership_proof_verified: true,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || prev.admin_notes
        }))
      }
      showToast(`Landlord "${app.full_name}" successfully accredited & approved!`)
    } catch (err) {
      showToast(`Failed to approve landlord: ${err.message}`)
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
    setRejectReason(adminNotes || 'Submitted Title Deed or municipal rates statement did not match Deeds Office records.')
  }

  // Submit Rejection
  const handleConfirmReject = async () => {
    if (!rejectModalApp) return
    const app = rejectModalApp
    const reason = rejectReason.trim() || 'Submitted Title Deed or municipal rates statement did not match Deeds Office records.'

    setIsSubmitting(true)
    try {
      const targetIdentifier = app.user_id || app.id || app.email
      await updateLandlordApplicationStatus(targetIdentifier, 'rejected', reason)
      setApplications((prev) =>
        prev.map((item) =>
          item.id === app.id || item.user_id === app.user_id
            ? {
                ...item,
                verification_status: 'rejected',
                application_status: 'rejected',
                is_verified: false,
                id_verified: false,
                ownership_proof_verified: false,
                admin_notes: reason
              }
            : item
        )
      )
      if (selectedApp?.id === app.id || selectedApp?.user_id === app.user_id) {
        setSelectedApp((prev) => ({
          ...prev,
          verification_status: 'rejected',
          application_status: 'rejected',
          is_verified: false,
          admin_notes: reason
        }))
      }
      setRejectModalApp(null)
      showToast(`Application for "${app.full_name}" marked as Rejected.`, 'error')
    } catch (err) {
      showToast(`Failed to reject application: ${err.message}`, 'error')
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
      const company = app.company_name || ''
      const city = app.city || ''
      const province = app.province || ''
      const haystack = `${name} ${email} ${phone} ${idNum} ${company} ${city} ${province}`.toLowerCase()

      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Pending'
          ? app.verification_status === 'pending_review'
          : statusFilter === 'Approved'
          ? app.verification_status === 'approved'
          : statusFilter === 'Rejected'
          ? app.verification_status === 'rejected'
          : true

      const matchesProvince = provinceFilter === 'All Provinces' || app.province === provinceFilter
      const matchesEntity = entityFilter === 'All Entities' || app.entity_type === entityFilter

      return matchesQuery && matchesStatus && matchesProvince && matchesEntity
    })
  }, [applications, query, statusFilter, provinceFilter, entityFilter])

  // KPI stats
  const counts = useMemo(() => {
    const total = applications.length
    const pending = applications.filter((a) => a.verification_status === 'pending_review').length
    const approved = applications.filter((a) => a.verification_status === 'approved').length
    const rejected = applications.filter((a) => a.verification_status === 'rejected').length
    const totalPortfolioVal = applications.reduce((sum, a) => sum + (Number(a.estimated_portfolio_value) || 0), 0)

    return { total, pending, approved, rejected, totalPortfolioVal }
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
          <span className="text-xs font-semibold">{toast.text || toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 p-1 rounded-md transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Building2 size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Landlord Applications & Deeds Audit</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review registered property owners, audit municipal Title Deeds and rates statements, verify FICA compliance, and approve landlords to list verified properties on Place4U.
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

      {/* KPI Command Strip */}
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
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Landlords</span>
            <Building2 size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.total}</p>
          <span className="text-[10px] text-slate-400">All registered property owners</span>
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
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Deeds Audit</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          <span className="text-[10px] text-amber-600/80 font-medium">Requires title deed review</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Approved')}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === 'Approved'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Accredited Landlords</span>
            <ShieldCheck size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{counts.approved}</p>
          <span className="text-[10px] text-emerald-600/80 font-medium">Deeds confirmed & active</span>
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
          <span className="text-[10px] text-rose-600/80 font-medium">Title/ID check failed</span>
        </button>

        <div className="p-4 rounded-xl border bg-white border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Portfolio Roll</span>
            <TrendingUp size={15} className="text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">
            {formatCurrency(counts.totalPortfolioVal)}<span className="text-xs text-slate-400 font-sans">/mo</span>
          </p>
          <span className="text-[10px] text-slate-400">Total applicant inventory</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search landlord name, email, phone, SA ID, company, or city..."
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Deeds Audit</option>
              <option value="Approved">Accredited & Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Entity Type Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Building size={13} className="text-slate-400" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
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

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
            Loading landlord applications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Building2 size={32} className="mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No landlord applications match your filters.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Landlord / Entity</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4">Portfolio Inventory</th>
                  <th className="py-3 px-4">Proof of Ownership Documents</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => {
                  const isApproved = app.verification_status === 'approved'
                  const isPending = app.verification_status === 'pending_review'
                  const isRejected = app.verification_status === 'rejected'

                  const initials = (app.full_name || 'Landlord')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Landlord & Entity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-xs border border-emerald-200">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{app.full_name}</span>
                              {isApproved && (
                                <span title="Verified Property Owner" className="text-emerald-600">
                                  <ShieldCheck size={13} />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {app.company_name || app.entity_type || 'Private Landlord'}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {app.id_number || 'Not provided'} • {app.entity_type}
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

                      {/* Portfolio Units */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {app.property_count || 1} {app.property_count === 1 ? 'Property' : 'Properties'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Est. {formatCurrency(app.estimated_portfolio_value)}/mo
                        </span>
                      </td>

                      {/* Proof of Ownership Documents */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {app.title_deed_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: `Title Deed — ${app.full_name}`, url: app.title_deed_url })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                            >
                              <Eye size={11} />
                              Title Deed
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Deed</span>
                          )}

                          {app.rates_taxes_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: `Municipal Rates — ${app.full_name}`, url: app.rates_taxes_url })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 cursor-pointer"
                            >
                              <Eye size={11} />
                              Rates & Taxes
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Rates</span>
                          )}

                          {app.id_document_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: `Certified ID — ${app.full_name}`, url: app.id_document_url })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
                            >
                              <Eye size={11} />
                              ID
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} />
                            Pending Audit
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            Ownership Verified
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
                          {isPending && (
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleApproveLandlord(app)}
                              className="px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="1-Click Approve Landlord"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDossier(app)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <FileCheck2 size={12} />
                            Audit Dossier
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEmailClient(
                                app.email,
                                `Place4U Property Ownership Verification — ${app.full_name}`,
                                `Hi ${app.full_name},\n\nRegarding your property owner verification on Place4U:\n\n`
                              )
                            }
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Send email"
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

      {/* ================= MODAL: DETAILED LANDLORD DOSSIER ================= */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {selectedApp.full_name?.substring(0, 2).toUpperCase() || 'LL'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {selectedApp.full_name}
                    {selectedApp.verification_status === 'approved' && (
                      <span className="text-emerald-700 text-xs flex items-center gap-1 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={12} /> Ownership Verified
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Landlord Ownership Application • Submitted {formatDate(selectedApp.submitted_at)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Owner & Portfolio Details */}
                <div className="space-y-4">
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <UserCheck size={14} className="text-emerald-600" />
                      Landlord / Principal Information
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
                      <Building size={14} className="text-emerald-600" />
                      Corporate Entity & Property Portfolio
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Entity Classification</span>
                        <span className="font-semibold text-slate-800">{selectedApp.entity_type}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Company / Trust Name</span>
                        <span className="font-semibold text-slate-800">{selectedApp.company_name || 'Individual'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tax / SARS VAT Ref</span>
                        <span className="font-mono text-slate-800">{selectedApp.tax_id || 'Exempt / Individual'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Managed Units</span>
                        <span className="font-semibold text-slate-800">{selectedApp.property_count || 1} Properties</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block">Registered Physical Address</span>
                        <span className="text-slate-800">
                          {selectedApp.address ? `${selectedApp.address}, ` : ''}
                          {selectedApp.city}, {selectedApp.province} {selectedApp.postal_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Compliance Notes */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="font-bold text-slate-900 text-xs block">Internal Title Deed & Deeds Audit Notes</label>
                    <textarea
                      rows="3"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add compliance notes, municipal deeds confirmation, rates account verification..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Right Column: Title Deeds & Statutory Documents Audit */}
                <div className="space-y-4">
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} className="text-emerald-600" />
                        Proof of Ownership & FICA Documents
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Click thumbnail to inspect</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Title Deed */}
                      <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-slate-700">Deeds Office Title Deed</span>
                          {selectedApp.title_deed_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: `Title Deed — ${selectedApp.full_name}`, url: selectedApp.title_deed_url })}
                              className="text-blue-600 hover:text-blue-800"
                              title="Enlarge"
                            >
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                        {selectedApp.title_deed_url ? (
                          <div
                            onClick={() => setPreviewDoc({ title: `Title Deed — ${selectedApp.full_name}`, url: selectedApp.title_deed_url })}
                            className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer group relative"
                          >
                            <img
                              src={selectedApp.title_deed_url}
                              alt="Title Deed Document"
                              loading="eager"
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold text-[10px]">
                              Inspect Deed
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            Not uploaded
                          </div>
                        )}
                      </div>

                      {/* Municipal Rates & Taxes */}
                      <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] text-slate-700">Municipal Rates & Taxes</span>
                          {selectedApp.rates_taxes_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: `Municipal Rates — ${selectedApp.full_name}`, url: selectedApp.rates_taxes_url })}
                              className="text-blue-600 hover:text-blue-800"
                              title="Enlarge"
                            >
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                        {selectedApp.rates_taxes_url ? (
                          <div
                            onClick={() => setPreviewDoc({ title: `Municipal Rates — ${selectedApp.full_name}`, url: selectedApp.rates_taxes_url })}
                            className="aspect-video bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer group relative"
                          >
                            <img
                              src={selectedApp.rates_taxes_url}
                              alt="Rates & Taxes Statement"
                              loading="eager"
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-semibold text-[10px]">
                              Inspect Statement
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

                  {/* Deeds Office Verification Audit Checklist */}
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2.5">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Deeds Registry Compliance Checklist
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-emerald-800">
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-600 flex-shrink-0" />
                        Title Deed owner matches registered landlord entity
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-600 flex-shrink-0" />
                        Municipal account dated within the last 3 months
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-600 flex-shrink-0" />
                        No active municipal dispute or adverse clearance hold
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openEmailClient(
                      selectedApp.email,
                      `Proof of Ownership Clarification — Place4U Landlord Verification`,
                      `Dear ${selectedApp.full_name},\n\nWe are reviewing your landlord verification application for Place4U.\n\nPlease provide updated/clearer copies of the following property documents:\n\n• Certified Deeds Office Title Deed or Conveyancer Transfer Letter\n• Municipal assessment rates and services bill (under 3 months old)\n\nKind regards,\nPlace4U Property Operations`
                    )
                  }
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Mail size={13} />
                  Request Deed Clarification
                </button>

                {selectedApp.phone && (
                  <a
                    href={`https://wa.me/${selectedApp.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-xs transition flex items-center gap-1"
                  >
                    <MessageCircle size={13} />
                    WhatsApp Owner
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
                  disabled={isSubmitting || selectedApp.verification_status === 'approved'}
                  onClick={() => handleApproveLandlord(selectedApp)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  {selectedApp.verification_status === 'approved'
                    ? 'Already Verified'
                    : 'Approve & Unlock Listing Access'}
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
                <FileText size={14} className="text-emerald-600" />
                {previewDoc.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Open Full Size
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center border border-slate-200">
              <img
                src={previewDoc.url}
                alt="Document Preview"
                className="max-h-[70vh] w-auto object-contain"
              />
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
                <h3 className="font-bold text-slate-900 text-sm">Reject Landlord Application</h3>
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
                Reason for Rejection / Audit Non-Compliance
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reasons for rejecting (e.g. Title Deed name discrepancy, outdated municipal statement)..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white resize-none leading-relaxed transition"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                This notice reason will be recorded on the landlord profile audit log and displayed to the landlord.
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
