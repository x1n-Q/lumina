import React from 'react';

export default function LuminaLogo({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Lumina"
      focusable="false"
    >
      <defs>
        <linearGradient id="lumina-mark-gradient" x1="10" y1="6" x2="55" y2="58">
          <stop stopColor="#AA98FF" />
          <stop offset="0.38" stopColor="#846BFA" />
          <stop offset="1" stopColor="#6547E8" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="17" fill="url(#lumina-mark-gradient)" />
      <path
        d="M18 18V41C18 44.866 21.134 48 25 48H47"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M29 31V39M37 25V42M45 29V38" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="16" r="3" fill="white" fillOpacity="0.9" />
    </svg>
  );
}
