'use client';

import React from 'react';
import { useSystemSettings } from './SettingsProvider';

interface SystemLogoProps {
  className?: string;
  alt?: string;
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
}

export default function SystemLogo({
  className = 'h-9 w-auto object-contain',
  alt = 'Nghiêng Complex',
  style,
}: SystemLogoProps) {
  const { logoUrl } = useSystemSettings();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl || '/logo-nghieng.png'}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src !== '/logo-nghieng.png') {
          target.src = '/logo-nghieng.png';
        }
      }}
    />
  );
}
