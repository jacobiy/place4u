import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertCircle,
  Receipt,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import {
  PAYPAL_CONFIG,
  isPayPalConfigured,
  generatePaymentReceipt
} from '../services/paypalService';
import { useUsdZarRate } from '../services/exchangeRateService';
import { buildFeeQuote, formatZarAmount } from '../services/promotionService';
import FeeAmount, { FeeBreakdown } from './FeeAmount';

export default function ApplicationFeeCardModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  onClaimFree,
  applicantName = 'Resident Tenant',
  propertyTitle = 'Rental Application',
  amountZar = 100,
  feeQuote = null
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const { rate: usdZarRate, convertZarToUsd } = useUsdZarRate();

  const quote = feeQuote || buildFeeQuote({ originalAmount: amountZar });
  const payableAmount = Number(quote?.finalAmount ?? amountZar);
  const isFree = Boolean(quote?.isFree);
  const hasDiscount =
    Boolean(quote?.promotionApplied) &&
    payableAmount < Number(quote?.originalAmount ?? amountZar);

  // The PayPal order is denominated in USD; convert using live exchange rate
  const payableUsd = convertZarToUsd(payableAmount);

  if (!isOpen) return null;

  // PayPal checkout handlers
  const handlePayPalCreateOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [
        {
          description: `Place4U Screening Fee (${formatZarAmount(payableAmount)}) - ${propertyTitle}`,
          amount: {
            currency_code: PAYPAL_CONFIG.currencyCode,
            value: payableUsd
          }
        }
      ],
      application_context: {
        brand_name: 'Place4U',
        shipping_preference: 'NO_SHIPPING'
      }
    });
  };

  const handlePayPalApprove = async (data, actions) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const details = await actions.order.capture();
      const payer = details?.payer;
      const captureId =
        details?.purchase_units?.[0]?.payments?.captures?.[0]?.id || details.id;

      const receipt = generatePaymentReceipt({
        orderId: captureId,
        cardLast4: 'Verified',
        cardBrand: 'PayPal',
        amountZar: payableAmount,
        applicantName: payer?.name?.given_name
          ? `${payer.name.given_name} ${payer.name.surname || ''}`.trim()
          : applicantName,
        propertyTitle
      });

      setReceiptData(receipt);
      if (onPaymentSuccess) {
        onPaymentSuccess(receipt);
      }
    } catch (err) {
      console.error('PayPal capture error:', err);
      setErrorMessage(
        'Failed to complete payment via PayPal. Please try again or check your connection.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimFreeWaiver = () => {
    if (onClaimFree) {
      onClaimFree();
      return;
    }
    const receipt = generatePaymentReceipt({
      amountZar: 0,
      applicantName,
      propertyTitle
    });
    setReceiptData(receipt);
    if (onPaymentSuccess) {
      onPaymentSuccess(receipt);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[130] p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-900">
                Application Screening Fee
              </h3>
              <p className="text-xs text-slate-500">PayPal Secure Checkout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {receiptData ? (
            /* Success Receipt View */
            <div className="space-y-4 py-1 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-900">
                  {payableAmount === 0 ? 'Application Fee Waived' : 'Payment Received'}
                </h4>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  {payableAmount === 0
                    ? 'No fee required for this application'
                    : `${formatZarAmount(payableAmount)} application fee settled`}
                </p>
              </div>

              {/* Digital Voucher Slip */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Receipt Reference</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {receiptData.receiptNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Applicant</span>
                  <span className="font-medium text-slate-900">{receiptData.applicantName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Property / Application</span>
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">
                    {receiptData.propertyTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payment Gateway</span>
                  <span className="font-medium text-slate-900">
                    {payableAmount === 0 ? 'Promotional Waiver' : 'PayPal Services'}
                  </span>
                </div>

                {hasDiscount && (
                  <FeeBreakdown quote={quote} tone="light" dense className="pt-2 border-t border-slate-200" />
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-semibold">
                  <span className="text-slate-900">Total Settled</span>
                  <FeeAmount quote={quote} amount={payableAmount} tone="light" size="sm" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-10 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue with application</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Checkout View */
            <div className="space-y-4">
              {/* Fee Summary Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Screening & Vetting
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    {propertyTitle || 'Rental Application'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ID verification, FICA check & bureau screening
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <FeeAmount
                    quote={quote}
                    amount={payableAmount}
                    tone="light"
                    size="xl"
                    className="justify-end font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isFree
                      ? 'Promotion applied'
                      : `approx. $${payableUsd} USD (1 USD ≈ R${usdZarRate.toFixed(2)})`}
                  </span>
                </div>
              </div>

              {/* Discount / Promotion Breakdown */}
              {hasDiscount && !isFree && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <FeeBreakdown quote={quote} tone="light" dense />
                </div>
              )}

              {/* Free Promotion State */}
              {isFree ? (
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                    Your screening fee has been waived
                    {quote?.promotion?.name ? ` by the ${quote.promotion.name}` : ''}. No
                    payment is required to submit this application.
                  </div>
                  <button
                    type="button"
                    onClick={handleClaimFreeWaiver}
                    className="w-full h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={15} />
                    <span>Claim free application waiver</span>
                  </button>
                </div>
              ) : (
                /* PayPal Checkout */
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600">
                    Pay securely using your PayPal balance or debit/credit card via PayPal:
                  </p>

                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-rose-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-white p-3 min-h-[120px] flex flex-col justify-center">
                    {isProcessing ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
                        <Loader2 size={20} className="animate-spin text-sky-700" />
                        <span>Verifying transaction with PayPal...</span>
                      </div>
                    ) : isPayPalConfigured() ? (
                      <PayPalScriptProvider
                        options={{
                          clientId: PAYPAL_CONFIG.clientId,
                          currency: PAYPAL_CONFIG.currencyCode,
                          intent: 'capture',
                          'disable-funding': 'credit,paylater,venmo'
                        }}
                      >
                        <PayPalButtons
                          style={{
                            layout: 'vertical',
                            color: 'gold',
                            shape: 'rect',
                            label: 'checkout',
                            height: 42
                          }}
                          createOrder={handlePayPalCreateOrder}
                          onApprove={handlePayPalApprove}
                          onError={(err) => {
                            console.error('PayPal checkout error:', err);
                            setErrorMessage(
                              'PayPal checkout encountered an issue. Please try again.'
                            );
                          }}
                        />
                      </PayPalScriptProvider>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500">
                        PayPal gateway is not configured for this environment.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security Footnote */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock size={12} className="text-slate-500" />
                  PayPal 256-bit SSL encryption
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  Place4U verified screening
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
