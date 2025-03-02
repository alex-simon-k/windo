import "./globals.css";
import { PasswordProvider } from '@/lib/contexts/PasswordContext';
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
          <ProtectedLayout>
            {children}
          </ProtectedLayout>
        </PasswordProvider>
      </body>
    </html>
  );
}
