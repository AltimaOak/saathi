import React from 'react';

/**
 * Hand-drawn flat SVG of Saathi Mascot:
 * Friendly round-head robot mascot with an antenna, big expressive eyes,
 * a glowing heart on its chest, tool belt/action ready badge.
 * Flat colors, thick navy outlines, rounded shapes.
 */
export const SaathiMascot = ({ className = "w-full h-auto", size = 280, showTools = true, animated = true }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        viewBox="0 0 280 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="Saathi - Friendly Paytm AI robot mascot with heart on chest"
      >
        {/* Soft shadow */}
        <ellipse cx="140" cy="305" rx="75" ry="9" fill="#CBD5E1" stroke="#0B1B3F" strokeWidth="2" />

        {/* Mascot Feet */}
        <ellipse cx="110" cy="290" rx="18" ry="12" fill="#002970" stroke="#0B1B3F" strokeWidth="2.5" />
        <ellipse cx="170" cy="290" rx="18" ry="12" fill="#002970" stroke="#0B1B3F" strokeWidth="2.5" />

        {/* Mascot Legs */}
        <rect x="102" y="250" width="16" height="40" rx="6" fill="#00B9F5" stroke="#0B1B3F" strokeWidth="2.5" />
        <rect x="162" y="250" width="16" height="40" rx="6" fill="#00B9F5" stroke="#0B1B3F" strokeWidth="2.5" />
        {/* Joint lines */}
        <line x1="102" y1="268" x2="118" y2="268" stroke="#0B1B3F" strokeWidth="2" />
        <line x1="162" y1="268" x2="178" y2="268" stroke="#0B1B3F" strokeWidth="2" />

        {/* Mascot Body (Chubby, friendly capsule) */}
        <rect x="85" y="160" width="110" height="105" rx="36" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="3" />

        {/* Belly Panel / Screen */}
        <rect x="100" y="180" width="80" height="70" rx="20" fill="#EAF4FD" stroke="#0B1B3F" strokeWidth="2" />

        {/* HEART ON CHEST (Required by prompt) */}
        <g transform="translate(140, 212)">
          <path
            d="M 0 10 C -14 0, -22 -14, -10 -20 C 0 -22, 0 -12, 0 -10 C 0 -12, 0 -22, 10 -20 C 22 -14, 14 0, 0 10 Z"
            fill="#EF4444"
            stroke="#0B1B3F"
            strokeWidth="2"
            className={animated ? "animate-pulse" : ""}
          />
          {/* Heart highlight shine */}
          <circle cx="-5" cy="-14" r="2" fill="#FFFFFF" />
        </g>

        {/* Left Arm (waving or thumbs-up) */}
        <path
          d="M 85 185 C 55 180, 45 155, 45 140"
          fill="none"
          stroke="#0B1B3F"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 85 185 C 55 180, 45 155, 45 140"
          fill="none"
          stroke="#00B9F5"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Hand */}
        <circle cx="45" cy="135" r="10" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2" />
        {/* Thumbs up thumb */}
        <rect x="42" y="120" width="6" height="12" rx="3" fill="#FFC845" stroke="#0B1B3F" strokeWidth="1.5" />

        {/* Right Arm (resting gently on waist / ready to act) */}
        <path
          d="M 195 185 C 220 195, 228 220, 205 240"
          fill="none"
          stroke="#0B1B3F"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 195 185 C 220 195, 228 220, 205 240"
          fill="none"
          stroke="#00B9F5"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Hand */}
        <circle cx="202" cy="240" r="9" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2" />

        {/* Neck connector */}
        <rect x="125" y="148" width="30" height="16" rx="4" fill="#002970" stroke="#0B1B3F" strokeWidth="2.5" />
        <line x1="125" y1="156" x2="155" y2="156" stroke="#00B9F5" strokeWidth="2" />

        {/* Robot Round Head (Friendly big sphere) */}
        <circle cx="140" cy="90" r="58" fill="#FFFFFF" stroke="#0B1B3F" strokeWidth="3.5" />

        {/* Antenna */}
        <line x1="140" y1="32" x2="140" y2="12" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />
        <circle cx="140" cy="10" r="8" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2.5" />
        <circle cx="142" cy="8" r="2" fill="#FFFFFF" />

        {/* Robot Ears / Headphone discs */}
        <rect x="76" y="75" width="8" height="30" rx="4" fill="#002970" stroke="#0B1B3F" strokeWidth="2" />
        <rect x="196" y="75" width="8" height="30" rx="4" fill="#002970" stroke="#0B1B3F" strokeWidth="2" />

        {/* Visor / Eye display */}
        <rect x="98" y="62" width="84" height="44" rx="14" fill="#0B1B3F" stroke="#0B1B3F" strokeWidth="2" />

        {/* Happy Glowing Eyes (sky blue oval arcs) */}
        <ellipse cx="123" cy="82" rx="10" ry="12" fill="#00B9F5" />
        <ellipse cx="123" cy="82" rx="7" ry="9" fill="#E1F6FD" />
        <circle cx="125" cy="78" r="3" fill="#FFFFFF" />

        <ellipse cx="157" cy="82" rx="10" ry="12" fill="#00B9F5" />
        <ellipse cx="157" cy="82" rx="7" ry="9" fill="#E1F6FD" />
        <circle cx="159" cy="78" r="3" fill="#FFFFFF" />

        {/* Friendly smile curve */}
        <path d="M 128 118 Q 140 128 152 118" fill="none" stroke="#0B1B3F" strokeWidth="3" strokeLinecap="round" />

        {/* Cute blush cheeks */}
        <ellipse cx="106" cy="116" rx="6" ry="4" fill="#FFC845" opacity="0.8" />
        <ellipse cx="174" cy="116" rx="6" ry="4" fill="#FFC845" opacity="0.8" />

        {/* Floating action tool badge if enabled */}
        {showTools && (
          <g transform="translate(195, 30)">
            <rect x="0" y="0" width="70" height="28" rx="8" fill="#FFC845" stroke="#0B1B3F" strokeWidth="2" />
            <text x="35" y="18" fill="#0B1B3F" fontSize="9" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif" textAnchor="middle">
              ⚡ TAKES ACTION
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default SaathiMascot;

