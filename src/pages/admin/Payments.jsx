import React, { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  Download,
  FileCheck2,
  Send,
  X,
  Undo2,
  Percent,
  Plus
} from 'lucide-react'
import {
  getAdminApplications,
  getAgentsList,
  formatCurrency,
  formatDate,
  openEmailClient,
  approveApplicationCompletion
} from './db/queries'
import { broadcastApplicationUpdate } from '../../services/applicationSync'

import {
  APPLICATION_FEE,
  AGENT_SHARE_AMOUNT,
  getAllAgentBalances,
  getPayoutRequests,
  getApplicationFeePayments,
  processPayout,
  adminDirectPayout,
  refundApplicationFee,
  subscribeToWalletChanges
} from '../../services/walletService'

// Business Model (enforced server-side in database/agent_wallet_ledger.sql):
// Tenant pays R100 -> attached to the application. The assigned agent earns 50% (R50.00) per
// application that is completed, paid and not refunded. Refunds automatically remove the share.
// Agents request withdrawals; the admin approves / pays / rejects them here.

const fmtFull = (iso) =>
  new Date(iso || Date.now()).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [agents, setAgents] = useState([])
  const [balances, setBalances] = useState([])
  const [payoutRequests, setPayoutRequests] = useState([])
  const [feePayments, setFeePayments] = useState([])
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('requests') // 'requests' | 'agents' | 'refunds' | 'ledger'
  const [agentViewMode, setAgentViewMode] = useState('files') // 'files' | 'summary'
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  // Modals state
  const [refundModalItem, setRefundModalItem] = useState(null)
  const [requestModal, setRequestModal] = useState(null) // { req, action: 'approve' | 'pay' | 'reject' }
  const [isCustomPayoutModalOpen, setIsCustomPayoutModalOpen] = useState(false)

  // Form states for modals
  const [refundAmount, setRefundAmount] = useState('100')
  const [refundReason, setRefundReason] = useState('Application expired without placement')
  const [refundMethod, setRefundMethod] = useState('Original Card / Electronic Transfer')

  const [payoutBankRef, setPayoutBankRef] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('EFT Direct Wire (FNB / Standard Bank / Capitec)')
  const [payoutNotes, setPayoutNotes] = useState('')

  // Custom payout form state
  const [customAgentId, setCustomAgentId] = useState('')
  const [customAppCount, setCustomAppCount] = useState(1)
  const [customPayoutAmount, setCustomPayoutAmount] = useState('50')
  const [customPayoutBankRef, setCustomPayoutBankRef] = useState('')
  const [customPayoutMethod, setCustomPayoutMethod] = useState('EFT Direct Wire (FNB / Standard Bank / Capitec)')
  const [customPayoutDescription, setCustomPayoutDescription] = useState('50% fee split for processed applications')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // Load live data from Supabase (single source of truth shared with Agent Wallet)
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [apps, ags] = await Promise.all([getAdminApplications(), getAgentsList()])
      setApplications(apps || [])
      setAgents(ags || [])
      try {
        const [bals, reqs, pays] = await Promise.all([
          getAllAgentBalances(),
          getPayoutRequests(),
          getApplicationFeePayments()
        ])
        setBalances(bals)
        setPayoutRequests(reqs)
        setFeePayments(pays)
        setLoadError('')
      } catch (err) {
        console.warn('Wallet ledger load failed:', err?.message || err)
        setLoadError('Wallet ledger not available. Run database/agent_wallet_ledger.sql in Supabase.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Live: tenant payments, application changes and agent requests update this page instantly
    const unsubscribe = subscribeToWalletChanges(() => fetchData(true))
    return unsubscribe
  }, [])

  const balanceByAgent = useMemo(() => new Map(balances.map((b) => [b.agentId, b])), [balances])
  const paymentByApp = useMemo(() => {
    const map = new Map()
    feePayments.forEach((p) => {
      if (!p.application_id) return
      const prev = map.get(p.application_id)
      if (!prev || new Date(p.created_at) > new Date(prev.created_at)) map.set(p.application_id, p)
    })
    return map
  }, [feePayments])

  // Tenant fee payments + refund state per application
  const refundItems = useMemo(() => {
    return applications.map((app) => {
      const pay = paymentByApp.get(app.id)
      const feePaid = app.fee_paid === true || pay?.status === 'completed' || pay?.status === 'refunded'
      const isRefunded = app.fee_refunded === true || pay?.status === 'refunded'
      const areas = Array.isArray(app.preferred_areas) ? app.preferred_areas.join(', ') : 'Metro Area'
      const isEligible = app.status === 'expired' || app.status === 'submitted'

      return {
        id: app.id,
        key: `refund_${app.id}`,
        tenantName: app.tenant?.full_name || 'Resident Tenant',
        tenantEmail: app.tenant?.email || '',
        tenantPhone: app.tenant?.phone || 'No phone',
        areas,
        budget: `${formatCurrency(app.min_budget)} - ${formatCurrency(app.max_budget)}`,
        appStatus: app.status || 'submitted',
        feePaid: feePaid ? Number(app.fee_amount) || APPLICATION_FEE : 0,
        canRefund: feePaid && !isRefunded && pay?.status === 'completed',
        receipt: pay?.receipt_number || app.fee_receipt || null,
        currency: 'ZAR',
        submittedAt: app.submitted_at,
        isRefunded,
        refundRecord: isRefunded
          ? {
              id: pay?.refund_reference || app.refund_reference || 'REF',
              amount: Number(pay?.refund_amount) || APPLICATION_FEE,
              method: pay?.refund_method || 'Original Card / Electronic Transfer'
            }
          : null,
        status: isRefunded ? 'Refunded' : !feePaid ? 'Fee Unpaid' : isEligible ? 'Eligible for Refund' : 'Active File'
      }
    })
  }, [applications, paymentByApp])

  // Per-application agent share rows (informational: payouts are pooled per agent)
  const agentPayoutItems = useMemo(() => {
    const assignedApps = applications.filter((a) => !!a.assigned_to)

    // FIFO allocation of each agent's paid-out money across their earning files
    const releasedIds = new Set()
    const byAgent = new Map()
    assignedApps.forEach((a) => {
      const list = byAgent.get(a.assigned_to) || []
      list.push(a)
      byAgent.set(a.assigned_to, list)
    })
    byAgent.forEach((list, agentId) => {
      let covered = Math.floor((balanceByAgent.get(agentId)?.paidOut || 0) / AGENT_SHARE_AMOUNT)
      list
        .filter((a) => a.fee_paid && !a.fee_refunded && a.status === 'completed')
        .sort((x, y) => new Date(x.submitted_at || 0) - new Date(y.submitted_at || 0))
        .forEach((a) => {
          if (covered > 0) { releasedIds.add(a.id); covered -= 1 }
        })
    })

    return assignedApps.map((app) => {
      const agent = app.agent || agents.find((ag) => ag.id === app.assigned_to)
      const feePaid = app.fee_paid === true
      const refunded = app.fee_refunded === true
      const earns = feePaid && !refunded && app.status === 'completed'
      const isCompletionRequested = Boolean(app.completion_requested_at && app.status !== 'completed')

      let status = 'Pending Placement'
      if (refunded) status = 'Refunded'
      else if (!feePaid) status = 'Awaiting Tenant Payment'
      else if (releasedIds.has(app.id)) status = 'Released'
      else if (earns) status = 'Approved for Release'
      else if (isCompletionRequested) status = 'Completion Review Requested'

      return {
        id: app.id,
        key: `payout_app_${app.id}`,
        type: 'Application File (50% Split)',
        agentId: app.assigned_to,
        agentName: agent?.full_name || 'Assigned Agent',
        agentEmail: agent?.email || '',
        agentPhone: agent?.phone || '',
        tenantName: app.tenant?.full_name || 'Tenant',
        areas: Array.isArray(app.preferred_areas) ? app.preferred_areas.join(', ') : 'Metro',
        feeCollected: feePaid && !refunded ? Number(app.fee_amount) || APPLICATION_FEE : 0,
        agentShareAmount: earns ? AGENT_SHARE_AMOUNT : 0,
        status,
        appStatus: app.status,
        completionRequestedAt: app.completion_requested_at,
        completionRequestNote: app.completion_request_note,
        submittedAt: app.submitted_at,
        payoutRecord: null
      }
    })
  }, [applications, agents, balanceByAgent])

  // Summary per Agent straight from the database balance view
  const agentSummaryItems = useMemo(() => {
    return agents.map((agent) => {
      const b = balanceByAgent.get(agent.id)
      return {
        agentId: agent.id,
        agentName: agent.full_name || 'Agent',
        agentEmail: agent.email,
        agentPhone: agent.phone || 'No phone',
        assignedCount: b?.assignedCount || 0,
        completedCount: b?.completedCount || 0,
        refundedCount: b?.refundedCount || 0,
        totalFeeCollected: (b?.paidCount || 0) * APPLICATION_FEE,
        totalShareAccrued: b?.earned || 0,
        totalPaid: b?.paidOut || 0,
        reserved: b?.reserved || 0,
        balanceDue: Math.max(0, b?.available || 0),
        shortfall: Math.max(0, -(b?.available || 0)),
        hasPending: (b?.available || 0) > 0
      }
    })
  }, [agents, balanceByAgent])

  // Withdrawal request queue
  const openRequests = useMemo(
    () => payoutRequests.filter((r) => r.status === 'pending' || r.status === 'approved'),
    [payoutRequests]
  )
  const pendingRequestsCount = openRequests.length
  const openRequestsAmount = openRequests.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const filteredRequests = useMemo(() => {
    return payoutRequests.filter((r) => {
      const text = `${r.agent?.full_name || ''} ${r.agent?.email || ''} ${r.reference || ''} ${r.status}`.toLowerCase()
      return !searchQuery.trim() || text.includes(searchQuery.toLowerCase())
    })
  }, [payoutRequests, searchQuery])

  // Consolidated audit ledger: settled agent payouts + tenant refunds
  const releasedAuditLedger = useMemo(() => {
    const payouts = payoutRequests
      .filter((r) => r.status === 'paid')
      .map((r) => ({
        id: r.reference || `PAY-${String(r.id).slice(0, 8)}`,
        type: 'Agent 50% Fee Share',
        beneficiary: r.agent?.full_name || 'Agent',
        beneficiaryEmail: r.agent?.email || '',
        amount: Number(r.amount) || 0,
        currency: 'ZAR',
        method: r.method || 'EFT Direct Wire',
        reason: r.admin_note || r.agent_note || (r.source === 'admin_direct' ? 'Admin direct payout' : 'Agent withdrawal request'),
        status: 'Released',
        date: r.processed_at || r.requested_at,
        formattedDate: fmtFull(r.processed_at || r.requested_at)
      }))
    const refunds = feePayments
      .filter((p) => p.status === 'refunded')
      .map((p) => {
        const app = applications.find((a) => a.id === p.application_id)
        return {
          id: p.refund_reference || `REF-${String(p.id).slice(0, 8)}`,
          type: 'Tenant Refund',
          beneficiary: app?.tenant?.full_name || 'Tenant',
          beneficiaryEmail: app?.tenant?.email || '',
          amount: Number(p.refund_amount) || Number(p.amount) || 0,
          currency: 'ZAR',
          method: p.refund_method || 'Original Card / Electronic Transfer',
          reason: p.refund_reason || 'Application fee refund',
          status: 'Refunded',
          date: p.refunded_at || p.created_at,
          formattedDate: fmtFull(p.refunded_at || p.created_at)
        }
      })
    return [...payouts, ...refunds].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [payoutRequests, feePayments, applications])

  // KPI calculations
  const totalRefundedAmount = useMemo(
    () => releasedAuditLedger.filter((r) => r.type === 'Tenant Refund').reduce((s, r) => s + r.amount, 0),
    [releasedAuditLedger]
  )
  const totalAgentPayoutsAmount = useMemo(
    () => releasedAuditLedger.filter((r) => r.type !== 'Tenant Refund').reduce((s, r) => s + r.amount, 0),
    [releasedAuditLedger]
  )
  const grossApplicationFeesCollected = useMemo(
    () => feePayments.filter((p) => p.status === 'completed').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [feePayments]
  )
  const totalAgentSharesAccrued = useMemo(() => balances.reduce((s, b) => s + b.earned, 0), [balances])
  const totalCompletedFiles = useMemo(() => balances.reduce((s, b) => s + b.completedCount, 0), [balances])

  const pendingRefundsCount = refundItems.filter((i) => i.status === 'Eligible for Refund' && i.canRefund).length

  // Filtered lists based on search query
  const filteredRefunds = useMemo(() => {
    return refundItems.filter((item) => {
      const text = `${item.tenantName} ${item.tenantEmail} ${item.id} ${item.areas}`.toLowerCase()
      return !searchQuery.trim() || text.includes(searchQuery.toLowerCase())
    })
  }, [refundItems, searchQuery])

  const filteredAgentPayouts = useMemo(() => {
    return agentPayoutItems.filter((item) => {
      const text = `${item.agentName} ${item.agentEmail} ${item.tenantName} ${item.areas}`.toLowerCase()
      return !searchQuery.trim() || text.includes(searchQuery.toLowerCase())
    })
  }, [agentPayoutItems, searchQuery])

  const filteredAgentSummaries = useMemo(() => {
    return agentSummaryItems.filter((ag) => {
      const text = `${ag.agentName} ${ag.agentEmail} ${ag.agentPhone}`.toLowerCase()
      return !searchQuery.trim() || text.includes(searchQuery.toLowerCase())
    })
  }, [agentSummaryItems, searchQuery])

  // Handler: Release Tenant Refund (removes the agent's R50 for that file automatically)
  const handleExecuteRefund = async () => {
    if (!refundModalItem || busy) return
    setBusy(true)
    try {
      const pay = await refundApplicationFee({
        applicationId: refundModalItem.id,
        amount: Number(refundAmount) || APPLICATION_FEE,
        reason: refundReason,
        method: refundMethod
      })
      const refNumber = pay?.refund_reference || 'REF'
      showToast(`Refund of R${Number(refundAmount) || APPLICATION_FEE}.00 released to ${refundModalItem.tenantName} (Ref: ${refNumber}).`)
      const target = refundModalItem
      setRefundModalItem(null)
      await fetchData(true)

      openEmailClient(
        target.tenantEmail,
        `Place4U Application Fee Refund Remittance [${refNumber}]`,
        `Hi ${target.tenantName},\n\nYour application fee refund of R${Number(refundAmount) || APPLICATION_FEE}.00 has been successfully processed.\n\n• Reference: ${refNumber}\n• Method: ${refundMethod}\n• Details: Full refund of tenant application assistance fee.\n\nThank you for using Place4U.\n\nPlace4U Administration`
      )
    } catch (err) {
      showToast(err?.message || 'Refund failed.')
    } finally {
      setBusy(false)
    }
  }

  // Handler: Admin approves agent completion request, unlocking agent 50% split (R50.00)
  const handleApproveCompletion = async (appId) => {
    if (busy) return
    setBusy(true)
    try {
      await approveApplicationCompletion(appId)
      const nowIso = new Date().toISOString()
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId
            ? { ...app, status: 'completed', completion_approved_at: nowIso }
            : app
        )
      )
      broadcastApplicationUpdate(appId, 'completed', { completion_approved_at: nowIso })
      showToast('Application marked Completed! Agent 50% commission (R50.00) is now unlocked.')
      await fetchData(true)
    } catch (err) {
      showToast(`Failed to approve completion: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  // Handler: approve / pay / reject an agent's withdrawal request
  const handleExecuteRequestAction = async () => {
    if (!requestModal || busy) return
    const { req, action } = requestModal
    setBusy(true)
    try {
      const row = await processPayout(req.id, action, {
        reference: payoutBankRef.trim(),
        method: payoutMethod,
        note: payoutNotes
      })
      const label = { approve: 'approved', pay: 'marked as paid', reject: 'rejected' }[action]
      showToast(`Withdrawal of R${Number(req.amount).toLocaleString()}.00 for ${req.agent?.full_name || 'agent'} ${label}.`)
      setRequestModal(null)
      await fetchData(true)

      if (action === 'pay') {
        openEmailClient(
          req.agent?.email,
          `Place4U Payout Remittance [${row?.reference || ''}]`,
          `Hi ${req.agent?.full_name || 'Agent'},\n\nYour withdrawal of R${Number(req.amount).toLocaleString()}.00 has been paid to your registered account.\n\n• Reference: ${row?.reference}\n• Method: ${payoutMethod}\n\nThank you for partnering with Place4U.\n\nPlace4U Administration`
        )
      }
    } catch (err) {
      showToast(err?.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  // Handler: Execute direct payout (validated against the agent's real available balance)
  const handleExecuteCustomPayout = async (e) => {
    e.preventDefault()
    if (!customAgentId) {
      alert('Please select an agent to disburse payment to.')
      return
    }
    const targetAgent = agents.find((a) => a.id === customAgentId)
    if (!targetAgent || busy) return
    setBusy(true)
    try {
      const row = await adminDirectPayout({
        agentId: customAgentId,
        amount: Number(customPayoutAmount),
        reference: customPayoutBankRef.trim(),
        method: customPayoutMethod,
        note: customPayoutDescription || `50% Fee Split Payout (${customAppCount} applications)`
      })
      showToast(`Payment of R${Number(customPayoutAmount).toLocaleString()}.00 released to agent ${targetAgent.full_name}.`)
      setIsCustomPayoutModalOpen(false)
      await fetchData(true)

      openEmailClient(
        targetAgent.email,
        `Place4U 50% Fee Split Remittance [${row?.reference || ''}]`,
        `Hi ${targetAgent.full_name},\n\nYour 50% application fee share payout of R${Number(customPayoutAmount).toLocaleString()}.00 has been released to your account.\n\n• Reference: ${row?.reference}\n• Method: ${customPayoutMethod}\n• Description: ${customPayoutDescription}\n\nPlace4U Administration`
      )
    } catch (err) {
      showToast(err?.message || 'Payout failed.')
    } finally {
      setBusy(false)
    }
  }

  // Handler: Export CSV of releases
  const handleExportCSV = () => {
    const rows = releasedAuditLedger.map((r) => [
      r.id,
      `"${r.beneficiary}"`,
      r.beneficiaryEmail,
      r.type,
      r.amount,
      r.currency,
      r.method,
      `"${r.reason}"`,
      r.status,
      r.formattedDate
    ])

    const header = ['Release Ref', 'Beneficiary', 'Email', 'Type', 'Amount', 'Currency', 'Method', 'Reason', 'Status', 'Date']
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Place4U_Payment_Releases_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Releases ledger CSV exported.')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F1E35] via-[#132847] to-[#1A365D] rounded-2xl p-6 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Percent size={11} className="text-emerald-400" />
                50% Fee Split Protocol Active
              </span>
              <span className="text-slate-400 text-xs">Place4U Financial Disbursals</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Payment Releases & 50% Agent Fee Split</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Place4U collects the R100 tenant application assistance fee and pays <strong>50% (R50.00)</strong> of our payment to the processing agent. Authorize agent payouts, process full tenant refunds, and maintain audit records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setCustomAgentId(agents[0]?.id || '')
                setCustomAppCount(1)
                setCustomPayoutAmount(String(AGENT_SHARE_AMOUNT))
                setCustomPayoutBankRef(`EFT-P4U-AG-${Date.now().toString().slice(-6)}`)
                setIsCustomPayoutModalOpen(true)
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Release Agent Payment
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Sync Live Records
            </button>

            {releasedAuditLedger.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download size={13} />
                Export Ledger
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Command Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Released to Agents */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Paid to Agents (50% Split)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(totalAgentPayoutsAmount)}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            50% fee split payouts disbursed
          </div>
        </div>

        {/* Metric 2: Released as Refunds */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Refunded to Tenants</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Undo2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(totalRefundedAmount)}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            Full 100% application fee remissions
          </div>
        </div>

        {/* Metric 3: Total Accrued 50% Shares */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Agent Share Accrued</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-700 font-mono">
            {formatCurrency(totalAgentSharesAccrued)}
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            R50.00 × {totalCompletedFiles} completed &amp; paid files (refunds excluded)
          </div>
        </div>

        {/* Metric 4: Pending Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Pending Releases Queue</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {pendingRequestsCount} <span className="text-xs font-normal text-slate-400">requests</span>
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            {formatCurrency(openRequestsAmount)} awaiting · {pendingRefundsCount} tenant refunds eligible
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-3">
          {loadError}
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send size={13} className="text-amber-600" />
              Withdrawal Requests
              {pendingRequestsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] leading-none">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={13} className="text-emerald-600" />
              Agent 50% Fee Share ({agentPayoutItems.length})
            </button>

            <button
              onClick={() => setActiveTab('refunds')}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'refunds'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Undo2 size={13} className="text-blue-600" />
              Tenant Fee Refunds ({refundItems.length})
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 size={13} className="text-purple-600" />
              Release Audit Trail ({releasedAuditLedger.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search beneficiary, email, ref…"
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 w-60 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* TAB 1: AGENT 50% FEE SHARE PAYOUTS */}
        {activeTab === 'agents' && (
          <div>
            {/* View sub-toggle: Files vs Agent Summaries */}
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Display View:</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setAgentViewMode('files')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      agentViewMode === 'files'
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per-Application Files (R50.00 each)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentViewMode('summary')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      agentViewMode === 'summary'
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Agent Ledger & Balances ({agentSummaryItems.length})
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Application Fee: <strong>R100</strong> → Agent Split (50%): <strong>R50.00</strong></span>
              </div>
            </div>

            {agentViewMode === 'files' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="text-left px-5 py-3">Assigned Agent</th>
                      <th className="text-left px-4 py-3">Tenant Application File</th>
                      <th className="text-left px-4 py-3">Platform Fee Collected</th>
                      <th className="text-left px-4 py-3">Agent 50% Share</th>
                      <th className="text-left px-4 py-3">Disbursement Status</th>
                      <th className="text-right px-5 py-3">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAgentPayouts.length > 0 ? (
                      filteredAgentPayouts.map((item) => {
                        const isPaid = item.status === 'Released'

                        return (
                          <tr key={item.key} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-slate-900">{item.agentName}</p>
                              <p className="text-[10px] text-slate-400">{item.agentEmail || item.agentPhone}</p>
                            </td>

                            <td className="px-4 py-3.5">
                              <p className="font-medium text-slate-800">{item.tenantName}</p>
                              <span className="text-[10px] font-mono text-slate-400">
                                File ID: {item.id.slice(0, 8)}… • {item.areas}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 font-mono text-slate-600">
                              {formatCurrency(item.feeCollected)}
                              <span className="text-[10px] text-slate-400 block">Gross platform fee</span>
                            </td>

                            <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                              {formatCurrency(item.agentShareAmount)}
                              <span className="text-[10px] text-emerald-600/80 font-normal block font-sans">
                                50% of payment
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.status === 'Approved for Release'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : item.status === 'Completion Review Requested'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : item.status === 'Pending Placement'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {isPaid
                                  ? '✓ Disbursed / Paid'
                                  : item.status === 'Approved for Release'
                                  ? 'Ready for Disbursal'
                                  : item.status === 'Completion Review Requested'
                                  ? '🕒 Completion Requested'
                                  : item.status === 'Pending Placement'
                                  ? 'Active File (In Progress)'
                                  : item.status}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isPaid ? (
                                  <button
                                    onClick={() =>
                                      openEmailClient(
                                        item.agentEmail,
                                        `Place4U 50% Fee Split Remittance [${item.payoutRecord?.id || 'EFT'}]`,
                                        `Hi ${item.agentName},\n\nYour 50% application payment share payout of R${item.payoutRecord?.amount?.toLocaleString() || item.agentShareAmount}.00 for processing application ${item.id.slice(0, 8)} (${item.tenantName}) has been disbursed.\n\n• Reference: ${item.payoutRecord?.id}\n• Channel: ${item.payoutRecord?.method}\n\nPlace4U Administration`
                                      )
                                    }
                                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                    title="Email remittance advice"
                                  >
                                    <Mail size={12} className="text-red-500" />
                                    Remittance
                                  </button>
                                ) : item.status === 'Completion Review Requested' ? (
                                  <div className="flex flex-col items-end gap-1">
                                    {item.completionRequestNote && (
                                      <span
                                        className="text-[10px] text-slate-500 italic max-w-[150px] truncate"
                                        title={item.completionRequestNote}
                                      >
                                        &ldquo;{item.completionRequestNote}&rdquo;
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleApproveCompletion(item.id)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <CheckCircle2 size={12} />
                                      Approve Completed
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    {item.status === 'Refunded'
                                      ? 'Fee refunded - share removed'
                                      : item.status === 'Awaiting Tenant Payment'
                                      ? 'Tenant has not paid'
                                      : item.status === 'Approved for Release'
                                      ? 'Counted in agent balance'
                                      : 'Counts once completed'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          No assigned application files match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Agent Summary Ledger View */
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="text-left px-5 py-3">Agent</th>
                      <th className="text-left px-4 py-3">Files Assigned</th>
                      <th className="text-left px-4 py-3">Total Fees Collected</th>
                      <th className="text-left px-4 py-3">Total 50% Share Accrued</th>
                      <th className="text-left px-4 py-3">Disbursed to Date</th>
                      <th className="text-left px-4 py-3">Balance Due</th>
                      <th className="text-right px-5 py-3">Disbursement Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAgentSummaries.length > 0 ? (
                      filteredAgentSummaries.map((ag) => (
                        <tr key={ag.agentId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-900">{ag.agentName}</p>
                            <p className="text-[10px] text-slate-400">{ag.agentEmail}</p>
                          </td>

                          <td className="px-4 py-3.5 font-medium text-slate-800">
                            {ag.assignedCount} {ag.assignedCount === 1 ? 'file' : 'files'}
                            <span className="text-[10px] text-slate-400 block">
                              {ag.completedCount} completed
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-600">
                            {formatCurrency(ag.totalFeeCollected)}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                            {formatCurrency(ag.totalShareAccrued)}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-emerald-700">
                            {formatCurrency(ag.totalPaid)}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold">
                            <span className={ag.balanceDue > 0 ? 'text-amber-700' : 'text-slate-400'}>
                              {formatCurrency(ag.balanceDue)}
                            </span>
                            {ag.reserved > 0 && (
                              <span className="block text-[10px] font-sans font-normal text-blue-600">
                                {formatCurrency(ag.reserved)} in open requests
                              </span>
                            )}
                            {ag.shortfall > 0 && (
                              <span className="block text-[10px] font-sans font-normal text-red-600">
                                Owes {formatCurrency(ag.shortfall)} (refund after payout)
                              </span>
                            )}
                            {ag.refundedCount > 0 && (
                              <span className="block text-[10px] font-sans font-normal text-slate-400">
                                {ag.refundedCount} refunded file{ag.refundedCount > 1 ? 's' : ''} excluded
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {ag.balanceDue > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomAgentId(ag.agentId)
                                    setCustomAppCount(ag.assignedCount || 1)
                                    setCustomPayoutAmount(String(ag.balanceDue))
                                    setCustomPayoutBankRef(`EFT-P4U-AG-${Date.now().toString().slice(-6)}`)
                                    setCustomPayoutDescription(`50% fee split settlement for ${ag.agentName} (${ag.assignedCount} files)`)
                                    setIsCustomPayoutModalOpen(true)
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer"
                                >
                                  Disburse R{ag.balanceDue}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEmailClient(
                                      ag.agentEmail,
                                      `Place4U Payment Statement for ${ag.agentName}`,
                                      `Hi ${ag.agentName},\n\nAll 50% application payment share settlements on your Place4U account are currently up to date.\nTotal disbursed: R${ag.totalPaid.toLocaleString()}.00\n\nPlace4U Administration`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Mail size={12} className="text-slate-400" />
                                  Send Statement
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                          No registered agents match search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 0: AGENT WITHDRAWAL REQUESTS (live from agent wallets) */}
        {activeTab === 'requests' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="text-left px-5 py-3">Agent</th>
                  <th className="text-left px-4 py-3">Requested</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Bank Destination</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-5 py-3">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => {
                    const statusStyle = {
                      pending: 'bg-amber-50 text-amber-700 border-amber-200',
                      approved: 'bg-blue-50 text-blue-700 border-blue-200',
                      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      rejected: 'bg-red-50 text-red-700 border-red-200'
                    }[req.status]
                    const bal = balanceByAgent.get(req.agent_id)
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{req.agent?.full_name || 'Agent'}</p>
                          <p className="text-[10px] text-slate-400">{req.agent?.email}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {fmtFull(req.requested_at)}
                          <span className="block text-[10px] text-slate-400">
                            {req.source === 'admin_direct' ? 'Admin direct payout' : 'Agent request'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          {formatCurrency(req.amount)}
                          {bal && (req.status === 'pending' || req.status === 'approved') && (
                            <span className="block text-[10px] font-sans font-normal text-slate-400">
                              Agent available after: {formatCurrency(bal.available)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {req.bank_details?.bankName || '—'}
                          <span className="block text-[10px] font-mono text-slate-400">
                            {req.bank_details?.accountNumber ? `Acc ${req.bank_details.accountNumber}` : ''}
                            {req.bank_details?.branchCode ? ` · Br ${req.bank_details.branchCode}` : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusStyle}`}>
                            {req.status}
                          </span>
                          {req.reference && (
                            <span className="block text-[10px] font-mono text-slate-400 mt-0.5">{req.reference}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setRequestModal({ req, action: 'approve' })
                                  setPayoutNotes('')
                                }}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {(req.status === 'pending' || req.status === 'approved') && (
                              <>
                                <button
                                  onClick={() => {
                                    setRequestModal({ req, action: 'pay' })
                                    setPayoutBankRef(`EFT-P4U-AG-${Date.now().toString().slice(-6)}`)
                                    setPayoutNotes('')
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                                <button
                                  onClick={() => {
                                    setRequestModal({ req, action: 'reject' })
                                    setPayoutNotes('')
                                  }}
                                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-red-600 font-semibold text-[11px] cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {(req.status === 'paid' || req.status === 'rejected') && (
                              <span className="text-[10px] text-slate-400">
                                {req.processed_at ? fmtFull(req.processed_at) : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      No withdrawal requests yet. When an agent clicks Request Withdrawal in their wallet it appears here instantly.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: TENANT APPLICATION REFUNDS (100%) */}
        {activeTab === 'refunds' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="text-left px-5 py-3">Application ID</th>
                  <th className="text-left px-4 py-3">Tenant Beneficiary</th>
                  <th className="text-left px-4 py-3">Target Preferred Area</th>
                  <th className="text-left px-4 py-3">Application State</th>
                  <th className="text-left px-4 py-3">Assistance Fee Paid</th>
                  <th className="text-left px-4 py-3">Refund Status</th>
                  <th className="text-right px-5 py-3">Admin Release Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRefunds.length > 0 ? (
                  filteredRefunds.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-blue-600">
                        <div>{item.id.slice(0, 8)}…</div>
                        <span className="text-[10px] text-slate-400">{formatDate(item.submittedAt)}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{item.tenantName}</p>
                        <p className="text-[10px] text-slate-400">{item.tenantEmail} · {item.tenantPhone}</p>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {item.areas}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          item.appStatus === 'expired'
                            ? 'bg-amber-50 text-amber-700'
                            : item.appStatus === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.appStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        R{item.feePaid}.00
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.isRefunded
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.isRefunded ? '✓ Refunded' : 'Eligible for Refund'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.isRefunded ? (
                            <button
                              onClick={() =>
                                openEmailClient(
                                  item.tenantEmail,
                                  `Place4U Application Fee Refund Receipt: ${item.refundRecord?.id || 'REF'}`,
                                  `Hi ${item.tenantName},\n\nYour application fee refund of R${item.refundRecord?.amount || 100}.00 has been released.\nReference: ${item.refundRecord?.id}\nMethod: ${item.refundRecord?.method}\n\nPlace4U Admin`
                                )
                              }
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              title="Email remittance receipt"
                            >
                              <Mail size={12} className="text-red-500" />
                              Receipt
                            </button>
                          ) : (
                            <button
                              disabled={!item.canRefund || busy}
                              onClick={() => {
                                setRefundModalItem(item)
                                setRefundAmount(String(item.feePaid || 100))
                              }}
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title={item.canRefund ? 'Refund the tenant and remove the agent share for this file' : 'No completed fee payment to refund'}
                            >
                              Release R100 Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                      No tenant application refund records match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CONSOLIDATED AUDIT LEDGER */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="text-left px-5 py-3">Release Ref ID</th>
                  <th className="text-left px-4 py-3">Beneficiary</th>
                  <th className="text-left px-4 py-3">Classification</th>
                  <th className="text-left px-4 py-3">Disbursed Amount</th>
                  <th className="text-left px-4 py-3">Settlement Rail</th>
                  <th className="text-left px-4 py-3">Reason / Details</th>
                  <th className="text-left px-4 py-3">Release Date</th>
                  <th className="text-right px-5 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {releasedAuditLedger.length > 0 ? (
                  releasedAuditLedger.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-blue-600">
                        {record.id}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{record.beneficiary}</p>
                        <p className="text-[10px] text-slate-400">{record.beneficiaryEmail}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          record.type === 'Tenant Refund'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {record.type}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        {formatCurrency(record.amount)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {record.method}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate" title={record.reason}>
                        {record.reason}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                        {record.formattedDate}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() =>
                            openEmailClient(
                              record.beneficiaryEmail,
                              `Place4U Payment Release Advice: ${record.id}`,
                              `Hi ${record.beneficiary},\n\nPayment release confirmation for reference ${record.id}:\nType: ${record.type}\nAmount: R${record.amount.toLocaleString()}\nMethod: ${record.method}\n\nPlace4U Administration`
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Mail size={12} className="text-red-500" />
                          Remit Email
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                      No releases recorded yet. When you disburse 50% agent shares or tenant refunds, they will appear in this audit log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: RELEASE TENANT REFUND ================= */}
      {refundModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Undo2 size={16} className="text-blue-600" />
                Authorize Tenant Application Refund
              </h3>
              <button onClick={() => setRefundModalItem(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="font-semibold text-slate-900">{refundModalItem.tenantName}</p>
                <p className="text-slate-500">{refundModalItem.tenantEmail} · {refundModalItem.tenantPhone}</p>
                <p className="text-slate-400 font-mono text-[10px]">App ID: {refundModalItem.id}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Refund Amount (ZAR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">R</span>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-600 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Settlement Channel</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600 text-xs"
                >
                  <option value="Original Card Gateway (PayFast / Stripe)">Original Card Gateway (PayFast / Stripe)</option>
                  <option value="Direct Electronic Bank Transfer (EFT)">Direct Electronic Bank Transfer (EFT)</option>
                  <option value="Manual Account Credit">Manual Account Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Refund</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setRefundModalItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRefund}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs"
              >
                Confirm & Release Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PROCESS AGENT WITHDRAWAL REQUEST ================= */}
      {requestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {requestModal.action === 'approve' && 'Approve Withdrawal Request'}
                {requestModal.action === 'pay' && 'Mark Withdrawal as Paid (EFT Sent)'}
                {requestModal.action === 'reject' && 'Reject Withdrawal Request'}
              </h3>
              <button onClick={() => setRequestModal(null)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="font-semibold text-slate-900">{requestModal.req.agent?.full_name || 'Agent'}</p>
                <p className="text-slate-500">{requestModal.req.agent?.email}</p>
                <p className="text-slate-900 font-mono font-bold mt-1">
                  {formatCurrency(requestModal.req.amount)}
                </p>
                {requestModal.req.bank_details?.accountNumber && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {requestModal.req.bank_details.bankName} · Acc {requestModal.req.bank_details.accountNumber} · Branch {requestModal.req.bank_details.branchCode || '—'} · {requestModal.req.bank_details.accountHolder}
                  </p>
                )}
              </div>

              {requestModal.action === 'pay' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">EFT Reference</label>
                    <input
                      type="text"
                      value={payoutBankRef}
                      onChange={(e) => setPayoutBankRef(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Settlement Method</label>
                    <input
                      type="text"
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {requestModal.action === 'reject' ? 'Reason (shown to agent)' : 'Note (optional)'}
                </label>
                <textarea
                  rows={2}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {requestModal.action === 'reject' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Rejecting returns the reserved amount to the agent's available balance.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRequestModal(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRequestAction}
                disabled={busy}
                className={`px-3.5 py-2 rounded-lg text-white font-semibold text-xs cursor-pointer disabled:opacity-60 ${
                  requestModal.action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {busy ? 'Working…' : requestModal.action === 'approve' ? 'Approve' : requestModal.action === 'pay' ? 'Confirm Paid' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECORD / RELEASE CUSTOM AGENT PAYMENT ================= */}
      {isCustomPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus size={16} className="text-emerald-600" />
                Record Agent 50% Payment Disbursal
              </h3>
              <button onClick={() => setIsCustomPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteCustomPayout} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Licensed Agent</label>
                <select
                  value={customAgentId}
                  onChange={(e) => {
                    setCustomAgentId(e.target.value)
                    const ag = agentSummaryItems.find((a) => a.agentId === e.target.value)
                    if (ag && ag.balanceDue > 0) {
                      setCustomPayoutAmount(String(ag.balanceDue))
                    }
                  }}
                  required
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600 text-xs font-medium"
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.full_name || ag.email} ({ag.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Applications Handled (R50.00 each)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customAppCount}
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value) || 1)
                      setCustomAppCount(count)
                      setCustomPayoutAmount(String(count * AGENT_SHARE_AMOUNT))
                      setCustomPayoutDescription(`50% fee split for ${count} application${count > 1 ? 's' : ''}`)
                    }}
                    className="w-24 p-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-bold"
                  />
                  <span className="text-slate-500 text-[11px]">
                    = {customAppCount} × R50.00 = <strong>R{customAppCount * AGENT_SHARE_AMOUNT}.00</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Amount to Release (ZAR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">R</span>
                  <input
                    type="number"
                    required
                    value={customPayoutAmount}
                    onChange={(e) => setCustomPayoutAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-600 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Channel</label>
                <select
                  value={customPayoutMethod}
                  onChange={(e) => setCustomPayoutMethod(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600 text-xs"
                >
                  <option value="EFT Direct Wire (FNB / Standard Bank / Capitec / Nedbank)">EFT Direct Wire (FNB / Standard Bank / Capitec / Nedbank)</option>
                  <option value="Capitec Pay / CashSend">Capitec Pay / CashSend</option>
                  <option value="Instant EFT Electronic Transfer">Instant EFT Electronic Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Banking Reference</label>
                <input
                  type="text"
                  required
                  value={customPayoutBankRef}
                  onChange={(e) => setCustomPayoutBankRef(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={customPayoutDescription}
                  onChange={(e) => setCustomPayoutDescription(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs"
                >
                  Confirm & Disburse Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
