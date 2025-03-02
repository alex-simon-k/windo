'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PasswordContextType {
  isAuthenticated: boolean;
  authenticate: (password: string) => boolean;
  logout: () => void;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

// You can change this to your desired password
const CORRECT_PASSWORD = 'W1nd0-#2025';

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const authenticated = localStorage.getItem('password-authenticated') === 'true';
    setIsAuthenticated(authenticated);
  }, []);

  const authenticate = (password: string) => {
    const isCorrect = password === CORRECT_PASSWORD;
    if (isCorrect) {
      setIsAuthenticated(true);
      localStorage.setItem('password-authenticated', 'true');
    }
    return isCorrect;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('password-authenticated');
  };

  return (
    <PasswordContext.Provider value={{ isAuthenticated, authenticate, logout }}>
      {children}
    </PasswordContext.Provider>
  );
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error('usePassword must be used within a PasswordProvider');
  }
  return context;
} 