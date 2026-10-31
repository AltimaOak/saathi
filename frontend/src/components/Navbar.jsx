import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { currentMerchant } = useAuth();

  const isCurrent = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b-2 border-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-xl p-1">
          {/* Small robot head SVG icon */}
          <div className="w-10 h-10 rounded-xl bg-yellow border-2 border-navy shadow-hard-sm flex items-center justify-center group-hover:-rotate-3 transition-transform">
            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="11" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="2" />
              <rect x="11" y="11" width="10" height="6" rx="2" fill="#0B1B3F" />
              <circle cx="13.5" cy="14" r="1" fill="#00B9F5" />
              <circle cx="18.5" cy="14" r="1" fill="#00B9F5" />
              <path d="M 13 20 Q 16 23 19 20" stroke="#0B1B3F" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="5" x2="16" y2="2" stroke="#0B1B3F" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="2" r="1.5" fill="#FFC845" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-2xl text-navy tracking-tight leading-none">
              Saathi<span className="text-sky">.</span>
            </span>
            <span className="text-[10px] font-bold text-royal tracking-widest uppercase mt-0.5">
              Paytm AI Teammate
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-heading font-semibold text-sm text-navy" aria-label="Main Navigation">
          <a
            href="/#problem"
            className="hover:text-sky transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-lg px-2 py-1"
          >
            Problem
          </a>
          <a
            href="/#how-it-works"
            className="hover:text-sky transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-lg px-2 py-1"
          >
            How it works
          </a>
          <Link
            to="/demo"
            className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-lg px-2 py-1 ${
              isCurrent('/demo') ? 'text-sky font-bold' : 'hover:text-sky'
            }`}
          >
            Demo Chat
          </Link>
          <Link
            to="/dashboard"
            className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-lg px-2 py-1 ${
              isCurrent('/dashboard') ? 'text-sky font-bold' : 'hover:text-sky'
            }`}
          >
            Dashboard
          </Link>
        </nav>

        {/* Right Action Items: Merchant Profile Pill + Demo CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* Active Merchant Pill */}
          <Link
            to="/login"
            title="Switch Merchant or Sign In"
            className="flex items-center gap-2 bg-soft-blue hover:bg-yellow/30 border-2 border-navy px-3 py-1.5 rounded-xl shadow-hard-sm transition-all"
          >
            <div className="w-6 h-6 rounded-md bg-navy text-yellow font-heading font-black text-xs flex items-center justify-center">
              {currentMerchant ? currentMerchant.name.charAt(0) : 'M'}
            </div>
            <div className="text-left">
              <p className="text-xs font-heading font-bold text-navy leading-none truncate max-w-[130px]">
                {currentMerchant ? currentMerchant.name.split(' ')[0] : 'Merchant'}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                {currentMerchant ? currentMerchant.city.split(',')[0] : 'Sign In'}
              </p>
            </div>
            <span className="text-[10px] font-heading font-extrabold bg-navy text-white px-1.5 py-0.5 rounded ml-1">
              Switch
            </span>
          </Link>

          <Link to="/demo" className="btn-sm-yellow">
            Try demo →
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 rounded-xl border-2 border-navy bg-white shadow-hard-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
        >
          <svg className="w-6 h-6 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-navy bg-soft-blue px-6 py-6 flex flex-col gap-4 font-heading font-bold text-base shadow-lg animate-fadeIn">
          {/* Mobile Current Merchant Banner */}
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between bg-white border-2 border-navy p-3 rounded-xl shadow-hard-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-navy text-yellow font-heading font-black text-sm flex items-center justify-center">
                {currentMerchant ? currentMerchant.name.charAt(0) : 'M'}
              </div>
              <div>
                <p className="font-heading font-bold text-sm text-navy leading-none">
                  {currentMerchant ? currentMerchant.name : 'Merchant Login'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentMerchant ? currentMerchant.shopName : 'Tap to switch profile'}
                </p>
              </div>
            </div>
            <span className="text-xs font-heading font-bold text-royal bg-soft-blue px-2 py-1 rounded border border-navy/20">
              Switch ➔
            </span>
          </Link>

          <a
            href="/#problem"
            onClick={() => setMobileMenuOpen(false)}
            className="text-navy hover:text-sky py-2 border-b border-navy/10"
          >
            Problem
          </a>
          <a
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-navy hover:text-sky py-2 border-b border-navy/10"
          >
            How it works
          </a>
          <Link
            to="/demo"
            onClick={() => setMobileMenuOpen(false)}
            className="text-navy hover:text-sky py-2 border-b border-navy/10"
          >
            Demo Chat
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="text-navy hover:text-sky py-2 border-b border-navy/10"
          >
            Store Dashboard
          </Link>
          <div className="pt-2">
            <Link
              to="/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary w-full text-center"
            >
              Try the demo →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
