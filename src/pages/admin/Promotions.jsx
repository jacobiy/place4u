import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
  X
} from 'lucide-react'
import { ConfirmModal } from '../../component/AlertModal'
import FeeAmount, { FeeBreakdown } from '../../component/FeeAmount'
import {
  BASE_APPLICATION_FEE,
  buildFeeQuote,
  createPromotion,
  deletePromotion,
  isPromotionLive,
  isPromotionSchemaMissing,
  listPromotions,
  setPromotionActive,
  updatePromotion
} from '../../services/promotionService'

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  discountType: 'full',
  discountValue: 100,
  autoApply: true,
  showStrikethrough: true,
  startsAt: '',
  endsAt: '',
  maxRedemptions: '',
  isActive: false
}

const DISCOUNT_LABELS = {
  full: 'Full waiver',
  percentage: 'Percentage off',
  fixed: 'Fixed amount off'
}

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

const toInputValue = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')

function discountSummary(promotion) {
  if (!promotion) return '—'
  if (promotion.discountType === 'full') return 'Full R100 waiver'
  if (promotion.discountType === 'percentage') return `${promotion.discountValue}% off`
  return `R${Number(promotion.discountValue).toFixed(2)} off`
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listPromotions()
      setPromotions(rows)
      setSchemaMissing(false)
      setLoadError('')
    } catch (error) {
      if (isPromotionSchemaMissing(error)) {
        setSchemaMissing(true)
        setLoadError('Run database/payment_promotions_schema.sql in the Supabase SQL Editor to enable promotions.')
      } else {
        setLoadError(error?.message || 'Could not load promotions.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const activeAutoPromotion = useMemo(
    () =>
      promotions.find(
        (p) => p.isActive && p.autoApply && p.appliesTo === 'application_fee'
      ) || null,
    [promotions]
  )

  const previewPromotion = useMemo(
    () => ({
      id: 'preview',
      code: form.code ? form.code.toUpperCase() : null,
      name: form.name || 'Promotion preview',
      isActive: true,
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      appliesTo: 'application_fee',
      autoApply: Boolean(form.autoApply),
      showStrikethrough: Boolean(form.showStrikethrough),
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      redemptionCount: 0
    }),
    [form]
  )

  const previewQuote = useMemo(
    () => buildFeeQuote({ originalAmount: BASE_APPLICATION_FEE, promotion: previewPromotion }),
    [previewPromotion]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (promotion) => {
    setEditing(promotion)
    setForm({
      name: promotion.name || '',
      code: promotion.code || '',
      description: promotion.description || '',
      discountType: promotion.discountType || 'full',
      discountValue: promotion.discountValue ?? 100,
      autoApply: promotion.autoApply !== false,
      showStrikethrough: promotion.showStrikethrough !== false,
      startsAt: toInputValue(promotion.startsAt),
      endsAt: toInputValue(promotion.endsAt),
      maxRedemptions: promotion.maxRedemptions ?? '',
      isActive: Boolean(promotion.isActive)
    })
    setFormError('')
    setFormOpen(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Give the promotion a name tenants will understand.')
      return
    }
    if (form.discountType !== 'full' && Number(form.discountValue) <= 0) {
      setFormError('Enter a discount value greater than zero.')
      return
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() ? form.code.trim().toUpperCase() : null,
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      appliesTo: 'application_fee',
      autoApply: Boolean(form.autoApply),
      showStrikethrough: Boolean(form.showStrikethrough),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      isActive: Boolean(form.isActive)
    }

    setSaving(true)
    try {
      if (editing) {
        await updatePromotion(editing.id, payload)
        showToast('Promotion updated.')
      } else {
        await createPromotion(payload)
        showToast('Promotion created.')
      }
      setFormOpen(false)
      await load()
    } catch (error) {
      if (error?.code === '23505') {
        setFormError(
          'Another auto-applied promotion is already live. Turn that one off first, or give this one a code.'
        )
      } else {
        setFormError(error?.message || 'Could not save the promotion.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (promotion) => {
    setBusyId(promotion.id)
    try {
      await setPromotionActive(promotion.id, !promotion.isActive)
      showToast(promotion.isActive ? 'Promotion paused.' : 'Promotion is live.')
      await load()
    } catch (error) {
      if (error?.code === '23505') {
        showToast('Another auto-applied promotion is already live.', 'error')
      } else {
        showToast(error?.message || 'Could not update the promotion.', 'error')
      }
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setBusyId(deleting.id)
    try {
      await deletePromotion(deleting.id)
      showToast('Promotion deleted.')
      setDeleting(null)
      await load()
    } catch (error) {
      showToast(error?.message || 'Could not delete the promotion.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          )}
          <span className="text-xs font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F1E35] via-[#132847] to-[#1A365D] rounded-2xl p-6 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles size={11} className="text-amber-300" />
                Fee promotions
              </span>
              <span className="text-slate-400 text-xs">Place4U application revenue</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Promotions & Fee Waivers</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Turn a promotion on and every screen quotes the normal R100 struck through in red with{' '}
              <strong className="text-white">FREE</strong> beside it. The payment trigger recomputes the
              discount server-side, so the invoice line and the stored amount always match.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus size={14} />
              New promotion
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              to="/admin/payments"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <CreditCard size={13} />
              Payments desk
            </Link>
          </div>
        </div>
      </div>

      {(schemaMissing || loadError) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Current status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Live auto-applied</span>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {activeAutoPromotion ? activeAutoPromotion.name : 'None'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeAutoPromotion
              ? `Every application now costs ${discountSummary(activeAutoPromotion).toLowerCase()}`
              : 'Tenants pay the normal R100 application fee'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Tenant sees</span>
          <div className="mt-2">
            <FeeAmount
              quote={buildFeeQuote({ promotion: activeAutoPromotion })}
              size="lg"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Checkout, application form, dashboard & receipts</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Rules</span>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            One live no-code promotion per payment type. Coded campaigns can run alongside it and are
            redeemed when a tenant supplies the code.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag size={15} className="text-blue-600" />
              All promotions
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {promotions.length} campaign{promotions.length === 1 ? '' : 's'} configured
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading promotions…</div>
        ) : promotions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Percent size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-900">No promotions yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Create one to waive or discount the application fee. Nothing changes for tenants until it is live.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {promotions.map((promotion) => {
              const live = isPromotionLive(promotion)
              const quote = buildFeeQuote({ promotion })
              return (
                <div key={promotion.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{promotion.name}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          live
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {live ? 'Live' : promotion.isActive ? 'Scheduled' : 'Paused'}
                      </span>
                      {promotion.code && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                          {promotion.code}
                        </span>
                      )}
                      {promotion.autoApply && !promotion.code && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          Auto-applied
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{promotion.description || 'No description'}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600">{discountSummary(promotion)}</span>
                      {fmtDate(promotion.startsAt) && <span>Starts {fmtDate(promotion.startsAt)}</span>}
                      {fmtDate(promotion.endsAt) && <span>Ends {fmtDate(promotion.endsAt)}</span>}
                      <span>
                        {promotion.redemptionCount}
                        {promotion.maxRedemptions ? ` / ${promotion.maxRedemptions}` : ''} redeemed
                      </span>
                    </div>
                  </div>

                  <div className="lg:w-56 shrink-0">
                    <FeeAmount quote={quote} size="sm" />
                    <FeeBreakdown quote={quote} dense className="mt-2" />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(promotion)}
                      disabled={busyId === promotion.id}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        promotion.isActive
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      } disabled:opacity-50`}
                    >
                      {promotion.isActive ? 'Pause' : 'Turn on'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(promotion)}
                      className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                      title="Edit promotion"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(promotion)}
                      className="w-8 h-8 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                      title="Delete promotion"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editing ? 'Edit promotion' : 'New promotion'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Applies to the Place4U application screening fee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">Name</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Free application week"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    required
                  />
                </label>

                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">Code (optional)</span>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Leave blank to apply automatically"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono uppercase text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </label>
              </div>

              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Explain the offer to tenants."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">Discount</span>
                  <select
                    value={form.discountType}
                    onChange={(e) => {
                      const discountType = e.target.value
                      setForm({
                        ...form,
                        discountType,
                        discountValue: discountType === 'full' ? 100 : form.discountValue
                      })
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    {Object.entries(DISCOUNT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">
                    {form.discountType === 'percentage'
                      ? 'Percentage off'
                      : form.discountType === 'fixed'
                        ? 'Amount off (ZAR)'
                        : 'Value'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={form.discountType === 'full'}
                    value={form.discountType === 'full' ? 100 : form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">Starts (optional)</span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">Ends (optional)</span>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs">
                  <span className="font-semibold text-slate-700">Maximum redemptions (optional)</span>
                  <input
                    type="number"
                    min="1"
                    value={form.maxRedemptions}
                    onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </label>
                <div className="space-y-2 pt-5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.autoApply}
                      onChange={(e) => setForm({ ...form, autoApply: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    Apply automatically when live
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.showStrikethrough}
                      onChange={(e) => setForm({ ...form, showStrikethrough: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    Show the struck-through original amount
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tenant preview
                </span>
                <div className="mt-2">
                  <FeeBreakdown quote={previewQuote} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Make this promotion live
                {form.isActive && form.autoApply && !form.code && activeAutoPromotion && editing?.id !== activeAutoPromotion.id && (
                  <span className="text-[10px] font-normal text-amber-700">
                    (another auto-applied promotion is live — save will fail until it is paused)
                  </span>
                )}
              </label>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create promotion'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleting)}
        title="Delete promotion?"
        message={
          deleting
            ? `"${deleting.name}" will be removed. Payments already recorded keep their promotion history.`
            : ''
        }
        confirmText="Delete promotion"
        cancelText="Keep it"
        type="danger"
        isLoading={Boolean(deleting && busyId === deleting.id)}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
