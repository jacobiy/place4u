import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Download,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  FileText,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Award,
  Sparkles,
  MapPin,
  Calendar,
  Check,
  X,
  Layers,
  FileCheck,
  Printer,
  Lock,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Modal } from './Component/Modal';
import './Wallet.css';

import {
  APPLICATION_FEE,
  AGENT_SPLIT_RATE,
  AGENT_SHARE_AMOUNT,
  getAgentBalance,
  getPayoutRequests,
  requestPayout,
  subscribeToWalletChanges
} from '../../services/walletService';

// Business Model (enforced server-side in database/agent_wallet_ledger.sql):
// Tenant pays R100 -> attached to the application. For every application assigned to this
// agent that is COMPLETED, PAID and NOT REFUNDED, the agent earns 50% (R50.00).
// Balance = earned - paid payouts - open withdrawal requests. Refunds remove that file's R50.

const fmtDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const PAYOUT_STATUS_LABEL = {
  pending: 'Pending Admin Review',
  approved: 'Approved - Awaiting EFT',
  paid: 'Settled',
  rejected: 'Rejected'
};

// Custom Tooltip for Recharts
const CustomFeeSplitTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#111726',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        fontSize: '0.75rem',
        color: '#fff'
      }}>
        <p style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#10b981', fontWeight: 700 }}>
          50% Payment Shares: R{Number(payload[0]?.value || 0).toLocaleString()}.00
        </p>
        {payload[1] && (
          <p style={{ color: '#4f7ef8', fontWeight: 600, marginTop: '2px' }}>
            Files Handled: {payload[1]?.value} Files
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const Wallet = ({
  applications = [],
  properties = [],
  tenantById = new Map(),
  userRow = null,
  profile = null,
  onRefresh = () => {},
  setActiveView = () => {}
}) => {
  // Navigation tab: 'files' (Application Files 50% Split) | 'payouts' (Disbursements Ledger)
  const [activeTab, setActiveTab] = useState("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFileItem, setSelectedFileItem] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Live ledger state (Supabase)
  const [serverBalance, setServerBalance] = useState(null);
  const [payoutRequests, setPayoutRequests] = useState([]);

  // Bank details come from the agent's saved profile (Settings > Banking)
  const bankDetails = useMemo(() => ({
    bankName: profile?.bank_name || "Bank not set",
    accountHolder: profile?.account_holder || userRow?.full_name || profile?.agency_name || "Place4U Agent",
    accountNumber: profile?.account_number || "",
    branchCode: profile?.branch_code || "",
    accountType: profile?.account_type || "Cheque / Business Account",
    isVerified: Boolean(profile?.account_number)
  }), [profile, userRow]);

  const maskedAccount = bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4) : "----";
  const bankOptionLabel = `${bankDetails.bankName} (•••• ${maskedAccount})`;

  useEffect(() => { setWithdrawBank(bankOptionLabel); }, [bankOptionLabel]);

  const agentUserId = userRow?.id;

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const loadLedger = async () => {
    if (!agentUserId) return;
    try {
      const [bal, reqs] = await Promise.all([
        getAgentBalance(agentUserId),
        getPayoutRequests(agentUserId)
      ]);
      setServerBalance(bal);
      setPayoutRequests(reqs);
    } catch (err) {
      console.warn('Wallet ledger load failed (has agent_wallet_ledger.sql been run?):', err?.message || err);
    }
  };

  // Initial load + realtime: payments, applications and payout requests all move the balance
  useEffect(() => {
    loadLedger();
    const unsubscribe = subscribeToWalletChanges(() => {
      loadLedger();
      onRefresh?.();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentUserId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    triggerToast("Refreshing balance & remittance slips…");
    try {
      await Promise.all([loadLedger(), onRefresh?.()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const totalPaidOutReleased = serverBalance?.paidOut ?? 0;
  const reservedBalance = serverBalance?.reserved ?? 0;

  // Build the list of application files (real assigned applications only)
  const applicationFileItems = useMemo(() => {
    const rows = (applications || []).map((app) => {
      const tenant = tenantById?.get(app.tenant_id);
      const feePaid = app.fee_paid === true || app.fee_paid === 'true';
      const refunded = app.fee_refunded === true;
      const completed = app.status === 'completed';
      return {
        app,
        tenant,
        feePaid,
        refunded,
        counts: feePaid && !refunded && completed // earns R50
      };
    });

    // Paid-out money covers the oldest earning files first (FIFO) so each file shows Released/Approved
    const earning = rows
      .filter((r) => r.counts)
      .sort((a, b) => new Date(a.app.submitted_at || 0) - new Date(b.app.submitted_at || 0));
    let coveredFiles = Math.floor(totalPaidOutReleased / AGENT_SHARE_AMOUNT);
    const releasedIds = new Set();
    earning.forEach((r) => {
      if (coveredFiles > 0) { releasedIds.add(r.app.id); coveredFiles -= 1; }
    });

    return rows.map(({ app, tenant, feePaid, refunded, counts }) => {
      const isReleased = releasedIds.has(app.id);
      const isApproved = counts && !isReleased;
      const category = (app.accommodation_category === 'student_room' || app.category === 'Student Housing')
        ? 'Student Housing' : 'Residential Rental';

      let status = 'In Verification';
      if (refunded) status = 'Refunded';
      else if (!feePaid) status = 'Awaiting Tenant Payment';
      else if (isReleased) status = 'Released';
      else if (isApproved) status = 'Approved for Release';

      return {
        id: app.id,
        key: `payout_app_${app.id}`,
        applicationId: String(app.id).slice(0, 8),
        tenantName: app.tenantName || tenant?.full_name || 'Resident Applicant',
        tenantEmail: app.tenantEmail || tenant?.email || '',
        tenantPhone: app.tenantPhone || tenant?.phone || '',
        propertyTitle: app.property_title || app.propertyTitle || (app.preferred_areas?.[0] ? `Unit in ${app.preferred_areas[0]}` : 'Residential Rental'),
        category,
        feeCollected: feePaid && !refunded ? Number(app.fee_amount) || APPLICATION_FEE : 0,
        splitRate: AGENT_SPLIT_RATE,
        agentShareAmount: counts ? AGENT_SHARE_AMOUNT : 0,
        potentialShare: AGENT_SHARE_AMOUNT,
        appStatus: app.status || 'submitted',
        feePaid,
        refunded,
        counts,
        submittedAt: app.submitted_at || new Date().toISOString(),
        formattedDate: fmtDate(app.submitted_at),
        isReleased,
        isApproved,
        status,
        releaseRecord: null,
        remittanceRef: refunded
          ? (app.refund_reference || 'Refunded')
          : isReleased ? 'Paid out' : 'Pending Remittance'
      };
    });
  }, [applications, tenantById, totalPaidOutReleased]);

  // Consolidated ledger of every payout request / payout (agent requests + admin direct payouts)
  const remittanceLedger = useMemo(() => {
    return payoutRequests.map((r) => {
      const when = r.processed_at || r.requested_at;
      return {
        id: r.reference || `WDL-${String(r.id).slice(0, 8).toUpperCase()}`,
        requestId: r.id,
        date: when,
        formattedDate: fmtDate(when),
        amount: Number(r.amount) || 0,
        currency: r.currency || 'ZAR',
        type: r.source === 'admin_direct' ? '50% Fee Share Disbursement' : 'Agent Requested Withdrawal',
        method: r.method || 'EFT Direct Wire',
        destination: r.bank_details?.destination || bankDetails.bankName,
        reference: r.reference || 'Awaiting admin reference',
        reason: r.admin_note || r.agent_note || (r.source === 'admin_direct' ? 'Admin direct payout' : 'Agent balance withdrawal request'),
        beneficiary: bankDetails.accountHolder,
        status: PAYOUT_STATUS_LABEL[r.status] || r.status,
        rawStatus: r.status,
        isLive: true
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payoutRequests, bankDetails]);

  // Balance: prefer the database view (authoritative); fall back to local math until it loads
  const localEarned = useMemo(
    () => applicationFileItems.filter((f) => f.counts).length * AGENT_SHARE_AMOUNT,
    [applicationFileItems]
  );
  const totalAccruedAllTime = serverBalance?.earned ?? localEarned;
  const availableBalance = serverBalance ? serverBalance.available : localEarned;

  // Money still in the pipeline: paid, assigned, not yet completed
  const pendingVerificationBalance = useMemo(
    () => applicationFileItems
      .filter((f) => f.feePaid && !f.refunded && !f.counts)
      .reduce((sum, f) => sum + f.potentialShare, 0),
    [applicationFileItems]
  );

  const refundedFilesCount = applicationFileItems.filter((f) => f.refunded).length;

  // Filtered files list
  const filteredFiles = useMemo(() => {
    let list = applicationFileItems;
    if (statusFilter !== 'all') {
      list = list.filter(f => f.status.toLowerCase().replace(/\s+/g, '_') === statusFilter.toLowerCase());
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(f =>
      f.applicationId.toLowerCase().includes(q) ||
      f.tenantName.toLowerCase().includes(q) ||
      f.propertyTitle.toLowerCase().includes(q) ||
      f.remittanceRef.toLowerCase().includes(q)
    );
  }, [applicationFileItems, statusFilter, searchQuery]);

  // Real monthly 50% shares (last 5 months, completed + paid + not refunded)
  const monthlySharesData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        y: d.getFullYear(),
        m: d.getMonth(),
        month: d.toLocaleDateString('en-ZA', { month: 'short' }),
        shares: 0,
        files: 0
      });
    }
    applicationFileItems.filter((f) => f.counts).forEach((f) => {
      const d = new Date(f.submittedAt);
      const bucket = months.find((b) => b.y === d.getFullYear() && b.m === d.getMonth());
      if (bucket) { bucket.shares += AGENT_SHARE_AMOUNT; bucket.files += 1; }
    });
    let running = 0;
    return months.map((b) => { running += b.shares; return { month: b.month, shares: running, files: b.files }; });
  }, [applicationFileItems]);

  // Real category distribution
  const categoryPieData = useMemo(() => {
    const earning = applicationFileItems.filter((f) => f.counts);
    const student = earning.filter((f) => f.category === 'Student Housing').length;
    const resi = earning.length - student;
    return [
      { name: 'Residential Rentals (50%)', value: resi, color: '#10b981' },
      { name: 'Student Housing (50%)', value: student, color: '#4f7ef8' }
    ];
  }, [applicationFileItems]);

  // Handle Withdrawal Request Submission -> creates a pending request the admin sees live
  const handleProcessWithdrawal = async (e) => {
    e.preventDefault();
    if (isSubmittingWithdrawal) return;
    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      triggerToast("Please enter a valid withdrawal amount.");
      return;
    }
    if (amountNum > availableBalance) {
      triggerToast("Insufficient available funds for this withdrawal.");
      return;
    }
    if (!bankDetails.accountNumber) {
      triggerToast("Add your banking details in Settings before withdrawing.");
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      await requestPayout({
        amount: amountNum,
        bankDetails: {
          destination: withdrawBank,
          bankName: bankDetails.bankName,
          accountHolder: bankDetails.accountHolder,
          accountNumber: bankDetails.accountNumber,
          branchCode: bankDetails.branchCode,
          accountType: bankDetails.accountType
        }
      });
      await loadLedger();
      setIsWithdrawModalOpen(false);
      setWithdrawAmount("");
      triggerToast(`Withdrawal request of R${amountNum.toLocaleString()}.00 sent to Place4U Admin for approval.`);
    } catch (err) {
      triggerToast(err?.message || "Withdrawal request failed. Please try again.");
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Export CSV Statement
  const handleExportCSV = () => {
    const headers = [
      "File ID",
      "Date",
      "Tenant Name",
      "Property / Unit",
      "Tenant Application Fee (ZAR)",
      "Place4U Split Rate",
      "Agent 50% Share (ZAR)",
      "Payout Status",
      "Remittance Reference"
    ];

    const rows = applicationFileItems.map(f => [
      f.applicationId,
      f.formattedDate,
      `"${f.tenantName}"`,
      `"${f.propertyTitle}"`,
      f.feeCollected,
      "50%",
      f.agentShareAmount,
      f.status,
      f.remittanceRef
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Place4U_Agent_50Pct_Payment_Share_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("50% Fee Share Statement CSV downloaded successfully.");
  };

  return (
    <div className="agent-wallet-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: '#151e33',
          color: '#fff',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
          padding: '0.85rem 1.4rem',
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          zIndex: 100,
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="agent-wallet-wrapper">
        
        {/* Top Header */}
        <header className="agent-wallet-header">
          <div>
            <h1 className="agent-wallet-title">
              <WalletIcon size={32} color="#10b981" />
              Agent Wallet &amp; Payment Shares
            </h1>
            <p className="agent-wallet-subtitle">
              Place4U pays <strong>50% of our application payment (R50.00 per processed file)</strong> directly to you. It is not a rent commission.
            </p>
          </div>

          <div className="agent-wallet-header-actions">
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.6rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowDownLeft size={16} />
              <span>Withdraw Balance</span>
            </button>

            <button
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#f1f5f9',
                border: '1px solid var(--wallet-border)',
                borderRadius: '0.5rem',
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={15} />
              <span>Statement</span>
            </button>

            <button
              onClick={() => setIsBankModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#f1f5f9',
                border: '1px solid var(--wallet-border)',
                borderRadius: '0.5rem',
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <CreditCard size={15} color="#4f7ef8" />
              <span>Banking Info</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--wallet-border)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Refresh wallet balances"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* 50% Fee Split Policy Explanatory Banner */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(79, 126, 248, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.28)',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '0.75rem',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}>
              <Percent size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                Place4U 50% Payment Split Model
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                For every tenant application assigned to you, Place4U shares <strong>50% of our R100 payment (R50.00 per processed file)</strong> directly with you. Payouts are released directly via EFT to your verified South African banking account.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '0.65rem',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Fee Collected</span>
              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>R100.00</strong>
            </div>
            <div style={{ height: 24, width: 1, background: 'rgba(255, 255, 255, 0.15)' }} />
            <div>
              <span style={{ fontSize: '0.68rem', color: '#10b981', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Your 50% Share</span>
              <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>R50.00 / File</strong>
            </div>
          </div>
        </section>

        {/* 1. Hero Metric Cards Grid */}
        <section className="agent-wallet-hero-grid">
          {/* Card 1: Available Balance */}
          <div className="agent-wallet-card agent-wallet-balance-card">
            <div className="agent-wallet-card-header">
              <div className="agent-wallet-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                <DollarSign size={22} color="#10b981" />
              </div>
              <span className="agent-wallet-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <CheckCircle2 size={12} /> Ready for Payout
              </span>
            </div>
            <div>
              <p className="agent-wallet-card-label">Available Balance</p>
              <h2 className="agent-wallet-card-value" style={{ color: '#10b981' }}>
                R{availableBalance.toLocaleString()}.00
              </h2>
              <p className="agent-wallet-card-sub">
                {reservedBalance > 0 ? `R${reservedBalance.toLocaleString()}.00 in open withdrawal requests` : 'Available for immediate EFT disbursement'}
                {refundedFilesCount > 0 ? ` • ${refundedFilesCount} refunded file${refundedFilesCount > 1 ? 's' : ''} excluded` : ''}
              </p>
            </div>
          </div>

          {/* Card 2: Total 50% Shares Released */}
          <div className="agent-wallet-card">
            <div className="agent-wallet-card-header">
              <div className="agent-wallet-icon-box" style={{ background: 'rgba(79, 126, 248, 0.12)' }}>
                <CheckCircle2 size={22} color="#4f7ef8" />
              </div>
              <span className="agent-wallet-pill" style={{ background: 'rgba(79, 126, 248, 0.12)', color: '#7c9ffc' }}>
                Disbursed to Bank
              </span>
            </div>
            <div>
              <p className="agent-wallet-card-label">Total 50% Shares Released</p>
              <h2 className="agent-wallet-card-value">
                R{totalPaidOutReleased.toLocaleString()}.00
              </h2>
              <p className="agent-wallet-card-sub">EFT wire settled to your registered account</p>
            </div>
          </div>

          {/* Card 3: Pending In Review */}
          <div className="agent-wallet-card">
            <div className="agent-wallet-card-header">
              <div className="agent-wallet-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
                <Clock size={22} color="#f59e0b" />
              </div>
              <span className="agent-wallet-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                Files in Progress
              </span>
            </div>
            <div>
              <p className="agent-wallet-card-label">Accrued in Pipeline</p>
              <h2 className="agent-wallet-card-value">
                R{pendingVerificationBalance.toLocaleString()}.00
              </h2>
              <p className="agent-wallet-card-sub">Pending final placement approval</p>
            </div>
          </div>

          {/* Card 4: Total Lifetime Accrued */}
          <div className="agent-wallet-card">
            <div className="agent-wallet-card-header">
              <div className="agent-wallet-icon-box" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                <Award size={22} color="#8b5cf6" />
              </div>
              <span className="agent-wallet-pill" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' }}>
                {applicationFileItems.length} Files Total
              </span>
            </div>
            <div>
              <p className="agent-wallet-card-label">Total 50% Shares Accrued</p>
              <h2 className="agent-wallet-card-value">
                R{totalAccruedAllTime.toLocaleString()}.00
              </h2>
              <p className="agent-wallet-card-sub">50% fee split across all assigned files</p>
            </div>
          </div>
        </section>

        {/* 2. Visual Performance & Analytics (Recharts) */}
        <section className="agent-wallet-charts-grid">
          {/* Monthly 50% Shares Growth Chart */}
          <div className="agent-section-card">
            <div className="agent-section-header">
              <h3 className="agent-section-title">
                <TrendingUp size={18} color="var(--wallet-emerald)" />
                50% Payment Share Trajectory (R50.00 / File)
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cumulative 2026 Volume</span>
            </div>
            <div className="agent-section-body" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySharesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="walletEarnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `R${v}`}
                  />
                  <Tooltip content={<CustomFeeSplitTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="shares"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#walletEarnGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Shares by Application Category */}
          <div className="agent-section-card">
            <div className="agent-section-header">
              <h3 className="agent-section-title">
                <Layers size={18} color="var(--wallet-primary)" />
                50% Fee Split by Category
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Portfolio Mix</span>
            </div>
            <div className="agent-section-body" style={{ height: 240, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '50%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#101524" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
                {categoryPieData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                    <span style={{ color: '#cbd5e1', flex: 1 }}>{item.name}</span>
                    <strong style={{ color: '#fff' }}>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Main Ledger Tabs & Tables */}
        <section className="agent-section-card">
          <div className="agent-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('files')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  borderColor: activeTab === 'files' ? '#10b981' : 'var(--wallet-border)',
                  background: activeTab === 'files' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: activeTab === 'files' ? '#10b981' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FileCheck size={15} />
                <span>Application Files (50% Split)</span>
                <span style={{
                  background: activeTab === 'files' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'files' ? '#fff' : '#cbd5e1',
                  borderRadius: '9999px',
                  padding: '1px 6px',
                  fontSize: '0.7rem'
                }}>
                  {applicationFileItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('payouts')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  borderColor: activeTab === 'payouts' ? '#4f7ef8' : 'var(--wallet-border)',
                  background: activeTab === 'payouts' ? 'rgba(79, 126, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: activeTab === 'payouts' ? '#7c9ffc' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ArrowDownLeft size={15} />
                <span>Disbursements &amp; Remittance Slips</span>
                <span style={{
                  background: activeTab === 'payouts' ? '#4f7ef8' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'payouts' ? '#fff' : '#cbd5e1',
                  borderRadius: '9999px',
                  padding: '1px 6px',
                  fontSize: '0.7rem'
                }}>
                  {remittanceLedger.length}
                </span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {activeTab === 'files' && (
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['all', 'released', 'approved_for_release', 'in_verification'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.4rem',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: statusFilter === st ? '#4f7ef8' : 'transparent',
                        background: statusFilter === st ? 'rgba(79, 126, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: statusFilter === st ? '#fff' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {st === 'all' ? 'All' : st === 'released' ? 'Released' : st === 'approved_for_release' ? 'Approved' : 'In Review'}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search file, tenant, ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--wallet-border)',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* TAB 1: Application Files (50% Split) Table */}
          {activeTab === 'files' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wallet-border)', color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Application File</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Applicant</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Property / Category</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Fee Collected</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#10b981' }}>Your 50% Share</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>#{file.applicationId}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{file.formattedDate}</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{file.tenantName}</div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{file.tenantEmail}</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ color: '#cbd5e1', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.propertyTitle}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{file.category}</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <strong style={{ color: '#fff' }}>R{file.feeCollected}.00</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Paid by Tenant</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>R{file.agentShareAmount}.00</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#10b981' }}>50% Payment Split</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: file.isReleased 
                              ? 'rgba(16, 185, 129, 0.15)' 
                              : file.isApproved 
                              ? 'rgba(79, 126, 248, 0.15)' 
                              : 'rgba(245, 158, 11, 0.15)',
                            color: file.isReleased 
                              ? '#10b981' 
                              : file.isApproved 
                              ? '#7c9ffc' 
                              : '#f59e0b',
                            border: `1px solid ${file.isReleased ? 'rgba(16, 185, 129, 0.3)' : file.isApproved ? 'rgba(79, 126, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                          }}
                        >
                          {file.isReleased && <CheckCircle2 size={11} />}
                          {file.status}
                        </span>
                        {file.isReleased && (
                          <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginTop: '3px', fontFamily: 'monospace' }}>
                            Ref: {file.remittanceRef}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (file.isReleased && file.releaseRecord) {
                              setSelectedVoucher({
                                id: file.remittanceRef,
                                date: file.releaseRecord.date || file.submittedAt,
                                formattedDate: file.releaseRecord.formattedDate || file.formattedDate,
                                amount: file.agentShareAmount,
                                type: '50% Fee Share Remittance',
                                method: file.releaseRecord.method || 'EFT Direct Wire',
                                destination: bankDetails.bankName,
                                reference: file.remittanceRef,
                                reason: `50% Fee Split for Application #${file.applicationId} (${file.tenantName})`,
                                beneficiary: bankDetails.accountHolder,
                                status: 'Settled'
                              });
                            } else {
                              setSelectedFileItem(file);
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.4rem',
                            background: file.isReleased ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid',
                            borderColor: file.isReleased ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                            color: file.isReleased ? '#10b981' : '#cbd5e1',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {file.isReleased ? 'View Remittance Slip' : 'File Breakdown'}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No application files match the current query
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Disbursements & Remittance Slips Ledger */}
          {activeTab === 'payouts' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--wallet-border)', color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Remittance Reference</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Disbursement Date</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Beneficiary / Bank</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Description / Reason</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Amount Disbursed</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Settlement</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Official Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {remittanceLedger.map((remit) => (
                    <tr
                      key={remit.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{remit.id}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{remit.method}</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', color: '#cbd5e1' }}>
                        {remit.formattedDate}
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{remit.beneficiary}</div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{remit.destination}</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', color: '#94a3b8', maxWidth: 280 }}>
                        {remit.reason}
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        <strong style={{ color: '#10b981', fontSize: '1rem' }}>R{remit.amount.toLocaleString()}.00</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>EFT Direct Wire</span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem' }}>
                        {(() => {
                          const palette = {
                            paid: ['rgba(16, 185, 129, 0.15)', '#10b981', 'rgba(16, 185, 129, 0.3)'],
                            approved: ['rgba(79, 126, 248, 0.15)', '#7c9ffc', 'rgba(79, 126, 248, 0.3)'],
                            pending: ['rgba(245, 158, 11, 0.15)', '#f59e0b', 'rgba(245, 158, 11, 0.3)'],
                            rejected: ['rgba(239, 68, 68, 0.15)', '#ef4444', 'rgba(239, 68, 68, 0.3)']
                          };
                          const [bg, fg, bd] = palette[remit.rawStatus] || palette.paid;
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              background: bg,
                              color: fg,
                              border: `1px solid ${bd}`,
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              {remit.rawStatus === 'paid' ? <CheckCircle2 size={11} /> : <Clock size={11} />} {remit.status}
                            </span>
                          );
                        })()}
                      </td>

                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher(remit)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.4rem',
                            background: 'rgba(79, 126, 248, 0.15)',
                            border: '1px solid rgba(79, 126, 248, 0.3)',
                            color: '#7c9ffc',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          View Remittance Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* MODAL 1: Withdrawal Request Modal */}
      {isWithdrawModalOpen && (
        <Modal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          title="Withdraw 50% Payment Shares Balance"
          size="md"
        >
          <form onSubmit={handleProcessWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Available Balance</span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', color: '#10b981', fontWeight: 800 }}>
                  R{availableBalance.toLocaleString()}.00
                </h3>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#cbd5e1', textAlign: 'right' }}>
                Zero EFT Fee &bull; 24h Bank Clearance
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Withdrawal Amount (ZAR)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>R</span>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.25rem',
                    background: '#151d31',
                    border: '1px solid var(--wallet-border)',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[50, 100, 200, availableBalance].filter(v => v <= availableBalance && v > 0).map(v => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setWithdrawAmount(String(v))}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '0.35rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--wallet-border)',
                      color: '#cbd5e1',
                      fontSize: '0.74rem',
                      cursor: 'pointer'
                    }}
                  >
                    R{v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Destination Bank Account
              </label>
              <select
                value={withdrawBank}
                onChange={(e) => setWithdrawBank(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  background: '#151d31',
                  border: '1px solid var(--wallet-border)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value={bankOptionLabel}>
                  {bankDetails.bankName} — {bankDetails.accountNumber || 'add account in Settings'} ({bankDetails.accountHolder})
                </option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="agent-btn agent-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingWithdrawal}
                className="agent-btn agent-btn-primary"
                style={{ background: '#10b981', color: '#fff', opacity: isSubmittingWithdrawal ? 0.6 : 1 }}
              >
                {isSubmittingWithdrawal ? 'Sending…' : 'Request Withdrawal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Banking Details Modal */}
      {isBankModalOpen && (
        <Modal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          title="Verified Agent Banking Profile"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '1rem',
              background: 'rgba(79, 126, 248, 0.1)',
              border: '1px solid rgba(79, 126, 248, 0.25)',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <ShieldCheck size={24} color="#4f7ef8" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>FICA Electronic Verification Verified</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  This bank account receives your 50% application fee shares via SARB Automated Clearing.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Bank Name</label>
                <strong style={{ color: '#fff' }}>{bankDetails.bankName}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Account Holder</label>
                <strong style={{ color: '#fff' }}>{bankDetails.accountHolder}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Account Number</label>
                <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{bankDetails.accountNumber}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Branch Code</label>
                <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{bankDetails.branchCode}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Account Type</label>
                <strong style={{ color: '#fff' }}>{bankDetails.accountType}</strong>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Payout Schedule</label>
                <strong style={{ color: '#10b981' }}>Bi-Weekly Direct EFT</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="agent-btn agent-btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Official Remittance Advice Slip Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          title="Place4U Official Remittance Advice"
          size="lg"
        >
          <div className="agent-voucher-container">
            <div className="agent-voucher-header">
              <div>
                <div className="agent-voucher-logo">PLACE4U PROPERTY PLATFORM</div>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  REPUBLIC OF SOUTH AFRICA &bull; AGENT 50% FEE SHARE DISBURSEMENT
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  <CheckCircle2 size={12} /> EFT SETTLED
                </span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                  Ref: {selectedVoucher.id}
                </div>
              </div>
            </div>

            <div style={{ margin: '1.25rem 0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Beneficiary</span>
                <strong style={{ color: '#fff' }}>{selectedVoucher.beneficiary}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Settlement Date</span>
                <strong style={{ color: '#fff' }}>{selectedVoucher.formattedDate}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Payment Method</span>
                <strong style={{ color: '#fff' }}>{selectedVoucher.method}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Destination Bank</span>
                <strong style={{ color: '#fff' }}>{selectedVoucher.destination}</strong>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '0.5rem',
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span>Item Description</span>
                <span>Split Rate</span>
                <span>Remitted Amount</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingTop: '0.75rem', color: '#fff' }}>
                <div>
                  <strong>{selectedVoucher.reason}</strong>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Gross Place4U screening fee collected: R100.00</span>
                </div>
                <span style={{ color: '#10b981', fontWeight: 600 }}>50.0%</span>
                <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>R{selectedVoucher.amount.toLocaleString()}.00</strong>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#64748b' }}>
                <Lock size={12} />
                <span>POPIA Certified &bull; Authorized by Place4U Disbursement Clearing</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="agent-btn agent-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <Printer size={14} /> Print Remittance Advice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="agent-btn agent-btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: File Breakdown Modal */}
      {selectedFileItem && (
        <Modal
          isOpen={Boolean(selectedFileItem)}
          onClose={() => setSelectedFileItem(null)}
          title={`Application File #${selectedFileItem.applicationId} Breakdown`}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{
              padding: '1rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>50% Share Accrued</span>
                <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem', fontWeight: 800 }}>R{selectedFileItem.agentShareAmount}.00</h3>
              </div>
              <span style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                background: selectedFileItem.isReleased ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: selectedFileItem.isReleased ? '#10b981' : '#f59e0b',
                fontWeight: 700,
                fontSize: '0.72rem'
              }}>
                {selectedFileItem.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Applicant</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#fff' }}>{selectedFileItem.tenantName}</p>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{selectedFileItem.tenantEmail}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Date Submitted</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#fff' }}>{selectedFileItem.formattedDate}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Property Applied For</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#fff' }}>{selectedFileItem.propertyTitle}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Category</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#fff' }}>{selectedFileItem.category}</p>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '0.5rem',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
                <span>Place4U Screening Fee Collected from Tenant:</span>
                <strong style={{ color: '#fff' }}>R{selectedFileItem.feeCollected}.00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
                <span>Agent Payment Share (50% Split):</span>
                <span>R{selectedFileItem.agentShareAmount}.00</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedFileItem(null)}
                className="agent-btn agent-btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
