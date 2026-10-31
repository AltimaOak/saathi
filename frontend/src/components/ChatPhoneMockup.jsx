import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatPhoneMockup = ({ activeStep = 0 }) => {
  const stepContents = [
    {
      title: "1. Listens to Merchant",
      subtitle: "Hindi, Marathi or English",
      merchantMsg: "Bhaiya, subah ka ₹4,850 settlement account mein abhi tak nahi aaya...",
      saathiMsg: "Namaste Ramesh ji! Checking your Dadar store merchant terminal right now.",
      actionCard: null,
      badge: "Voice & Text Understood",
    },
    {
      title: "2. Thinks & Verifies",
      subtitle: "Reads internal Paytm systems",
      merchantMsg: "Can you see what went wrong with the bank?",
      saathiMsg: "Found it: HDFC merged branch code requires IFSC update on your KYC ledger.",
      actionCard: {
        type: "check",
        title: "KYC & IFSC Verification",
        detail: "Matched merchant Aadhaar XML with HDFC0000240",
      },
      badge: "Deep System Check",
    },
    {
      title: "3. Does the Real Action",
      subtitle: "Executes APIs, doesn't just chat",
      merchantMsg: "Do I have to visit the bank branch?",
      saathiMsg: "No need! I have re-routed the payout via IMPS instant rail. ₹4,850 is credited.",
      actionCard: {
        type: "success",
        title: "Action Completed via IMPS",
        detail: "UTR #HDFC992014 • SMS notification sent",
      },
      badge: "Solved by Saathi",
    },
    {
      title: "4. Asks a Human",
      subtitle: "Safety limit when money > ₹10,000",
      merchantMsg: "I have another pending supplier bulk transfer of ₹45,000 stuck!",
      saathiMsg: "This is above ₹10,000. I have briefed Desk Lead Kunal S. He is calling your phone now.",
      actionCard: {
        type: "human",
        title: "Handed to Paytm Desk Lead",
        detail: "Kunal S. reviewing high-value clearance",
      },
      badge: "Handed to a human",
    },
  ];

  const current = stepContents[activeStep] || stepContents[0];

  return (
    <div className="relative mx-auto w-[310px] sm:w-[340px] bg-navy p-3.5 rounded-[38px] border-4 border-navy shadow-hard-lg">
      {/* Phone speaker notch */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-navy rounded-full z-20 flex items-center justify-center">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
      </div>

      {/* Screen container */}
      <div className="relative bg-soft-blue rounded-[30px] overflow-hidden pt-8 pb-4 px-3 flex flex-col h-[460px] border border-slate-200">
        {/* App Bar */}
        <div className="bg-white border-b-2 border-navy/15 -mx-3 -mt-8 px-4 py-3 pt-5 flex items-center justify-between mb-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full bg-yellow border border-navy flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="10" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="2" />
                <rect x="11" y="12" width="10" height="5" rx="1.5" fill="#0B1B3F" />
                <circle cx="13" cy="14" r="1" fill="#00B9F5" />
                <circle cx="19" cy="14" r="1" fill="#00B9F5" />
              </svg>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"></span>
            </div>
            <div>
              <p className="font-heading font-bold text-xs text-navy leading-none">Saathi AI</p>
              <p className="text-[10px] text-emerald-600 font-medium">Online • Paytm Teammate</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky/20 text-royal border border-sky/30">
            Step {activeStep + 1}/4
          </span>
        </div>

        {/* Chat Stream with AnimatePresence */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              {/* Merchant message bubble */}
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-white border-2 border-navy/30 rounded-2xl rounded-tl-sm p-2.5 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">Ramesh (Merchant)</p>
                  <p className="text-navy font-medium leading-relaxed">{current.merchantMsg}</p>
                </div>
              </div>

              {/* Saathi message bubble */}
              <div className="flex justify-end">
                <div className="max-w-[88%] bg-navy text-white rounded-2xl rounded-tr-sm p-3 shadow-hard-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-yellow">Saathi</span>
                    <span className="text-[9px] text-sky-light opacity-80">Just now</span>
                  </div>
                  <p className="leading-relaxed font-body">{current.saathiMsg}</p>
                </div>
              </div>

              {/* Action Card if triggered */}
              {current.actionCard && (
                <div className="bg-white border-2 border-navy rounded-xl p-2.5 shadow-hard-sm animate-fadeIn">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </span>
                    <p className="font-heading font-bold text-[11px] text-navy">
                      {current.actionCard.title}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-600 pl-6 font-mono">
                    {current.actionCard.detail}
                  </p>
                </div>
              )}

              {/* Badge */}
              <div className="text-center pt-1">
                <span className={`inline-block text-[10px] font-heading font-extrabold px-2.5 py-0.5 rounded-full border border-navy/20 shadow-sm ${
                  activeStep === 3 ? 'bg-yellow text-navy' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {current.badge}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Input bar mockup */}
        <div className="mt-2 bg-white border-2 border-navy rounded-xl p-2 flex items-center justify-between gap-2 shadow-hard-sm">
          <span className="text-[11px] text-slate-400 font-medium pl-1 truncate">
            Speak Hindi or English...
          </span>
          <div className="w-6 h-6 rounded-lg bg-navy flex items-center justify-center text-white text-[10px]">
            ➔
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPhoneMockup;

