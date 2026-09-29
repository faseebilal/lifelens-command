import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { LifeLensProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'LifeLens Command — See the consequences before they become problems',
  description:
    'An operational decision-intelligence platform that maps dependencies, detects cascading risks, and simulates hypothetical disruptions in real-time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070A0F] text-slate-100 antialiased min-h-screen">
        <AuthProvider>
          <LifeLensProvider>{children}</LifeLensProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
