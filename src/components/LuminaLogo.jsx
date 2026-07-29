import React from 'react';

export default function LuminaLogo({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lumina-mark-gradient" x1="9" y1="7" x2="56" y2="59">
          <stop stopColor="#C8BCFF" />
          <stop offset="0.42" stopColor="#856BFF" />
          <stop offset="1" stopColor="#4D22D8" />
        </linearGradient>
        <linearGradient id="lumina-mark-shine" x1="17" y1="13" x2="48" y2="52">
          <stop stopColor="white" stopOpacity="0.34" />
          <stop offset="0.52" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="3" y="3" width="58" height="58" rx="18" fill="url(#lumina-mark-gradient)" />
      <rect
        x="3.75"
        y="3.75"
        width="56.5"
        height="56.5"
        rx="17.25"
        stroke="white"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <path
        d="M8 28C15 14 28 8 45 9C30 13 19 22 14 38C11 36 9 33 8 28Z"
        fill="url(#lumina-mark-shine)"
      />

      <path
        d="M18.5 18V41.5C18.5 45.366 21.634 48.5 25.5 48.5H46.5"
        stroke="#100A26"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M29 29V38" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M37 23.5V43.5" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M45 28V39" stroke="white" strokeWidth="4.5" strokeLinecap="round" />

      <path
        d="M49.5 12.5C49.5 15.538 47.038 18 44 18C47.038 18 49.5 20.462 49.5 23.5C49.5 20.462 51.962 18 55 18C51.962 18 49.5 15.538 49.5 12.5Z"
        fill="white"
      />
    </svg>
  );
}
