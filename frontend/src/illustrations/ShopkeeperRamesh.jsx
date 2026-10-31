import React from 'react';

/**
 * Hand-drawn flat SVG of Ramesh - Kirana storekeeper in Mumbai,
 * holding his smartphone with Paytm merchant notification.
 * Thick navy outlines, warm Indian fintech character style.
 */
export const ShopkeeperRamesh = ({ className = "w-full h-auto", emotion = "concerned" }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Ramesh - Mumbai shopkeeper holding his smartphone"
      >
        {/* Soft shadow */}
        <ellipse cx="160" cy="365" rx="100" ry="10" fill="#EAF4FD" stroke="#0B1B3F" strokeWidth="2" />

        {/* Kurta / Body */}
        <path
          d="M 90 230 C 90 200, 110 185, 140 180 L 180 180 C 210 185, 230 200, 230 230 L 245 350 L 75 350 Z"
          fill="#00B9F5"
          stroke="#0B1B3F"
          strokeWidth="3"
        />

        {/* Nehru jacket / Bandi on top */}
        <path
          d="M 100 230 L 125 350 L 195 350 L 220 230 C 205 200, 175 195, 160 195 C 145 195, 115 200, 100 230 Z"
          fill="#002970"
          stroke="#0B1B3F"
          strokeWidth="2.5"
        />

        {/* Jacket buttons */}
        <circle cx="160" cy="235" r="3" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1" />
        <circle cx="160" cy="265" r="3" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1" />
        <circle cx="160" cy="295" r="3" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1" />
        <circle cx="160" cy="325" r="3" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1" />

        {/* Kurta collar & neck */}
        <rect x="145" y="150" width="30" height="35" rx="4" fill="#F8B179" stroke="#0B1B3F" strokeWidth="2.5" />
        <path d="M 140 180 L 160 195 L 180 180" fill="none" stroke="#0B1B3F" strokeWidth="2.5" />

        {/* Head / Face */}
        <ellipse cx="160" cy="115" rx="46" ry="52" fill="#F8B179" stroke="#0B1B3F" strokeWidth="3" />

        {/* Ears */}
        <ellipse cx="112" cy="120" rx="9" ry="14" fill="#F8B179" stroke="#0B1B3F" strokeWidth="2.5" />
        <ellipse cx="208" cy="120" rx="9" ry="14" fill="#F8B179" stroke="#0B1B3F" strokeWidth="2.5" />

        {/* Hair */}
        <path
          d="M 115 105 C 115 65, 140 50, 160 50 C 180 50, 205 65, 205 105 C 205 80, 185 70, 160 70 C 135 70, 115 80, 115 105 Z"
          fill="#0B1B3F"
        />
        <path
          d="M 115 105 C 115 60, 140 48, 160 48 C 180 48, 205 60, 205 105"
          fill="none"
          stroke="#0B1B3F"
          strokeWidth="3"
        />

        {/* Eyebrows */}
        {emotion === 'concerned' ? (
          <>
            <path d="M 132 100 Q 142 95 148 98" fill="none" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />
            <path d="M 188 100 Q 178 95 172 98" fill="none" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M 132 97 Q 142 93 148 95" fill="none" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />
            <path d="M 172 95 Q 178 93 188 97" fill="none" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {/* Eyes */}
        <circle cx="140" cy="112" r="5" fill="#0B1B3F" />
        <circle cx="142" cy="110" r="1.5" fill="#FFFFFF" />
        <circle cx="180" cy="112" r="5" fill="#0B1B3F" />
        <circle cx="182" cy="110" r="1.5" fill="#FFFFFF" />

        {/* Eyeglasses (thin wireframe, gives thoughtful relatable Indian shopkeeper look) */}
        <rect x="127" y="103" width="26" height="20" rx="6" fill="none" stroke="#0B1B3F" strokeWidth="2" />
        <rect x="167" y="103" width="26" height="20" rx="6" fill="none" stroke="#0B1B3F" strokeWidth="2" />
        <line x1="153" y1="112" x2="167" y2="112" stroke="#0B1B3F" strokeWidth="2" />

        {/* Nose */}
        <path d="M 160 115 Q 163 125 157 128" fill="none" stroke="#0B1B3F" strokeWidth="2" strokeLinecap="round" />

        {/* Classic Indian Moustache */}
        <path
          d="M 140 138 C 148 133, 155 137, 160 137 C 165 137, 172 133, 180 138 C 172 144, 160 144, 160 144 C 160 144, 148 144, 140 138 Z"
          fill="#0B1B3F"
          stroke="#0B1B3F"
          strokeWidth="1.5"
        />

        {/* Mouth */}
        {emotion === 'concerned' ? (
          <path d="M 152 150 Q 160 147 168 150" fill="none" stroke="#0B1B3F" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M 150 149 Q 160 155 170 149" fill="none" stroke="#0B1B3F" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Left Arm holding nothing / relaxed */}
        <path
          d="M 90 230 Q 60 280 80 320"
          fill="none"
          stroke="#0B1B3F"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 90 230 Q 60 280 80 320"
          fill="none"
          stroke="#00B9F5"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Right Arm holding phone up */}
        <path
          d="M 230 230 Q 265 260 240 295"
          fill="none"
          stroke="#0B1B3F"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 230 230 Q 265 260 240 295"
          fill="none"
          stroke="#00B9F5"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Right Hand */}
        <ellipse cx="238" cy="285" rx="14" ry="14" fill="#F8B179" stroke="#0B1B3F" strokeWidth="2" />

        {/* SMARTPHONE in Ramesh's hand */}
        <g transform="translate(220, 220) rotate(-8)">
          {/* Phone body */}
          <rect x="0" y="0" width="55" height="95" rx="9" fill="#0B1B3F" stroke="#0B1B3F" strokeWidth="2" />
          {/* Screen */}
          <rect x="3" y="5" width="49" height="85" rx="6" fill="#FFFFFF" />
          {/* Paytm app top bar */}
          <rect x="3" y="5" width="49" height="15" rx="4" fill="#002970" />
          <text x="27" y="15" fill="#00B9F5" fontSize="7" fontWeight="bold" textAnchor="middle">Paytm</text>

          {/* Chat bubbles on phone screen */}
          <rect x="6" y="24" width="34" height="12" rx="3" fill="#EAF4FD" stroke="#0B1B3F" strokeWidth="0.8" />
          <text x="9" y="32" fill="#0B1B3F" fontSize="5" fontWeight="600">Settlement late?</text>

          <rect x="14" y="40" width="35" height="15" rx="3" fill="#002970" />
          <text x="17" y="48" fill="#FFC845" fontSize="4.5" fontWeight="bold">Saathi: Fixed via IMPS!</text>
          <text x="17" y="53" fill="#FFFFFF" fontSize="4">₹4,850 credited</text>

          {/* Green checkmark pill */}
          <rect x="12" y="60" width="30" height="9" rx="4.5" fill="#10B981" />
          <text x="27" y="67" fill="#FFFFFF" fontSize="5" fontWeight="bold" textAnchor="middle">✓ ₹4,850 DONE</text>

          {/* Phone home indicator */}
          <line x1="20" y1="86" x2="35" y2="86" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};

export default ShopkeeperRamesh;

