import React from 'react';

/**
 * Hand-drawn flat SVG Kirana Shop Stall with striped awning,
 * counter, "Scan to Pay" Paytm QR stand and Soundbox.
 * Thick navy outlines, flat colors.
 */
export const KiranaShop = ({ className = "w-full h-auto", speechText = "Where is my money?" }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* Dynamic Speech Bubble */}
      <div className="absolute -top-10 sm:-top-12 left-1/4 sm:left-1/3 transform -translate-x-1/2 z-20 transition-all duration-300">
        <div className="relative bg-white border-2 border-navy px-4 py-2 rounded-2xl shadow-hard font-heading font-bold text-xs sm:text-sm text-navy whitespace-nowrap flex items-center gap-1.5 animate-bounce">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${speechText.includes('here') ? 'bg-emerald-500' : 'bg-yellow'}`}></span>
          <span>{speechText}</span>
          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-6 w-3 h-3 bg-white border-r-2 border-b-2 border-navy transform rotate-45"></div>
        </div>
      </div>

      <svg
        viewBox="0 0 520 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Hand-drawn Kirana Shop Stall with Paytm QR and Soundbox"
      >
        {/* Ground / shadow */}
        <ellipse cx="260" cy="405" rx="230" ry="12" fill="#EAF4FD" stroke="#0B1B3F" strokeWidth="2.5" />

        {/* Shop Main Building Structure */}
        <rect x="70" y="110" width="380" height="280" rx="14" fill="#F8FBFE" stroke="#0B1B3F" strokeWidth="3" />

        {/* Wall brick / plank details */}
        <line x1="85" y1="170" x2="135" y2="170" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="390" y1="170" x2="435" y2="170" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="95" y1="230" x2="135" y2="230" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="380" y1="230" x2="425" y2="230" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

        {/* Top Shop Board */}
        <rect x="100" y="60" width="320" height="50" rx="8" fill="#0B1B3F" stroke="#0B1B3F" strokeWidth="3" />
        <rect x="106" y="66" width="308" height="38" rx="5" fill="#002970" />
        <text x="260" y="91" fill="#FFC845" fontSize="18" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif" textAnchor="middle" letterSpacing="1.5">
          RAMESH KIRANA & CHAI
        </text>

        {/* Awning hanging rods */}
        <line x1="60" y1="120" x2="90" y2="70" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />
        <line x1="460" y1="120" x2="430" y2="70" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />

        {/* Striped Awning */}
        <path
          d="M 40 115 L 80 115 L 70 155 L 30 155 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 80 115 L 120 115 L 115 155 L 70 155 Z"
          fill="#FFFFFF"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 120 115 L 160 115 L 160 155 L 115 155 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 160 115 L 200 115 L 205 155 L 160 155 Z"
          fill="#FFFFFF"
          stroke="#0B1B3F"
        strokeWidth="3"
        />
        <path
          d="M 200 115 L 240 115 L 250 155 L 205 155 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 240 115 L 280 115 L 270 155 L 250 155 Z"
          fill="#FFFFFF"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 280 115 L 320 115 L 315 155 L 270 155 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 320 115 L 360 115 L 360 155 L 315 155 Z"
          fill="#FFFFFF"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 360 115 L 400 115 L 405 155 L 360 155 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 400 115 L 440 115 L 450 155 L 405 155 Z"
          fill="#FFFFFF"
          stroke="#0B1B3F"
          strokeWidth="3"
        />
        <path
          d="M 440 115 L 480 115 L 490 155 L 450 155 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />

        {/* Awning scalloped bottoms */}
        <path d="M 30 155 Q 50 168 70 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 70 155 Q 92 168 115 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 115 155 Q 137 168 160 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 160 155 Q 182 168 205 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 205 155 Q 227 168 250 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 250 155 Q 260 168 270 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 270 155 Q 292 168 315 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 315 155 Q 337 168 360 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 360 155 Q 382 168 405 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 405 155 Q 427 168 450 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />
        <path d="M 450 155 Q 470 168 490 155" fill="none" stroke="#0B1B3F" strokeWidth="3" />

        {/* Back Shelf with Goods */}
        <rect x="140" y="165" width="240" height="90" rx="6" fill="#EAF4FD" stroke="#0B1B3F" strokeWidth="2.5" />
        <line x1="140" y1="210" x2="380" y2="210" stroke="#0B1B3F" strokeWidth="2.5" />

        {/* Jars on top shelf */}
        <rect x="155" y="175" width="22" height="30" rx="4" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2" />
        <line x1="155" y1="182" x2="177" y2="182" stroke="#0B1B3F" strokeWidth="1.5" />
        <rect x="187" y="172" width="26" height="33" rx="4" fill="#00B9F5" stroke="#0B1B3F" strokeWidth="2" />
        <line x1="187" y1="180" x2="213" y2="180" stroke="#0B1B3F" strokeWidth="1.5" />
        <rect x="223" y="176" width="20" height="29" rx="4" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2" />
        <rect x="253" y="174" width="24" height="31" rx="4" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="2" />

        {/* Chai kettle on top shelf */}
        <path d="M 300 205 L 330 205 L 325 185 L 305 185 Z" fill="#002970" stroke="#0B1B3F" strokeWidth="2" />
        <path d="M 330 195 Q 345 190 338 182" fill="none" stroke="#0B1B3F" strokeWidth="2" strokeLinecap="round" />
        <path d="M 297 195 Q 288 190 302 182" fill="none" stroke="#0B1B3F" strokeWidth="2" strokeLinecap="round" />
        <circle cx="315" cy="180" r="4" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1.5" />

        {/* Biscuits and items on lower shelf */}
        <rect x="155" y="218" width="35" height="32" rx="3" fill="#00B9F5" stroke="#0B1B3F" strokeWidth="2" />
        <text x="172" y="238" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">PARLE</text>
        <rect x="200" y="222" width="45" height="28" rx="3" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2" />
        <text x="222" y="239" fill="#0B1B3F" fontSize="8" fontWeight="bold" textAnchor="middle">ATTA</text>
        <rect x="255" y="220" width="30" height="30" rx="3" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="2" />
        <text x="270" y="238" fill="#0B1B3F" fontSize="8" fontWeight="bold" textAnchor="middle">TEA</text>

        {/* Front Wooden/Brick Counter */}
        <rect x="85" y="265" width="350" height="125" rx="8" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="3" />
        {/* Countertop ledge */}
        <rect x="75" y="255" width="370" height="18" rx="6" fill="#0B1B3F" />
        <line x1="85" y1="310" x2="435" y2="310" stroke="#E2E8F0" strokeWidth="2" />
        <line x1="85" y1="355" x2="435" y2="355" stroke="#E2E8F0" strokeWidth="2" />

        {/* Counter Front Plate: "PAYTM ACCEPTED HERE" */}
        <rect x="160" y="325" width="200" height="38" rx="6" fill="#002970" stroke="#0B1B3F" strokeWidth="2" />
        <text x="260" y="349" fill="#FFFFFF" fontSize="13" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif" textAnchor="middle">
          Pay<tspan fill="#00B9F5">tm</tspan> ACCEPTED HERE
        </text>

        {/* PAYTM QR CODE STAND on the counter */}
        <g transform="translate(115, 205)">
          {/* Base */}
          <ellipse cx="25" cy="52" rx="20" ry="5" fill="#CBD5E1" stroke="#0B1B3F" strokeWidth="2" />
          <path d="M 23 52 L 23 35 L 27 35 L 27 52 Z" fill="#0B1B3F" />
          {/* Board */}
          <rect x="5" y="0" width="40" height="42" rx="5" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="2" />
          {/* Top header blue */}
          <rect x="5" y="0" width="40" height="11" rx="4" fill="#002970" />
          <text x="25" y="8" fill="#00B9F5" fontSize="6" fontWeight="bold" textAnchor="middle">Paytm QR</text>
          {/* QR pattern representation */}
          <rect x="12" y="14" width="8" height="8" fill="#0B1B3F" />
          <rect x="14" y="16" width="4" height="4" fill="#FFFFFF" />
          <rect x="28" y="14" width="8" height="8" fill="#0B1B3F" />
          <rect x="30" y="16" width="4" height="4" fill="#FFFFFF" />
          <rect x="12" y="26" width="8" height="8" fill="#0B1B3F" />
          <rect x="14" y="28" width="4" height="4" fill="#FFFFFF" />
          <rect x="24" y="25" width="4" height="4" fill="#0B1B3F" />
          <rect x="31" y="28" width="5" height="5" fill="#0B1B3F" />
          {/* Tagline */}
          <rect x="8" y="36" width="34" height="4" rx="2" fill="#FFC845" />
          <text x="25" y="39.5" fill="#0B1B3F" fontSize="4" fontWeight="800" textAnchor="middle">SCAN TO PAY</text>
        </g>

        {/* PAYTM SOUNDBOX on the counter */}
        <g transform="translate(370, 205)">
          {/* Base shadow */}
          <ellipse cx="22" cy="53" rx="18" ry="4" fill="#CBD5E1" stroke="#0B1B3F" strokeWidth="1.5" />
          {/* Main soundbox body */}
          <rect x="5" y="12" width="34" height="40" rx="7" fill="#002970" stroke="#0B1B3F" strokeWidth="2" />
          {/* White speaker grille */}
          <rect x="9" y="17" width="26" height="24" rx="4" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="1.5" />
          {/* Speaker mesh holes */}
          <circle cx="16" cy="23" r="1.5" fill="#0B1B3F" />
          <circle cx="22" cy="23" r="1.5" fill="#0B1B3F" />
          <circle cx="28" cy="23" r="1.5" fill="#0B1B3F" />
          <circle cx="16" cy="29" r="1.5" fill="#0B1B3F" />
          <circle cx="22" cy="29" r="1.5" fill="#0B1B3F" />
          <circle cx="28" cy="29" r="1.5" fill="#0B1B3F" />
          <circle cx="22" cy="35" r="1.5" fill="#0B1B3F" />
          {/* Sound waves emitting */}
          <path d="M 43 20 Q 48 27 43 34" fill="none" stroke="#00B9F5" strokeWidth="2" strokeLinecap="round" />
          <path d="M 47 16 Q 54 27 47 38" fill="none" stroke="#00B9F5" strokeWidth="2" strokeLinecap="round" />
          {/* LED green status */}
          <circle cx="22" cy="45" r="2" fill="#10B981" />
        </g>

        {/* Glass jars on counter */}
        <rect x="330" y="228" width="22" height="28" rx="4" fill="#EAF4FD" stroke="#0B1B3F" strokeWidth="2" />
        <rect x="334" y="224" width="14" height="5" rx="1" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1.5" />
        {/* Candies inside */}
        <circle cx="338" cy="242" r="3" fill="#00B9F5" />
        <circle cx="344" cy="245" r="3" fill="#FFC845" />

        {/* Hanging Chips/Snack Packets strip on right edge */}
        <line x1="440" y1="150" x2="440" y2="280" stroke="#0B1B3F" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="432" y="170" width="16" height="22" rx="2" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1.5" />
        <rect x="432" y="200" width="16" height="22" rx="2" fill="#00B9F5" stroke="#0B1B3F" strokeWidth="1.5" />
        <rect x="432" y="230" width="16" height="22" rx="2" fill="#EF4444" stroke="#0B1B3F" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export default KiranaShop;

