import "./globals.css";
import { PasswordProvider } from '@/lib/contexts/PasswordContext';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import ProtectedLayout from './components/ProtectedLayout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PasswordProvider>
          <SettingsProvider>
            <ProtectedLayout>
              {children}
            </ProtectedLayout>
          </SettingsProvider>
        </PasswordProvider>
      </body>
    </html>
  );
}
