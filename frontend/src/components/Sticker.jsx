import React from 'react';

/**
 * Hand-crafted "Sticker" tag:
 * Small yellow rounded tag rotated about -3 degrees, with bold text,
 * hard 2px navy border and hard offset shadow.
 */
export const Sticker = ({ children, className = '', rotate = '-rotate-3', color = 'bg-yellow' }) => {
  return (
    <span
      className={`inline-block font-heading font-extrabold text-xs sm:text-sm tracking-wide text-navy px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl border-2 border-navy shadow-hard-sm transform ${rotate} ${color} ${className}`}
    >
      {children}
    </span>
  );
};

export default Sticker;

