import React from 'react';

/**
 * DigiXLogo - Standardized, reusable Brand Logo Component
 * Uses the official DigiX orange network-style logo asset (/images/digix-logo.png)
 */
export const DigiXLogo = ({
  size = 'md',
  variant = 'plain',
  showText = false,
  textColor = 'dark',
  subtitle = 'Technologies',
  className = '',
  imgClassName = '',
  alt = 'DigiX Technologies Logo',
  onClick,
}) => {
  // Sizing maps
  const sizeMap = {
    xs: { img: 'w-6 h-6', badge: 'w-7 h-7 rounded-lg', text: 'text-sm', sub: 'text-[9px]' },
    sm: { img: 'w-8 h-8', badge: 'w-8 h-8 rounded-lg', text: 'text-base', sub: 'text-[10px]' },
    md: { img: 'w-9 h-9', badge: 'w-9 h-9 rounded-xl', text: 'text-base', sub: 'text-[10px]' },
    lg: { img: 'w-12 h-12', badge: 'w-12 h-12 rounded-xl', text: 'text-lg', sub: 'text-xs' },
    xl: { img: 'w-16 h-16', badge: 'w-16 h-16 rounded-2xl', text: 'text-xl', sub: 'text-xs' },
    '2xl': { img: 'w-20 h-20', badge: 'w-20 h-20 rounded-2xl', text: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const logoImage = (
    <img
      src="/images/digix-logo.png"
      alt={alt}
      className={`object-contain transition-transform duration-200 ${currentSize.img} ${imgClassName}`}
      loading="eager"
    />
  );

  const renderedEmblem = variant === 'badge' ? (
    <div
      className={`bg-white flex items-center justify-center p-1 border border-slate-200/80 shadow-xs flex-shrink-0 ${currentSize.badge} ${className}`}
      onClick={onClick}
    >
      {logoImage}
    </div>
  ) : (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${currentSize.img} ${className}`}
      onClick={onClick}
    >
      {logoImage}
    </div>
  );

  if (!showText) {
    return renderedEmblem;
  }

  const isLightText = textColor === 'light';

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {renderedEmblem}
      <div className="flex flex-col text-left min-w-0">
        <span
          className={`font-bold tracking-tight leading-none flex items-center gap-1 ${currentSize.text} ${
            isLightText ? 'text-white' : 'text-slate-900'
          }`}
        >
          <span>Digi</span>
          <span className={isLightText ? 'text-sky-400' : 'text-digix-500'}>X</span>
        </span>
        {subtitle && (
          <span
            className={`font-medium tracking-wide mt-0.5 truncate ${currentSize.sub} ${
              isLightText ? 'text-sky-200/80' : 'text-slate-400'
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default DigiXLogo;
