"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import AppSidebar from "@/components/app-sidebar";
import AppHeader from "@/components/app-header";
import { Logo } from '@/components/logo';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && user) {
        if (user.role === 'obc' && user.registrationStatus === 'pending' && pathname !== '/pending-approval') {
            router.push('/pending-approval');
            return;
        }

        if (user.role === 'obc' && user.registrationStatus === 'approved' && pathname === '/pending-approval') {
            router.push('/dashboard');
            return;
        }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
             <div className="flex flex-col items-center gap-4">
               <Logo className="h-8 w-8 text-primary animate-pulse" />
               <p className="text-muted-foreground">Verifying access...</p>
             </div>
        </div>
    );
  }
  
  // Prevent rendering children if user is pending and not on the correct page
  if (user.role === 'obc' && user.registrationStatus === 'pending' && pathname !== '/pending-approval') {
    return null; 
  }


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <AppSidebar />
      <div className="flex flex-col">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  )
}
