import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, PRESET_MERCHANTS } from '../context/AuthContext';
import Sticker from '../components/Sticker';

export const LoginPage = () => {
  const { currentMerchant, switchMerchant, registerMerchant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Sign up fields
  const [signupData, setSignupData] = useState({
    name: '',
    shopName: '',
    city: 'Mumbai',
    bankName: 'HDFC Bank',
  });

  const handleQuickSwitch = (merchantId) => {
    switchMerchant(merchantId);
    navigate('/dashboard');
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phoneInput) return;
    setOtpSent(true);
    setOtpInput('4821'); // Pre-fill demo OTP for effortless hackathon testing
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    // Default to Ramesh if custom phone, or match preset
    const match = PRESET_MERCHANTS.find((m) => m.phone.includes(phoneInput.slice(-4)));
    if (match) {
      switchMerchant(match.id);
    } else {
      switchMerchant(PRESET_MERCHANTS[0].id);
    }
    navigate('/dashboard');
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (!signupData.name || !signupData.shopName) return;
    registerMerchant(signupData);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-soft-blue py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full">
        
        {/* Top Brand Pill */}
        <div className="text-center mb-8">
          <Sticker rotate="-rotate-2" color="bg-yellow">
            Merchant Authentication
          </Sticker>
          <h1 className="font-heading font-extrabold text-navy text-3xl sm:text-4xl tracking-tight mt-3">
            Sign In to Your Paytm Store
          </h1>
          <p className="font-body text-slate-600 text-sm mt-1">
            Each merchant has their own unique live sales metrics, Soundbox, and settlements.
          </p>
        </div>

        {/* ================= 1. INSTANT 1-CLICK DEMO SWITCHER ================= */}
        <div className="card-hard bg-white p-5 mb-6">
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-navy/15">
            <span className="font-heading font-extrabold text-xs text-navy uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              1-Click Merchant Switcher
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-bold">Fast Demo</span>
          </div>

          <div className="space-y-2.5">
            {PRESET_MERCHANTS.map((m) => {
              const isSelected = currentMerchant?.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleQuickSwitch(m.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    isSelected
                      ? 'bg-yellow/20 border-navy shadow-hard-sm'
                      : 'bg-soft-blue/60 border-navy/20 hover:border-navy hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-navy text-yellow font-heading font-black text-sm flex items-center justify-center">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm text-navy leading-tight">
                        {m.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {m.shopName} • <span className="font-medium text-royal">{m.city}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-heading font-extrabold text-xs text-navy block">
                      {m.monthlyVolume}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {isSelected ? '✓ Active' : 'Switch ➔'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= 2. TABBED LOGIN / SIGNUP CARD ================= */}
        <div className="card-hard bg-white p-6 sm:p-7 shadow-hard-lg">
          {/* Tabs */}
          <div className="flex items-center rounded-xl bg-soft-blue p-1 mb-6 border border-navy/20">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-xs font-heading font-bold rounded-lg transition-all ${
                activeTab === 'login' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:text-navy'
              }`}
            >
              Mobile OTP Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 text-xs font-heading font-bold rounded-lg transition-all ${
                activeTab === 'signup' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:text-navy'
              }`}
            >
              New Merchant Sign Up
            </button>
          </div>

          {/* Tab 1: OTP Login */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-heading font-bold text-navy mb-1.5 uppercase tracking-wider">
                      Merchant Mobile Number
                    </label>
                    <div className="flex items-center">
                      <span className="bg-slate-100 border-2 border-r-0 border-navy px-3 py-2.5 rounded-l-xl text-xs font-mono font-bold text-slate-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="98201 44910"
                        className="flex-1 bg-white border-2 border-navy rounded-r-xl px-3.5 py-2.5 text-sm font-mono text-navy focus:outline-none focus:ring-2 focus:ring-sky"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Try Ramesh (+91 98201 44910) or any 10-digit number.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full text-sm"
                  >
                    Send OTP via SMS ➔
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-xs text-emerald-800">
                    OTP sent to <strong>+91 {phoneInput}</strong>. Auto-filled demo OTP below!
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold text-navy mb-1.5 uppercase tracking-wider">
                      4-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full text-center tracking-[8px] bg-white border-2 border-navy rounded-xl px-3.5 py-2.5 text-lg font-mono font-bold text-navy focus:outline-none focus:ring-2 focus:ring-sky"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full text-sm"
                  >
                    Verify & Open Dashboard ➔
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-center text-xs font-heading font-bold text-slate-500 hover:text-navy pt-1"
                  >
                    ← Change Phone Number
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: New Merchant Sign Up */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="block text-xs font-heading font-bold text-navy mb-1">
                  Merchant Full Name
                </label>
                <input
                  type="text"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  placeholder="e.g. Anand Kulkarni"
                  className="w-full bg-soft-blue border border-navy/30 rounded-xl px-3.5 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-navy mb-1">
                  Shop / Business Name
                </label>
                <input
                  type="text"
                  value={signupData.shopName}
                  onChange={(e) => setSignupData({ ...signupData, shopName: e.target.value })}
                  placeholder="e.g. Kulkarni Sweets & Dairy"
                  className="w-full bg-soft-blue border border-navy/30 rounded-xl px-3.5 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-navy mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={signupData.city}
                    onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                    placeholder="e.g. Pune"
                    className="w-full bg-soft-blue border border-navy/30 rounded-xl px-3.5 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-navy mb-1">
                    Bank
                  </label>
                  <input
                    type="text"
                    value={signupData.bankName}
                    onChange={(e) => setSignupData({ ...signupData, bankName: e.target.value })}
                    placeholder="e.g. Axis Bank"
                    className="w-full bg-soft-blue border border-navy/30 rounded-xl px-3.5 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn-primary w-full text-sm"
                >
                  Create Store & Connect Soundbox ➔
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

export default LoginPage;

