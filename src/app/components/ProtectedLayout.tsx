'use client';

import { usePassword } from '@/lib/contexts/PasswordContext';
import PasswordProtection from './PasswordProtection';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = usePassword();

  if (!isAuthenticated) {
    return <PasswordProtection />;
  }

  return <>{children}</>;
} 