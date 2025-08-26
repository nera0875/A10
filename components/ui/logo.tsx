import React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Cercle de fond simple */}
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="#1f2937"
          className="drop-shadow-sm"
        />
        
        {/* Lettre A stylisée */}
        <path
          d="M18 32 L24 16 L30 32 M20.5 27 L27.5 27"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Chiffres 01 en petit */}
        <text
          x="32"
          y="18"
          fontSize="8"
          fill="white"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="600"
        >
          01
        </text>
        

      </svg>
    </div>
  )
}

export function LogoWithText({ className = '', size = 'md' }: LogoProps) {
  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={size} />
      <span className={`font-bold text-gray-900 ${textSizeClasses[size]}`}>
        A01
      </span>
    </div>
  )
}