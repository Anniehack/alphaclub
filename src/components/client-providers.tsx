"use client"
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { initializeNotifications } from '@/lib/notifications';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize notifications when app starts
    initializeNotifications().catch(error => {
      console.error('Failed to initialize notifications:', error);
    });
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}
