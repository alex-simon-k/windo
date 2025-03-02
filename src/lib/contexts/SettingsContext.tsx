'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  showAdditionalColumn: boolean;
  toggleAdditionalColumn: () => void;
  // Add other settings as needed
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showAdditionalColumn, setShowAdditionalColumn] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('user-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setShowAdditionalColumn(settings.showAdditionalColumn || false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('user-settings', JSON.stringify({
      showAdditionalColumn
    }));
  }, [showAdditionalColumn]);

  const toggleAdditionalColumn = () => {
    setShowAdditionalColumn(prev => !prev);
  };

  return (
    <SettingsContext.Provider value={{ 
      showAdditionalColumn, 
      toggleAdditionalColumn 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 