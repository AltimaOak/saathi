import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-navy-dark text-white border-t-2 border-navy py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow border-2 border-white/80 shadow-hard-sm flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="11" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="2" />
              <rect x="11" y="11" width="10" height="6" rx="2" fill="#0B1B3F" />
              <circle cx="13.5" cy="14" r="1" fill="#00B9F5" />
              <circle cx="18.5" cy="14" r="1" fill="#00B9F5" />
              <path d="M 13 20 Q 16 23 19 20" stroke="#0B1B3F" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl tracking-tight text-white">
              Saathi<span className="text-sky">.</span>
            </span>
            <p className="text-xs text-slate-300">
              AI teammate for Paytm merchants across India.
            </p>
          </div>
        </div>

        <div className="text-center md:text-right">
          <p className="font-heading font-medium text-sm text-slate-200">
            Saathi • Autonomous Action Engine
          </p>
          <p className="text-xs text-sky font-semibold mt-1">
            Built for merchants across India
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

