import React from 'react';

interface BrandEmblemProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  className?: string;
}

export const BrandEmblem: React.FC<BrandEmblemProps> = ({
  size = 'md',
  variant = 'light',
  className = ''
}) => {
  const dimensions = {
    sm: { box: 'w-8 h-8', svg: 24, font: 'text-[9px]' },
    md: { box: 'w-10 h-10', svg: 30, font: 'text-[11px]' },
    lg: { box: 'w-12 h-12', svg: 36, font: 'text-xs' }
  }[size];

  return (
    <div className={`relative ${dimensions.box} rounded-xl flex items-center justify-center shrink-0 shadow-sm ${className} ${
      variant === 'dark'
        ? 'bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#101B2D] border border-[#3B82F6]/30'
        : 'bg-[#101B2D] border border-[#1B2A42]'
    }`}>
      {/* Precision Geometric Vector Insignia */}
      <svg
        width={dimensions.svg}
        height={dimensions.svg}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" />
            <stop offset="0.6" stopColor="#2563EB" />
            <stop offset="1" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="goldAccent" x1="10" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Outer Hexagonal Shield Frame */}
        <path
          d="M20 3L35 9V20C35 29.5 28.5 35.8 20 38C11.5 35.8 5 29.5 5 20V9L20 3Z"
          fill="url(#shieldGrad)"
          stroke="#93C5FD"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner Tactical Crosshairs Grid */}
        <circle cx="20" cy="19" r="9" stroke="#93C5FD" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
        <line x1="20" y1="7" x2="20" y2="31" stroke="#BFDBFE" strokeWidth="1" opacity="0.4" />
        <line x1="8" y1="19" x2="32" y2="19" stroke="#BFDBFE" strokeWidth="1" opacity="0.4" />

        {/* Sahyadri Mountain Peak Silhouette */}
        <path
          d="M13 25L17.5 17.5L20 20.5L23.5 15L27 25H13Z"
          fill="#0F172A"
          opacity="0.8"
        />
        <path
          d="M16 25L18.5 20L21 23L23.5 18L26 25H16Z"
          fill="#F8FAFC"
          opacity="0.95"
        />

        {/* Central Core Satellite Beacon Star */}
        <circle cx="20" cy="14" r="2.2" fill="url(#goldAccent)" />
        <circle cx="20" cy="14" r="4" stroke="#FDE047" strokeWidth="0.8" opacity="0.8" />
      </svg>

      {/* Online Telemetry Live Dot */}
      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#15803D] border-2 border-[#101B2D]" />
    </div>
  );
};
