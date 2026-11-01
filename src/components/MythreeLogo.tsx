import React from 'react'

interface MythreeLogoProps {
  variant?: 'full' | 'icon' | 'horizontal'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: string // default #10375C or 'currentColor'
  showTagline?: boolean
}

export function MythreeLogo({
  variant = 'horizontal',
  size = 'md',
  className = '',
  color,
  showTagline = true,
}: MythreeLogoProps) {
  // Size metrics
  const iconSizes = {
    sm: { w: 28, h: 22 },
    md: { w: 38, h: 30 },
    lg: { w: 56, h: 44 },
    xl: { w: 84, h: 66 },
  }

  const fillColor = color || '#10375C'

  // The distinctive Mythree Crown SVG Symbol
  const CrownSvg = ({ w = 38, h = 30 }: { w?: number; h?: number }) => (
    <svg
      width={w}
      height={h}
      viewBox="0 0 200 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
    >
      {/* Crown base & body */}
      <path
        d="M 28 35 
           L 72 82 
           L 100 24 
           L 128 82 
           L 172 35 
           L 165 110 
           Q 100 102 35 110 
           Z"
        fill={fillColor}
      />
      {/* Center diamond cut-out */}
      <polygon
        points="100,44 116,68 100,92 84,68"
        fill="#FFFFFF"
      />
      {/* Center top dot */}
      <circle cx="100" cy="14" r="6" fill={fillColor} />
      {/* Left top semicircle (facing left) */}
      <path d="M 28 27 A 7 7 0 0 0 28 41 Z" fill={fillColor} />
      {/* Right top semicircle (facing right) */}
      <path d="M 172 27 A 7 7 0 0 1 172 41 Z" fill={fillColor} />
    </svg>
  )

  if (variant === 'icon') {
    const s = iconSizes[size]
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <CrownSvg w={s.w} h={s.h} />
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        <CrownSvg w={size === 'xl' ? 120 : size === 'lg' ? 90 : 64} h={size === 'xl' ? 95 : size === 'lg' ? 70 : 50} />
        <span
          className="mt-2 font-black tracking-wider uppercase text-foreground leading-none"
          style={{
            fontSize: size === 'xl' ? '2.5rem' : size === 'lg' ? '1.875rem' : '1.375rem',
            color: color || undefined,
            letterSpacing: '0.06em',
          }}
        >
          MYTHREE
        </span>
        {showTagline && (
          <span
            className="mt-1 font-bold uppercase tracking-widest text-muted-foreground leading-tight"
            style={{
              fontSize: size === 'xl' ? '0.875rem' : size === 'lg' ? '0.75rem' : '0.625rem',
              letterSpacing: '0.22em',
            }}
          >
            LADIES HOSTEL
          </span>
        )}
      </div>
    )
  }

  // Default: 'horizontal'
  const isSm = size === 'sm'
  const isLg = size === 'lg' || size === 'xl'

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <CrownSvg
        w={isSm ? 28 : isLg ? 46 : 36}
        h={isSm ? 22 : isLg ? 36 : 28}
      />
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-black tracking-wide text-foreground uppercase ${
            isSm ? 'text-sm' : isLg ? 'text-xl' : 'text-base'
          }`}
          style={{ color: color || undefined, letterSpacing: '0.05em' }}
        >
          MYTHREE
        </span>
        {showTagline && (
          <span
            className={`font-bold tracking-widest uppercase text-muted-foreground ${
              isSm ? 'text-[8px]' : isLg ? 'text-[11px]' : 'text-[9px]'
            }`}
            style={{ letterSpacing: '0.18em', marginTop: '2px' }}
          >
            LADIES HOSTEL
          </span>
        )}
      </div>
    </div>
  )
}
