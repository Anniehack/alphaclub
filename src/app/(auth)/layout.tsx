"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    if (loading || user) {
        return (
            <div className="flex items-center justify-center h-screen">
                 <div className="flex flex-col items-center gap-4">
                   <Logo className="h-8 w-8 text-primary animate-pulse" />
                   <p className="text-muted-foreground">Redirecting to dashboard...</p>
                 </div>
            </div>
        );
    }
    
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6 text-primary" />
          <span className="text-lg">AlphaClub</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
    </div>
  )
}
