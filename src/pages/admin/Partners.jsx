import React, { useEffect, useMemo, useState } from 'react'
import {
  Handshake,
  Plus,
  RefreshCw,
  Search,
  Download,
  Filter,
  Building2,
  MapPin,
  Phone,
  Mail,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Info,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  CheckCheck,
  Upload
} from 'lucide-react'
import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  exportPartnersToCSV,
  PARTNER_STATUS_CONFIG,
  PARTNER_TYPE_OPTIONS,
  INSTITUTION_OPTIONS,
  BUILDING_TYPE_OPTIONS
} from './db/partnerQueries'
import { getBuildings } from './db/buildingQueries'

const STATUS_KEYS = Object.keys(PARTNER_STATUS_CONFIG)

export default function PartnersPage() {
  const [partners, setPartners] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [institutionFilter, setInstitutionFilter] = useState('all')
  const [copiedSql, setCopiedSql] = useState(false)
  const fileInputRef = React.useRef(null)
  const [importing, setImporting] = useState(false)
  const [importStatusMsg, setImportStatusMsg] = useState('')

  // Status saving state tracker { [partnerId]: 'saving' | 'saved' }
  const [savingStatus, setSavingStatus] = useState({})

  // Quick inline-add row state
  const [quickAdd, setQuickAdd] = useState({
    first_name: '',
    last_name: '',
    location: '',
    building_name: '',
    institution: 'UJ',
    building_type: 'student_accommodation',
    status: 'lead',
    partner_type: 'building_manager',
    phone: '',
    email: '',
    units_count: '',
    notes: ''
  })
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Selected row for editing details in modal (optional detailed inspection)
  const [editingPartner, setEditingPartner] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Fetch partners and registered buildings
  const fetchData = async () => {
    setLoading(true)
    const [partnersRes, buildingsData] = await Promise.all([
      getPartners(),
      getBuildings().catch(() => [])
    ])

    if (partnersRes) {
      setPartners(partnersRes.data || [])
      setIsFallback(Boolean(partnersRes.isFallback))
    }
    setBuildings(buildingsData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-fill location if building name matches an existing building
  const handleBuildingNameChange = (val, isModal = false) => {
    const matched = buildings.find(
      (b) => b.name?.toLowerCase().trim() === val.toLowerCase().trim()
    )
    if (isModal) {
      setEditingPartner((prev) => ({
        ...prev,
        building_name: val,
        building_id: matched ? matched.id : prev.building_id,
        location: matched && !prev.location ? [matched.area, matched.city].filter(Boolean).join(', ') : prev.location
      }))
    } else {
      setQuickAdd((prev) => ({
        ...prev,
        building_name: val,
        building_id: matched ? matched.id : null,
        location: matched && !prev.location ? [matched.area, matched.city].filter(Boolean).join(', ') : prev.location
      }))
    }
  }

  // Handle Quick Add Submission
  const handleQuickAddSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!quickAdd.first_name.trim()) {
      setAddError('First Name is required to add a partner.')
      return
    }

    setAddError('')
    setIsAdding(true)

    const res = await createPartner(quickAdd)
    setIsAdding(false)

    if (res.success) {
      setPartners((prev) => [res.data, ...prev])
      setQuickAdd({
        first_name: '',
        last_name: '',
        location: '',
        building_name: '',
        institution: 'UJ',
        building_type: 'student_accommodation',
        status: 'lead',
        partner_type: 'building_manager',
        phone: '',
        email: '',
        units_count: '',
        notes: ''
      })
    } else {
      setAddError(res.error || 'Failed to add partner.')
    }
  }

  // Direct status dropdown change on the spreadsheet table row
  const handleStatusChange = async (partnerId, newStatus) => {
    setSavingStatus((prev) => ({ ...prev, [partnerId]: 'saving' }))

    // Optimistically update in UI
    setPartners((prev) =>
      prev.map((p) => (p.id === partnerId ? { ...p, status: newStatus } : p))
    )

    const res = await updatePartner(partnerId, { status: newStatus })
    if (res.success) {
      setSavingStatus((prev) => ({ ...prev, [partnerId]: 'saved' }))
      setTimeout(() => {
        setSavingStatus((prev) => {
          const next = { ...prev }
          delete next[partnerId]
          return next
        })
      }, 1800)
    } else {
      setSavingStatus((prev) => ({ ...prev, [partnerId]: 'error' }))
    }
  }

  // Direct partner type dropdown change on row
  const handleTypeChange = async (partnerId, newType) => {
    setSavingStatus((prev) => ({ ...prev, [partnerId]: 'saving' }))
    setPartners((prev) =>
      prev.map((p) => (p.id === partnerId ? { ...p, partner_type: newType } : p))
    )
    const res = await updatePartner(partnerId, { partner_type: newType })
    if (res.success) {
      setSavingStatus((prev) => ({ ...prev, [partnerId]: 'saved' }))
      setTimeout(() => {
        setSavingStatus((prev) => {
          const next = { ...prev }
          delete next[partnerId]
          return next
        })
      }, 1800)
    }
  }

  // Direct inline text edits
  const handleInlineBlur = async (partnerId, field, value) => {
    const existing = partners.find((p) => p.id === partnerId)
    if (existing && existing[field] === value) return // No change

    setSavingStatus((prev) => ({ ...prev, [partnerId]: 'saving' }))
    const res = await updatePartner(partnerId, { [field]: value })
    if (res.success) {
      setSavingStatus((prev) => ({ ...prev, [partnerId]: 'saved' }))
      setTimeout(() => {
        setSavingStatus((prev) => {
          const next = { ...prev }
          delete next[partnerId]
          return next
        })
      }, 1500)
    }
  }

  // Delete partner
  const handleDelete = async (id) => {
    const res = await deletePartner(id)
    if (res.success) {
      setPartners((prev) => prev.filter((p) => p.id !== id))
      setDeleteConfirmId(null)
    }
  }

  // Save Modal Edit
  const handleSaveModal = async (e) => {
    e.preventDefault()
    if (!editingPartner) return
    const res = await updatePartner(editingPartner.id, editingPartner)
    if (res.success) {
      setPartners((prev) =>
        prev.map((p) => (p.id === editingPartner.id ? { ...p, ...editingPartner } : p))
      )
      setEditingPartner(null)
    }
  }

  // Handle JSON file import
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatusMsg('Reading and importing records...')
    try {
      const text = await file.text()
      let records = []
      if (file.name.endsWith('.json')) {
        records = JSON.parse(text)
      } else if (file.name.endsWith('.csv')) {
        // Basic CSV parsing
        const lines = text.split('\n').filter((l) => l.trim())
        if (lines.length > 1) {
          records = lines.slice(1).map((line) => {
            const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
            return {
              first_name: cols[0] || 'Partner',
              last_name: cols[1] || '',
              building_name: cols[2] || '',
              institution: cols[3] || 'UJ',
              building_type: cols[4] || 'student_accommodation',
              location: cols[5] || '',
              status: cols[6] || 'lead',
              partner_type: cols[7] || 'building_manager',
              phone: cols[8] || '',
              email: cols[9] || '',
              units_count: Number(cols[10]) || 0,
              commission_deal: cols[11] || '',
              notes: cols[12] || ''
            }
          })
        }
      }

      if (Array.isArray(records) && records.length > 0) {
        let inserted = 0
        for (const item of records) {
          const res = await createPartner(item)
          if (res.success) inserted++
        }
        setImportStatusMsg(`Successfully imported ${inserted} partners!`)
        setTimeout(() => setImportStatusMsg(''), 4500)
        await fetchData()
      } else {
        setImportStatusMsg('No valid records found in file.')
        setTimeout(() => setImportStatusMsg(''), 3000)
      }
    } catch (err) {
      alert('Error importing file: ' + err.message)
      setImportStatusMsg('')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchSearch =
        !searchTerm ||
        [
          p.first_name,
          p.last_name,
          p.location,
          p.building_name,
          p.institution,
          p.building_type,
          p.phone,
          p.email,
          p.notes
        ]
          .filter(Boolean)
          .some((val) => val.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      const matchType = typeFilter === 'all' || p.partner_type === typeFilter
      const matchInstitution =
        institutionFilter === 'all' || (p.institution || 'UJ') === institutionFilter

      return matchSearch && matchStatus && matchType && matchInstitution
    })
  }, [partners, searchTerm, statusFilter, typeFilter, institutionFilter])

  // Summary counts
  const stats = useMemo(() => {
    const total = partners.length
    const active = partners.filter((p) => p.status === 'active').length
    const onboarding = partners.filter((p) => p.status === 'onboarding').length
    const leads = partners.filter((p) => p.status === 'lead').length
    const totalUnits = partners.reduce((sum, p) => sum + (Number(p.units_count) || 0), 0)
    return { total, active, onboarding, leads, totalUnits }
  }, [partners])

  const copySqlNotice = () => {
    const sqlNotice = `Run dev/partners_schema.sql in the Supabase SQL Editor.`
    navigator.clipboard?.writeText(sqlNotice)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2000)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Schema fallback alert (if SQL not yet executed) */}
      {isFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-950">
                Operating in Local Storage Cache Mode
              </p>
              <p className="mt-0.5 text-amber-800">
                The database table <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px] font-mono">public.partners</code> is not yet present on this Supabase project. You can manage rows freely right now; to persist them in Postgres, run <span className="font-semibold">dev/partners_schema.sql</span> in your Supabase SQL editor.
              </p>
            </div>
          </div>
          <button
            onClick={copySqlNotice}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-200/80 hover:bg-amber-200 text-amber-900 rounded-lg font-medium transition cursor-pointer"
          >
            {copiedSql ? <CheckCheck size={13} /> : <Copy size={13} />}
            {copiedSql ? 'Copied' : 'dev/partners_schema.sql'}
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Partners Management Spreadsheet
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {filteredPartners.length} of {partners.length} records
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Track caretakers, building managers, landlords, and property reps in real time
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {importStatusMsg && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-pulse">
              {importStatusMsg}
            </span>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
            title="Import partners from JSON or CSV dataset"
          >
            <Upload size={14} className={importing ? 'animate-bounce' : ''} />
            {importing ? 'Importing...' : 'Import Dataset'}
          </button>

          <button
            onClick={() => exportPartnersToCSV(filteredPartners)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
            title="Download CSV spreadsheet"
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Partners
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-slate-500">registered</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Active Partners
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-700">{stats.active}</span>
            <span className="text-[11px] text-emerald-600">operational</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
            In Onboarding
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-indigo-700">{stats.onboarding}</span>
            <span className="text-[11px] text-indigo-600">contracting</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Pipeline Leads
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-slate-700">{stats.leads}</span>
            <span className="text-[11px] text-slate-500">outreach</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
            Total Unit Capacity
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-blue-700">
              {stats.totalUnits.toLocaleString('en-ZA')}
            </span>
            <span className="text-[11px] text-blue-600">units/rooms</span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search partners by name, surname, building name, location, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Statuses ({partners.length})</option>
              {STATUS_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PARTNER_STATUS_CONFIG[k].label} (
                  {partners.filter((p) => p.status === k).length})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Types</option>
              {PARTNER_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Institution Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Institution:</span>
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Institutions</option>
              {INSTITUTION_OPTIONS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || institutionFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setTypeFilter('all')
                setInstitutionFilter('all')
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Quick-Add Top Row Card */}
      <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-200/80 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
            <Plus size={14} className="text-blue-600" /> Quick Add Partner Row (Spreadsheet Input)
          </span>
          <span className="text-[11px] text-blue-700/80">
            Fill the row and click "Add Row" or press Enter
          </span>
        </div>

        <form onSubmit={handleQuickAddSubmit} className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
            {/* Name */}
            <div>
              <input
                type="text"
                placeholder="Name *"
                required
                value={quickAdd.first_name}
                onChange={(e) => setQuickAdd({ ...quickAdd, first_name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Surname */}
            <div>
              <input
                type="text"
                placeholder="Surname"
                value={quickAdd.last_name}
                onChange={(e) => setQuickAdd({ ...quickAdd, last_name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Building Name (with datalist from known buildings) */}
            <div>
              <input
                list="quick-add-buildings-list"
                type="text"
                placeholder="Building Name"
                value={quickAdd.building_name}
                onChange={(e) => handleBuildingNameChange(e.target.value, false)}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <datalist id="quick-add-buildings-list">
                {buildings.map((b) => (
                  <option key={b.id} value={b.name}>
                    {[b.area, b.city].filter(Boolean).join(', ')}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Institution */}
            <div>
              <select
                value={quickAdd.institution}
                onChange={(e) => setQuickAdd({ ...quickAdd, institution: e.target.value })}
                className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
              >
                {INSTITUTION_OPTIONS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

            {/* Building Type */}
            <div>
              <select
                value={quickAdd.building_type}
                onChange={(e) => setQuickAdd({ ...quickAdd, building_type: e.target.value })}
                className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {BUILDING_TYPE_OPTIONS.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <input
                type="text"
                placeholder="Location (e.g. Braamfontein)"
                value={quickAdd.location}
                onChange={(e) => setQuickAdd({ ...quickAdd, location: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Secondary fields row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
            {/* Status Dropdown */}
            <div>
              <select
                value={quickAdd.status}
                onChange={(e) => setQuickAdd({ ...quickAdd, status: e.target.value })}
                className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
              >
                {STATUS_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {PARTNER_STATUS_CONFIG[k].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner Type */}
            <div>
              <select
                value={quickAdd.partner_type}
                onChange={(e) => setQuickAdd({ ...quickAdd, partner_type: e.target.value })}
                className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {PARTNER_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="text"
                placeholder="Phone (e.g. 082 123 4567)"
                value={quickAdd.phone}
                onChange={(e) => setQuickAdd({ ...quickAdd, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <input
                type="email"
                placeholder="Email address"
                value={quickAdd.email}
                onChange={(e) => setQuickAdd({ ...quickAdd, email: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <input
                type="number"
                min="0"
                placeholder="Units / Capacity"
                value={quickAdd.units_count}
                onChange={(e) => setQuickAdd({ ...quickAdd, units_count: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Notes / Commission terms..."
                value={quickAdd.notes}
                onChange={(e) => setQuickAdd({ ...quickAdd, notes: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-md shadow-xs transition cursor-pointer"
              >
                <Plus size={14} />
                {isAdding ? 'Adding...' : 'Add Row'}
              </button>
            </div>
          </div>

          {addError && <p className="text-red-600 text-xs mt-1 font-medium">{addError}</p>}
        </form>
      </div>

      {/* Spreadsheet Table View */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {/* Mobile Cards View (Phones / small screens) */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredPartners.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Handshake className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">No partners found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Use the quick add bar above to add your first partner'}
              </p>
            </div>
          ) : (
            filteredPartners.map((p, idx) => {
              const statusConf = PARTNER_STATUS_CONFIG[p.status] || PARTNER_STATUS_CONFIG.lead
              const saveState = savingStatus[p.id]

              return (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs"
                >
                  {/* Top row: Name, Index & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {[p.first_name, p.last_name].filter(Boolean).join(' ') || 'Partner'}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          {p.institution || 'UJ'}
                        </span>
                      </div>
                      {p.building_name && (
                        <p className="text-xs font-semibold text-slate-700 mt-0.5 flex items-center gap-1 truncate">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          {p.building_name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingPartner(p)}
                        title="Edit Details"
                        className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      {deleteConfirmId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700"
                          >
                            Del
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          title="Delete Partner"
                          className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status & Type Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold w-full ${statusConf.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} shrink-0`} />
                        <select
                          value={p.status || 'lead'}
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                          className="bg-transparent border-none text-current font-semibold focus:outline-none cursor-pointer w-full text-xs truncate"
                        >
                          {STATUS_KEYS.map((k) => (
                            <option key={k} value={k} className="bg-white text-slate-900 font-normal">
                              {PARTNER_STATUS_CONFIG[k].label}
                            </option>
                          ))}
                        </select>
                        {saveState === 'saving' && <RefreshCw size={11} className="animate-spin text-blue-500 shrink-0" />}
                        {saveState === 'saved' && <Check size={11} className="text-emerald-600 shrink-0" />}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Type</span>
                      <select
                        value={p.partner_type || 'building_manager'}
                        onChange={(e) => handleTypeChange(p.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer w-full text-xs"
                      >
                        {PARTNER_TYPE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contact Info (tap-to-call, tap-to-email) */}
                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-slate-100">
                    {p.phone ? (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px]">{p.phone}</span>
                        <a
                          href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp"
                          className="text-emerald-600 hover:text-emerald-700 ml-0.5"
                        >
                          <Phone size={12} className="text-emerald-600" />
                        </a>
                      </div>
                    ) : null}

                    {p.email ? (
                      <div className="flex items-center gap-1.5 text-slate-700 truncate max-w-[200px]">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <a href={`mailto:${p.email}`} className="text-blue-600 truncate hover:underline text-[11px]">
                          {p.email}
                        </a>
                      </div>
                    ) : null}

                    {p.location ? (
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span>{p.location}</span>
                      </div>
                    ) : null}

                    {p.units_count ? (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {p.units_count} Units
                      </span>
                    ) : null}
                  </div>

                  {p.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{p.notes}"
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center text-slate-400">#</th>
                <th className="py-2.5 px-3 min-w-[140px]">Name</th>
                <th className="py-2.5 px-3 min-w-[140px]">Surname</th>
                <th className="py-2.5 px-3 min-w-[170px]">Building Name</th>
                <th className="py-2.5 px-3 min-w-[100px]">Institution</th>
                <th className="py-2.5 px-3 min-w-[160px]">Building Type</th>
                <th className="py-2.5 px-3 min-w-[160px]">Location</th>
                <th className="py-2.5 px-3 min-w-[160px]">Status (Dropdown)</th>
                <th className="py-2.5 px-3 min-w-[150px]">Partner Type</th>
                <th className="py-2.5 px-3 min-w-[140px]">Phone</th>
                <th className="py-2.5 px-3 min-w-[160px]">Email</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center">Units</th>
                <th className="py-2.5 px-3 min-w-[180px]">Notes</th>
                <th className="py-2.5 px-3 w-20 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    <Handshake className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No partners found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Use the quick add bar above to add your first partner'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPartners.map((p, idx) => {
                  const statusConf = PARTNER_STATUS_CONFIG[p.status] || PARTNER_STATUS_CONFIG.lead
                  const saveState = savingStatus[p.id]

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Row index */}
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        <input
                          type="text"
                          defaultValue={p.first_name}
                          onBlur={(e) => handleInlineBlur(p.id, 'first_name', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-900 focus:outline-none"
                        />
                      </td>

                      {/* Surname */}
                      <td className="py-2 px-3 text-slate-700">
                        <input
                          type="text"
                          defaultValue={p.last_name}
                          onBlur={(e) => handleInlineBlur(p.id, 'last_name', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-800 focus:outline-none"
                        />
                      </td>

                      {/* Building Name */}
                      <td className="py-2 px-3 text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            defaultValue={p.building_name || p.building?.name || ''}
                            onBlur={(e) => handleInlineBlur(p.id, 'building_name', e.target.value)}
                            placeholder="Building name..."
                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-900 font-medium focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Institution */}
                      <td className="py-2 px-3">
                        <select
                          value={p.institution || 'UJ'}
                          onChange={(e) => handleInlineBlur(p.id, 'institution', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer w-full text-xs"
                        >
                          {INSTITUTION_OPTIONS.map((inst) => (
                            <option key={inst} value={inst}>
                              {inst}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Building Type */}
                      <td className="py-2 px-3">
                        <select
                          value={p.building_type || 'student_accommodation'}
                          onChange={(e) => handleInlineBlur(p.id, 'building_type', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer w-full text-xs"
                        >
                          {BUILDING_TYPE_OPTIONS.map((bt) => (
                            <option key={bt.value} value={bt.value}>
                              {bt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Location */}
                      <td className="py-2 px-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            defaultValue={p.location || ''}
                            onBlur={(e) => handleInlineBlur(p.id, 'location', e.target.value)}
                            placeholder="Area / suburb..."
                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-700 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Status Dropdown (Color Coded Pill) */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${statusConf.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                            <select
                              value={p.status || 'lead'}
                              onChange={(e) => handleStatusChange(p.id, e.target.value)}
                              className="bg-transparent border-none text-current font-semibold focus:outline-none cursor-pointer pr-1"
                            >
                              {STATUS_KEYS.map((k) => (
                                <option
                                  key={k}
                                  value={k}
                                  className="bg-white text-slate-900 font-normal"
                                >
                                  {PARTNER_STATUS_CONFIG[k].label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Save feedback indicator */}
                          {saveState === 'saving' && (
                            <RefreshCw size={12} className="animate-spin text-blue-500 shrink-0" />
                          )}
                          {saveState === 'saved' && (
                            <Check size={12} className="text-emerald-600 shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Partner Type Dropdown */}
                      <td className="py-2 px-3">
                        <select
                          value={p.partner_type || 'building_manager'}
                          onChange={(e) => handleTypeChange(p.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer w-full text-xs"
                        >
                          {PARTNER_TYPE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Phone */}
                      <td className="py-2 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            defaultValue={p.phone || ''}
                            onBlur={(e) => handleInlineBlur(p.id, 'phone', e.target.value)}
                            placeholder="082..."
                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-800 font-mono text-[11px] focus:outline-none"
                          />
                          {p.phone && (
                            <a
                              href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5 shrink-0"
                            >
                              <Phone size={12} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-2 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <input
                            type="email"
                            defaultValue={p.email || ''}
                            onBlur={(e) => handleInlineBlur(p.id, 'email', e.target.value)}
                            placeholder="partner@..."
                            className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-800 focus:outline-none text-[11px]"
                          />
                          {p.email && (
                            <a
                              href={`mailto:${p.email}`}
                              title="Send Email"
                              className="text-blue-500 hover:text-blue-700 p-0.5 shrink-0"
                            >
                              <Mail size={12} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Units */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          defaultValue={p.units_count || 0}
                          onBlur={(e) =>
                            handleInlineBlur(p.id, 'units_count', Number(e.target.value) || 0)
                          }
                          className="w-14 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1 py-0.5 focus:bg-white text-slate-800 font-semibold focus:outline-none"
                        />
                      </td>

                      {/* Notes */}
                      <td className="py-2 px-3 text-slate-500">
                        <input
                          type="text"
                          defaultValue={p.notes || ''}
                          onBlur={(e) => handleInlineBlur(p.id, 'notes', e.target.value)}
                          placeholder="Add comment..."
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 rounded px-1.5 py-0.5 focus:bg-white text-slate-700 focus:outline-none truncate"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingPartner(p)}
                            title="Full details / Edit"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>

                          {deleteConfirmId === p.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700"
                              >
                                Del
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-0.5 text-slate-400 hover:text-slate-600"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              title="Delete row"
                              className="p-1 text-slate-300 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
          <span>
            Showing {filteredPartners.length} of {partners.length} partners
          </span>
          <span className="flex items-center gap-1">
            <Info size={12} className="text-slate-400" />
            Click directly on any field or status dropdown to edit in place.
          </span>
        </div>
      </div>

      {/* Detail / Full Edit Modal */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Partner Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update partner contact and commercial details
                </p>
              </div>
              <button
                onClick={() => setEditingPartner(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPartner.first_name || ''}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, first_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Surname</label>
                  <input
                    type="text"
                    value={editingPartner.last_name || ''}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, last_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building Name</label>
                  <input
                    type="text"
                    value={editingPartner.building_name || ''}
                    onChange={(e) => handleBuildingNameChange(e.target.value, true)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location / Area</label>
                  <input
                    type="text"
                    value={editingPartner.location || ''}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, location: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institution</label>
                  <select
                    value={editingPartner.institution || 'UJ'}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, institution: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    {INSTITUTION_OPTIONS.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building Type</label>
                  <select
                    value={editingPartner.building_type || 'student_accommodation'}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, building_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {BUILDING_TYPE_OPTIONS.map((bt) => (
                      <option key={bt.value} value={bt.value}>
                        {bt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingPartner.status || 'lead'}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    {STATUS_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {PARTNER_STATUS_CONFIG[k].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Partner Type</label>
                  <select
                    value={editingPartner.partner_type || 'building_manager'}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, partner_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {PARTNER_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingPartner.phone || ''}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingPartner.email || ''}
                    onChange={(e) =>
                      setEditingPartner({ ...editingPartner, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Units Capacity</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPartner.units_count || 0}
                    onChange={(e) =>
                      setEditingPartner({
                        ...editingPartner,
                        units_count: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commission Deal / Terms</label>
                <input
                  type="text"
                  placeholder="e.g. 50% first month placement fee, R200/bed referral, etc."
                  value={editingPartner.commission_deal || ''}
                  onChange={(e) =>
                    setEditingPartner({ ...editingPartner, commission_deal: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes & Follow-ups</label>
                <textarea
                  rows={3}
                  value={editingPartner.notes || ''}
                  onChange={(e) =>
                    setEditingPartner({ ...editingPartner, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
