import React from 'react';

interface CornerPatternProps {
  variant?: 'arcs' | 'dots' | 'petals' | 'frame';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  colorClass?: string;
}

export const CornerPattern: React.FC<CornerPatternProps> = ({
  variant = 'arcs',
  position = 'top-left',
  colorClass = 'text-[#5C1A2B]/[0.11]',
}) => {
  const posClasses: Record<string, string> = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0 scale-x-[-1]',
    'bottom-left': 'bottom-0 left-0 scale-y-[-1]',
    'bottom-right': 'bottom-0 right-0 scale-[-1]',
  };

  return (
    <div
      className={`pointer-events-none select-none absolute ${posClasses[position]} ${colorClass}`}
      aria-hidden="true"
    >
      {variant === 'arcs' && (
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="0" cy="0" r="26" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="44" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 5" />
          <circle cx="0" cy="0" r="60" stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
      {variant === 'dots' && (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="14" cy="14" r="2" fill="currentColor" />
          <circle cx="28" cy="14" r="2" fill="currentColor" />
          <circle cx="42" cy="14" r="1.5" fill="currentColor" />
          <circle cx="14" cy="28" r="2" fill="currentColor" />
          <circle cx="28" cy="28" r="1.5" fill="currentColor" />
          <circle cx="14" cy="42" r="1.5" fill="currentColor" />
        </svg>
      )}
      {variant === 'petals' && (
        <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
          <path d="M0 38C21 38 38 21 38 0" stroke="currentColor" strokeWidth="1.2" />
          <path d="M0 58C32 58 58 32 58 0" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      )}
      {variant === 'frame' && (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M12 42V16C12 13.8 13.8 12 16 12H42" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M20 30V22C20 20.9 20.9 20 22 20H30" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};
