import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { verifyPaymentClaim } from '../api/client';

export default function FraudModal({
  isOpen,
  onClose,
  merchantId = 1,
  onSendToChat,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [manualUtr, setManualUtr] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [simulatedStale, setSimulatedStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setManualUtr('');
    setManualAmount('');
    setSimulatedStale(false);
    setResult(null);
    setErrorMsg('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds 5MB size limit.');
      return;
    }

    setSelectedFile(file);
    setErrorMsg('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (rev) => setFilePreview(rev.target?.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !manualUtr.trim()) {
      setErrorMsg('Please upload a screenshot or enter a candidate UTR reference.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    const formData = new FormData();
    if (selectedFile) formData.append('file', selectedFile);
    if (manualUtr.trim()) formData.append('claim_utr', manualUtr.trim());
    if (manualAmount.trim()) formData.append('claim_amount', manualAmount.trim());
    formData.append('merchant_id', merchantId || 1);
    if (simulatedStale) formData.append('simulated_stale', 'true');

    try {
      const res = await verifyPaymentClaim(formData);
      setResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Payment claim verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForwardToChat = () => {
    if (!result) return;
    const utr = result.claimed?.utr || manualUtr;
    const msg = `Customer claims they paid ₹${result.claimed?.amount || manualAmount || '1,450'} with UTR ${utr}. Please check my ledger.`;
    if (onSendToChat) {
      onSendToChat(msg);
    }
    onClose();
  };

  if (!isOpen) return null;

  const verdictStyles = {
    VERIFIED_RECEIVED: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '✓',
      title: 'Payment Confirmed on Ledger',
      actionTone: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    MISMATCH_AMOUNT: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '⚠️',
      title: 'Amount Discrepancy Detected',
      actionTone: 'bg-rose-50 text-rose-900 border-rose-200',
    },
    ALREADY_CLAIMED: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '⚠️',
      title: 'Reused Reference Detected',
      actionTone: 'bg-rose-50 text-rose-900 border-rose-200',
    },
    MISMATCH_RECEIVER: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '⚠️',
      title: 'Different Merchant Account',
      actionTone: 'bg-rose-50 text-rose-900 border-rose-200',
    },
    REVERSED_OR_REFUNDED: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: '↩️',
      title: 'Payment Reversed or Refunded',
      actionTone: 'bg-rose-50 text-rose-900 border-rose-200',
    },
    PENDING: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '⏳',
      title: 'Payment In Flight',
      actionTone: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    NOT_FOUND: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '❓',
      title: 'Not Found in Ledger',
      actionTone: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    UNABLE_TO_VERIFY: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: '⏸',
      title: 'Unable to Verify (Fail-Closed)',
      actionTone: 'bg-amber-50 text-amber-900 border-amber-200',
    },
  };

  const vConfig = result ? (verdictStyles[result.verdict] || verdictStyles.UNABLE_TO_VERIFY) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
          role="dialog"
          aria-labelledby="fraud-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#0b1b3f] to-[#12306b] px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00baf2] text-xl font-bold text-white shadow-md">
                🛡️
              </span>
              <div>
                <h2 id="fraud-modal-title" className="text-lg font-bold">
                  Verify Customer Payment Claim
                </h2>
                <p className="text-xs text-blue-200">Fail-closed ledger audit against merchant records</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-6 space-y-6">
            {!result ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* File Upload Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Payment Screenshot / Receipt Slip (Optional)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-5 text-center cursor-pointer hover:border-[#00baf2] hover:bg-slate-50 transition"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {filePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={filePreview}
                          alt="Receipt Preview"
                          className="h-28 rounded-lg object-contain shadow-sm border border-slate-200"
                        />
                        <span className="text-xs font-semibold text-slate-700">{selectedFile?.name}</span>
                      </div>
                    ) : selectedFile ? (
                      <p className="text-sm font-semibold text-slate-700">📄 {selectedFile.name}</p>
                    ) : (
                      <>
                        <span className="text-3xl mb-1">📸</span>
                        <p className="text-sm font-bold text-slate-700">Click to upload screenshot</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP, or PDF (max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Manual Reference & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="utr-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Candidate UTR / UPI Ref
                    </label>
                    <input
                      id="utr-input"
                      type="text"
                      placeholder="e.g. 430198271049"
                      value={manualUtr}
                      onChange={(e) => setManualUtr(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-mono font-semibold text-slate-800 transition focus:border-[#00baf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00baf2]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="amt-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Claimed Amount (₹)
                    </label>
                    <input
                      id="amt-input"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1450.00"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#00baf2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00baf2]/20"
                    />
                  </div>
                </div>

                {/* Stale Ledger Simulation Switch */}
                <div className="flex items-center justify-between rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-3.5">
                  <div>
                    <p className="text-xs font-bold text-amber-900">Simulate Stale / Offline Ledger</p>
                    <p className="text-[11px] text-amber-700">Test fail-closed behavior (returns UNABLE_TO_VERIFY)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={simulatedStale}
                    onChange={(e) => setSimulatedStale(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#00baf2]"
                  />
                </div>

                {errorMsg && (
                  <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00baf2] to-[#0089b3] py-3 text-sm font-bold text-white shadow-lg shadow-[#00baf2]/20 hover:shadow-xl transition disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Auditing Internal Ledger...
                    </>
                  ) : (
                    'Verify Against Internal Ledger'
                  )}
                </button>
              </form>
            ) : (
              /* Verification Result Display */
              <div className="space-y-4">
                {/* Verdict Banner */}
                <div className={`rounded-2xl border p-4 shadow-sm ${vConfig.badge}`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base font-extrabold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm shadow-sm">
                        {vConfig.icon}
                      </span>
                      {result.verdict_label || result.verdict}
                    </span>
                    <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider">
                      {result.risk_level} RISK
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-relaxed opacity-90">
                    Case Ref: <span className="font-mono font-bold">{result.case_ref}</span> • Engine {result.rule_version}
                  </p>
                </div>

                {/* Explanation */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    System Assessment & Fact Check
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-slate-800">
                    {result.explanation}
                  </p>
                </div>

                {/* Recommended Next Step */}
                <div className={`rounded-2xl border p-4 ${vConfig.actionTone}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                    Recommended Merchant Action
                  </p>
                  <p className="text-sm font-bold">
                    {result.recommended_next_step}
                  </p>
                </div>

                {/* Checks Detail */}
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Audit Verification Checks
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {(result.checks_performed || []).map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-emerald-700 font-medium">
                        <span>✓</span> {c}
                      </li>
                    ))}
                    {(result.checks_unverified || []).map((u, i) => (
                      <li key={i} className="flex items-center gap-2 text-amber-700 font-medium">
                        <span>⏸</span> {u}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Ledger Snapshot Freshness: {result.ledger_last_synced_at}
                  </p>
                </div>

                {/* Modal Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Verify Another Claim
                  </button>
                  <button
                    type="button"
                    onClick={handleForwardToChat}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-[#00baf2] to-[#0089b3] py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition active:scale-95"
                  >
                    Ask Saathi in Chat 💬
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

