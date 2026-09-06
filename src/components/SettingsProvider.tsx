'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  logoUrl: '/logo-nghieng.png',
  setLogoUrl: () => {},
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string>('/logo-nghieng.png');

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.system_logo) {
          setLogoUrl(data.settings.system_logo);
        }
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ logoUrl, setLogoUrl, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  return useContext(SettingsContext);
}
