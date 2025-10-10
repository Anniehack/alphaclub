
import type { Metadata, Viewport } from 'next';
import { ClientProviders } from '@/components/client-providers';
import { Quicksand } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'AlphaClub',
  description: 'Logistics and mission management for On-Board Couriers.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A237E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={cn(
          'antialiased min-h-screen bg-background font-sans',
          quicksand.variable
        )}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
