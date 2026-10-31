import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import KiranaShop from '../illustrations/KiranaShop';
import ShopkeeperRamesh from '../illustrations/ShopkeeperRamesh';
import SaathiMascot from '../illustrations/SaathiMascot';
import Sticker from '../components/Sticker';
import ChatPhoneMockup from '../components/ChatPhoneMockup';

export const LandingPage = () => {
  // Speech bubble alternation in hero shop illustration
  const [speechText, setSpeechText] = useState("Where is my money?");
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeechText((prev) =>
        prev === "Where is my money?" ? "Money is here!" : "Where is my money?"
      );
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Active step for "How it works" interactive section
  const [activeStep, setActiveStep] = useState(0);

  const stepsData = [
    {
      step: 1,
      title: "Listens",
      tagline: "Understands merchant tone in regional languages",
      detail:
        "Ramesh can speak or type in Hindi, Marathi, or English. Saathi parses merchant slang, urgency, and specific Paytm device IDs without asking him to repeat.",
    },
    {
      step: 2,
      title: "Thinks",
      tagline: "Verifies internal Paytm ledgers directly",
      detail:
        "Instead of searching a generic knowledge base, Saathi queries Paytm Settlement batches, Soundbox logs, KYC status, and bank routing tables in milliseconds.",
    },
    {
      step: 3,
      title: "Does it",
      tagline: "Executes real system actions automatically",
      detail:
        "Re-routes delayed settlements via IMPS instant rails, restarts stalled Aadhaar XML verifications, clears customer refunds, and notifies everyone on WhatsApp.",
    },
    {
      step: 4,
      title: "Asks a human",
      tagline: "Strict safety boundary above ₹10,000",
      detail:
        "If a dispute exceeds ₹10,000 or the merchant is distressed, Saathi compiles a one-line incident brief and bridges a direct phone call with a Paytm Desk Lead.",
    },
  ];

  return (
    <div className="min-h-screen bg-soft-blue overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-18 md:pb-28 px-4 sm:px-6 lg:px-8 border-b-2 border-navy">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Huge Confident Headline */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="mb-4">
              <Sticker rotate="-rotate-3">
                Built for Paytm Merchants
              </Sticker>
            </div>

            <h1 className="font-heading font-extrabold text-navy tracking-tight leading-[1.03] text-4xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] mb-6">
              Your AI teammate that <span className="text-sky underline decoration-yellow decoration-4 underline-offset-8">gets the job done.</span>
            </h1>

            <p className="font-body text-lg sm:text-xl text-royal/90 leading-relaxed max-w-2xl mb-8">
              Saathi fixes settlements, refunds and KYC for Paytm merchants, and follows up with new leads, in Hindi, Marathi and English.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
              <Link to="/demo" className="btn-primary w-full sm:w-auto text-base sm:text-lg">
                Try the demo →
              </Link>
              <Link to="/dashboard" className="btn-secondary w-full sm:w-auto text-base sm:text-lg">
                See the dashboard
              </Link>
            </div>

            {/* Trust highlights */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-navy/70 border-t-2 border-navy/15 pt-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Takes real system actions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky"></span>
                <span>Hindi • Marathi • English</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow"></span>
                <span>Safe human escalation</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hand-made Kirana Shop Illustration */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="w-full max-w-[500px] bg-white border-2 border-navy rounded-[28px] p-4 sm:p-6 shadow-hard-lg relative">
              <KiranaShop speechText={speechText} className="w-full" />
              <div className="mt-3 text-center">
                <p className="font-heading font-bold text-xs text-navy/70">
                  Ramesh's Kirana Store, Dadar West • Powered by Paytm Soundbox
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. STORY STRIP: Meet Ramesh */}
      <section id="problem" className="py-20 bg-white border-b-2 border-navy px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <Sticker rotate="rotate-2" color="bg-yellow">
                Real problem, every day
              </Sticker>
              <h2 className="font-heading font-extrabold text-navy text-3xl sm:text-5xl tracking-tight mt-3">
                Meet Ramesh. He runs a shop in Mumbai.
              </h2>
            </div>
            <p className="font-body text-slate-600 max-w-md text-base">
              Every morning he serves 120 chai cups and sells rations. But whenever a digital payment hiccups, his entire day stops.
            </p>
          </div>

          {/* Story Grid with Ramesh illustration and 3 problem cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Ramesh Illustration */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-[320px] bg-soft-blue border-2 border-navy rounded-[24px] p-6 shadow-hard text-center">
                <ShopkeeperRamesh emotion="concerned" className="mx-auto max-w-[240px]" />
                <div className="mt-2 bg-white border-2 border-navy rounded-xl py-2 px-3">
                  <p className="font-heading font-bold text-sm text-navy">Ramesh Choudhary</p>
                  <p className="text-xs text-slate-600">Paytm Merchant since 2018</p>
                </div>
              </div>
            </div>

            {/* Three Numbered Problems: BIG numbers 1, 2, 3 in sky blue */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Problem 1 */}
              <div className="card-hard p-6 flex flex-col justify-between">
                <div>
                  <span className="font-heading font-black text-6xl sm:text-7xl text-sky block leading-none mb-3">
                    1
                  </span>
                  <h3 className="font-heading font-extrabold text-xl text-navy mb-2">
                    His money is late
                  </h3>
                </div>
                <p className="font-body text-sm text-slate-700 leading-relaxed">
                  Settlements get delayed because of bank IFSC merges or KYC flags. He has to pay milk suppliers by 3 PM or lose stock.
                </p>
              </div>

              {/* Problem 2 */}
              <div className="card-hard p-6 flex flex-col justify-between">
                <div>
                  <span className="font-heading font-black text-6xl sm:text-7xl text-sky block leading-none mb-3">
                    2
                  </span>
                  <h3 className="font-heading font-extrabold text-xl text-navy mb-2">
                    Nobody calls him back
                  </h3>
                </div>
                <p className="font-body text-sm text-slate-700 leading-relaxed">
                  Toll-free helplines put him on hold with automated IVR loops for 40 minutes while angry customers wait at his counter.
                </p>
              </div>

              {/* Problem 3 */}
              <div className="card-hard p-6 flex flex-col justify-between">
                <div>
                  <span className="font-heading font-black text-6xl sm:text-7xl text-sky block leading-none mb-3">
                    3
                  </span>
                  <h3 className="font-heading font-extrabold text-xl text-navy mb-2">
                    The chatbot only talks
                  </h3>
                </div>
                <p className="font-body text-sm text-slate-700 leading-relaxed">
                  Standard AI chatbots dump generic FAQ articles and ticket numbers instead of actually clicking the button to fix the settlement.
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 3. HOW IT WORKS: Vertical Path + Live Phone Mockup */}
      <section id="how-it-works" className="py-20 bg-soft-blue border-b-2 border-navy px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Sticker rotate="-rotate-2" color="bg-yellow">
              Action Architecture
            </Sticker>
            <h2 className="font-heading font-extrabold text-navy text-3xl sm:text-5xl tracking-tight mt-3">
              How Saathi handles every merchant issue
            </h2>
            <p className="font-body text-slate-700 text-lg mt-3">
              Click on each step below to see the phone mockup update its action in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: 4 Vertical Path Steps connected by dashed line */}
            <div className="lg:col-span-7 space-y-6 relative">
              {/* Dashed vertical line */}
              <div className="hidden sm:block absolute left-8 top-8 bottom-8 w-1 border-l-2 border-dashed border-navy -z-0"></div>

              {stepsData.map((s, idx) => {
                const isActive = activeStep === idx;
                return (
                  <button
                    key={s.step}
                    onClick={() => setActiveStep(idx)}
                    className={`w-full text-left relative z-10 p-5 sm:p-6 rounded-2xl border-2 border-navy transition-all duration-150 flex items-start gap-5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                      isActive
                        ? 'bg-white shadow-hard translate-x-1 sm:translate-x-2'
                        : 'bg-white/60 hover:bg-white shadow-hard-sm opacity-80'
                    }`}
                  >
                    {/* Step Number Circle */}
                    <div
                      className={`w-12 h-12 rounded-xl border-2 border-navy flex-shrink-0 flex items-center justify-center font-heading font-black text-xl transition-colors ${
                        isActive ? 'bg-yellow text-navy' : 'bg-soft-blue text-navy'
                      }`}
                    >
                      {s.step}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading font-extrabold text-xl text-navy">
                          {s.title}
                        </h3>
                        {isActive && (
                          <span className="text-[11px] font-heading font-bold bg-navy text-white px-2.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-sky uppercase tracking-wider mt-0.5">
                        {s.tagline}
                      </p>
                      <p className="font-body text-sm text-slate-700 mt-2 leading-relaxed">
                        {s.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Phone Mockup that reacts to active step */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <ChatPhoneMockup activeStep={activeStep} />
              <p className="text-xs font-semibold text-slate-500 mt-4 text-center">
                Interactive preview • Step {activeStep + 1} of 4 selected
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. CHATBOT VS SAATHI: Side by Side Comparison */}
      <section className="py-20 bg-white border-b-2 border-navy px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Sticker rotate="rotate-2">
              The Fundamental Shift
            </Sticker>
            <h2 className="font-heading font-extrabold text-navy text-3xl sm:text-5xl tracking-tight mt-3">
              Standard Chatbot vs Saathi
            </h2>
            <p className="font-body text-slate-600 text-lg mt-3">
              Chatbots talk. Saathi has hands and internal tool authorization.
            </p>
          </div>

          {/* Side-by-side Table / Comparison Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            
            {/* Left: Standard Chatbot (Grey and Flat) */}
            <div className="bg-slate-100 border-2 border-slate-400 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-300">
                  <div className="w-10 h-10 rounded-xl bg-slate-300 border border-slate-400 flex items-center justify-center text-slate-600 font-bold">
                    ✕
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-xl text-slate-700">
                      Standard Chatbot
                    </h3>
                    <p className="text-xs text-slate-500">Traditional FAQ Responder</p>
                  </div>
                </div>

                <div className="space-y-5 text-sm font-body text-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold">1.</span>
                    <p>Reads keywords and spits out links to help center articles.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold">2.</span>
                    <p>Tells the merchant to "wait 24 to 48 working hours".</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold">3.</span>
                    <p>Sends links to 10-step online forms when KYC fails.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold">4.</span>
                    <p>Creates tickets in back-office queues that sit untouched for days.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold">5.</span>
                    <p>Dead-ends into loops when an angry merchant asks for human help.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-300 text-center text-xs font-bold text-slate-500">
                Frustrates merchants and increases churn
              </div>
            </div>

            {/* Right: Saathi (Deep Navy and Highlighted with Yellow Hard Shadow) */}
            <div className="bg-navy border-2 border-navy text-white rounded-2xl p-6 sm:p-8 shadow-hard-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="bg-yellow text-navy font-heading font-extrabold text-xs px-3 py-1 rounded-full uppercase">
                  Action Engine
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20">
                  <div className="w-10 h-10 rounded-xl bg-yellow border-2 border-white flex items-center justify-center text-navy font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-2xl text-white">
                      Saathi
                    </h3>
                    <p className="text-xs text-sky font-semibold">Active Paytm AI Teammate</p>
                  </div>
                </div>

                <div className="space-y-5 text-sm font-body text-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="text-sky font-bold text-base">✓</span>
                    <p><strong className="text-white">Inspects live ledger:</strong> Checks Soundbox logs, KYC records & bank batches instantly.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sky font-bold text-base">✓</span>
                    <p><strong className="text-white">Fixes settlements:</strong> Auto-reroutes payouts through IMPS fast rail in minutes.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sky font-bold text-base">✓</span>
                    <p><strong className="text-white">Resolves KYC:</strong> Triggers Aadhaar XML verification directly from merchant chat.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sky font-bold text-base">✓</span>
                    <p><strong className="text-white">Books sales leads:</strong> Pre-approves loans and schedules doorstep agent visits.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sky font-bold text-base">✓</span>
                    <p><strong className="text-white">Smart escalation:</strong> Briefs Desk Leads with one-click call bridge for cases &gt; ₹10k.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/20 text-center text-xs font-bold text-yellow">
                Saves hours of support time and builds merchant loyalty
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. NUMBERS: Three Big Stats */}
      <section className="py-20 bg-soft-blue border-b-2 border-navy px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-12">
            <h2 className="font-heading font-extrabold text-navy text-3xl sm:text-4xl">
              Proven speed and scale
            </h2>
            <p className="font-heading font-bold text-xs sm:text-sm text-royal mt-2 tracking-wide uppercase">
              Goals we want to prove in a pilot
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Stat 1 */}
            <div className="card-hard p-8 text-center bg-white flex flex-col justify-center items-center">
              <span className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl text-navy block leading-none mb-4">
                7 in 10
              </span>
              <p className="font-heading font-bold text-lg text-royal mb-1">
                Questions solved alone
              </p>
              <p className="font-body text-xs text-slate-600 max-w-xs">
                Settlements, soundbox language changes, and refunds handled without burdening human desk agents.
              </p>
            </div>

            {/* Stat 2 */}
            <div className="card-hard p-8 text-center bg-white flex flex-col justify-center items-center">
              <span className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl text-sky block leading-none mb-4">
                2 min
              </span>
              <p className="font-heading font-bold text-lg text-royal mb-1">
                First reply and action
              </p>
              <p className="font-body text-xs text-slate-600 max-w-xs">
                Zero call-center queues. The merchant gets instant resolution while standing at their shop counter.
              </p>
            </div>

            {/* Stat 3 */}
            <div className="card-hard p-8 text-center bg-white flex flex-col justify-center items-center">
              <span className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl text-yellow block leading-none mb-4">
                3x
              </span>
              <p className="font-heading font-bold text-lg text-royal mb-1">
                Faster follow-up
              </p>
              <p className="font-body text-xs text-slate-600 max-w-xs">
                Pre-qualifies shop expansion loans and schedules agent doorstep biometric sign-offs automatically.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION (Dark Navy Section + Mascot) */}
      <section className="py-20 bg-navy text-white px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          
          <div className="max-w-xl text-center md:text-left">
            <span className="bg-yellow text-navy font-heading font-extrabold text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider inline-block mb-4 shadow-hard-sm">
              Interactive Demo
            </span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight mb-4">
              Ready to see Saathi solve real merchant cases?
            </h2>
            <p className="font-body text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
              Test live scenarios: late settlement recovery, stuck refunds, and instant shop loan sanction.
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Link to="/demo" className="btn-primary text-base sm:text-lg">
                Try the live demo →
              </Link>
              <Link to="/dashboard" className="inline-flex items-center justify-center font-heading font-bold px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 transition-all">
                Open Ops Dashboard
              </Link>
            </div>
          </div>

          {/* Saathi Robot Mascot in CTA */}
          <div className="flex-shrink-0 w-64 max-w-xs">
            <SaathiMascot className="w-full" showTools={false} />
          </div>

        </div>
      </section>
    </div>
  );
};

export default LandingPage;

