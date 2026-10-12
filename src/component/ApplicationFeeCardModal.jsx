import React, { useState } from 'react';
import { 
  X, CreditCard, ShieldCheck, CheckCircle2, Lock, 
  AlertCircle, ArrowRight, Download, Receipt, Sparkles, Loader2 
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { PAYPAL_CONFIG, isPayPalConfigured, processCardApplicationFee, generatePaymentReceipt } from '../services/paypalService';

export default function ApplicationFeeCardModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  applicantName = 'Resident Tenant',
  propertyTitle = 'Rental Application',
  amountZar = 100
}) {
  const [activeTab, setActiveTab] = useState('card_form'); // 'card_form' | 'paypal_button'
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // Card Form State
  const [cardData, setCardData] = useState({
    cardholderName: applicantName || '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });

  if (!isOpen) return null;

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardData(prev => ({ ...prev, cardNumber: val }));
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    setCardData(prev => ({ ...prev, expiryDate: val }));
  };

  const handleCvvChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardData(prev => ({ ...prev, cvv: val }));
  };

  // Quick Autofill for testing
  const handleAutofillDemoCard = () => {
    setCardData({
      cardholderName: applicantName || 'Jacob Tenant',
      cardNumber: '4532 8910 2489 4242',
      expiryDate: '08/28',
      cvv: '821'
    });
    setErrorMessage(null);
  };

  // Submit direct card payment
  const handleDirectCardSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNumber = cardData.cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 13) {
      setErrorMessage('Please enter a valid debit or credit card number.');
      return;
    }
    if (!cardData.expiryDate || cardData.expiryDate.length < 5) {
      setErrorMessage('Please enter a valid expiry date (MM/YY).');
      return;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      setErrorMessage('Please enter a valid CVV (3 digits on the back of your card).');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processCardApplicationFee({
        cardNumber: cardData.cardNumber,
        expiryDate: cardData.expiryDate,
        cvv: cardData.cvv,
        cardholderName: cardData.cardholderName,
        applicantName,
        propertyTitle,
        amountZar
      });

      if (result.success) {
        setReceiptData(result.receipt);
        if (onPaymentSuccess) {
          onPaymentSuccess(result.receipt);
        }
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // PayPal Card Buttons handlers
  const handlePayPalCreateOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [
        {
          description: `Place4U Application Fee (R${amountZar}) - ${propertyTitle}`,
          amount: {
            currency_code: PAYPAL_CONFIG.currencyCode,
            value: PAYPAL_CONFIG.approxUsdAmount.toFixed(2)
          }
        }
      ],
      application_context: {
        brand_name: 'Place4U Real Estate',
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
      const captureId = details?.purchase_units?.[0]?.payments?.captures?.[0]?.id || details.id;

      const receipt = generatePaymentReceipt({
        orderId: captureId,
        cardLast4: 'Verified',
        cardBrand: 'PayPal Card',
        amountZar,
        applicantName: payer?.name?.given_name ? `${payer.name.given_name} ${payer.name.surname}` : applicantName,
        propertyTitle
      });

      setReceiptData(receipt);
      if (onPaymentSuccess) {
        onPaymentSuccess(receipt);
      }
    } catch (err) {
      console.error('PayPal Card capture error:', err);
      setErrorMessage('Failed to capture card payment via PayPal. Please try again or use direct card entry.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[130] p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0b0e14] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Application Vetting Fee</h3>
              <p className="text-xs text-white/50">Card Only Payment (Powered by PayPal)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {receiptData ? (
            /* Success Receipt View */
            <div className="text-center space-y-4 py-2 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Payment Received!</h4>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  R{amountZar}.00 Application Fee Settled
                </p>
              </div>

              {/* Digital Invoice Slip */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-white/40 uppercase tracking-wider text-[10px] font-bold">Receipt Reference</span>
                  <span className="font-mono font-bold text-blue-400">{receiptData.receiptNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Applicant</span>
                  <span className="font-medium text-white">{receiptData.applicantName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Payment Gateway</span>
                  <span className="font-medium text-white">{receiptData.gateway}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Card Used</span>
                  <span className="font-medium text-white">{receiptData.cardBrand} •••• {receiptData.cardLast4}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-sm font-bold">
                  <span className="text-white">Total Paid</span>
                  <span className="text-emerald-400">R{amountZar}.00</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                  Continue with Application
                </button>
              </div>
            </div>
          ) : (
            /* Payment Input View */
            <div className="space-y-5">
              
              {/* Fee Breakdown Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-blue-300 font-bold">
                    Official Application Fee
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">
                    Tenant identity vetting, credit check & screening
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-serif text-white">R{amountZar}</span>
                  <span className="text-[11px] text-white/50 block font-mono">ZAR (Card Only)</span>
                </div>
              </div>

              {/* Mode Toggle: Card Form vs PayPal Card Button */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('card_form')}
                  className={`py-2 rounded-lg transition-all ${
                    activeTab === 'card_form' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Debit / Credit Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paypal_button')}
                  className={`py-2 rounded-lg transition-all ${
                    activeTab === 'paypal_button' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  PayPal Card Button
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Tab 1: Direct Card Entry Form */}
              {activeTab === 'card_form' && (
                <form onSubmit={handleDirectCardSubmit} className="space-y-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-white/50 block mb-1.5 font-semibold">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jacob Molomo"
                      value={cardData.cardholderName}
                      onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">
                        Card Number (Debit or Credit)
                      </label>
                      <button
                        type="button"
                        onClick={handleAutofillDemoCard}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                      >
                        <Sparkles size={11} /> Fill Test Card
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="4532 •••• •••• 4242"
                        value={cardData.cardNumber}
                        onChange={handleCardNumberChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500 transition-colors font-mono tracking-wider pl-10"
                      />
                      <CreditCard size={16} className="absolute left-3 top-3 text-white/40" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-white/50 block mb-1.5 font-semibold">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardData.expiryDate}
                        onChange={handleExpiryChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-white/50 block mb-1.5 font-semibold">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="123"
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying Card & Clearing R100...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={15} />
                        <span>Pay R{amountZar}.00 with Card</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Tab 2: PayPal Card Button */}
              {activeTab === 'paypal_button' && (
                <div className="space-y-3">
                  <p className="text-xs text-white/60 text-center">
                    Pay securely using PayPal's verified card processing checkout:
                  </p>
                  
                  <div className="p-2 rounded-2xl bg-white/[0.02] border border-white/5">
                    <PayPalScriptProvider
                      options={{
                        clientId: PAYPAL_CONFIG.clientId,
                        currency: PAYPAL_CONFIG.currencyCode,
                        intent: 'capture',
                        'disable-funding': 'credit,paylater,venmo'
                      }}
                    >
                      <PayPalButtons
                        fundingSource="card"
                        style={{
                          layout: 'vertical',
                          color: 'black',
                          shape: 'rect',
                          label: 'pay',
                          height: 44
                        }}
                        createOrder={handlePayPalCreateOrder}
                        onApprove={handlePayPalApprove}
                        onError={(err) => {
                          console.error('PayPal Card error:', err);
                          setErrorMessage('PayPal card gateway encountered an issue. You can use the direct card entry tab above.');
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                </div>
              )}

              {/* Security Footer */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-3 text-[11px] text-white/40">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-400" />
                  PCI-DSS Certified
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Lock size={12} className="text-blue-400" />
                  256-Bit SSL Encryption
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
