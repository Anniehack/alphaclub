
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Users,
  PlaneTakeoff,
  UserCircle,
  LogOut,
  MessageSquare,
  Receipt
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useUser } from "@/hooks/use-user"
import { useEffect, useRef } from "react"
import { requestNotificationPermission } from "@/lib/firebase-messaging"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Logo } from "@/components/logo"
import type { Notification } from "@/types"

interface AppSidebarProps {
  isMobile?: boolean;
}

export default function AppSidebar({ isMobile = false }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (user && "Notification" in window && Notification.permission !== "denied") {
        const alreadyRequested = sessionStorage.getItem('fcm_permission_requested');
        if (!alreadyRequested) {
            console.log("Requesting notification permission...");
            requestNotificationPermission();
            sessionStorage.setItem('fcm_permission_requested', 'true');
        }
    }
  }, [user]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    sessionStorage.removeItem('fcm_permission_requested'); // Clean up on logout
    router.push('/login');
  };

  const adminNavItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/missions", icon: PlaneTakeoff, label: "Missions" },
    { href: "/obc-management", icon: Users, label: "OBC Management" },
    { href: "/expense-reports", icon: Receipt, label: "Expense Reports" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/profile", icon: UserCircle, label: "Profile" },
  ];

  const obcNavItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/missions", icon: PlaneTakeoff, label: "Missions" },
    { href: "/profile", icon: UserCircle, label: "Profile" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : obcNavItems;

  if (user?.role === 'obc' && user?.registrationStatus === 'pending') {
    return (
       <div className={cn("h-full border-r bg-background", !isMobile && "hidden md:block")}>
        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Logo className="h-6 w-6 text-primary" />
                    <span className="">AlphaClub</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto">
                 {/* No nav items for pending users */}
            </div>
            <div className="mt-auto border-t p-4">
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Log Out
                </Button>
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full border-r bg-background", !isMobile && "hidden md:block")}>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo className="h-6 w-6 text-primary" />
            <span className="">AlphaClub</span>
          </Link>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))) && "bg-muted text-primary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
