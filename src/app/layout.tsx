import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { LifeLensProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'LifeLens Command — See the consequences before they become problems',
  description:
    'An operational decision-intelligence platform that maps dependencies, detects cascading risks, and simulates hypothetical disruptions in real-time.',
  manifest: '/manifest.json',
  icons: {
    icon: '/lifelens.png',
    apple: '/lifelens.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LifeLens Command',
  },
};

export const viewport: Viewport = {
  themeColor: '#070A0F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
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
